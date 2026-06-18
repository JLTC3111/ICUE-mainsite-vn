-- =============================================================================
-- ICUE News platform — Supabase schema
-- Run this in the Supabase SQL editor (or via the CLI) on a fresh project.
-- Invite-only: disable public signups in Auth settings; admins create users.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'author');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.article_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.media_kind as enum ('image', 'video');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- profiles: one row per auth user (display data + role)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  display_name text,
  bio         text,
  avatar_url  text,
  role        public.user_role not null default 'author',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- articles
-- ----------------------------------------------------------------------------
create table if not exists public.articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  subtitle      text,
  -- Rich text stored both as sanitized HTML (fast render) and TipTap JSON (re-edit)
  content_html  text not null default '',
  content_json  jsonb,
  cover_image_url text,
  -- author_id = the logged-in account that created/owns the row (used for RLS).
  author_id     uuid not null references public.profiles (id) on delete cascade,
  -- author_name = the display byline shown on the article; editable and
  -- intentionally independent of the logged-in account.
  author_name   text,
  status        public.article_status not null default 'draft',
  language      text not null default 'vi',
  -- Author-provided "Date" + "Time" fields from the upload form
  article_date  date,
  article_time  time,
  read_minutes  int default 1,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists articles_status_published_idx
  on public.articles (status, published_at desc);
create index if not exists articles_author_idx on public.articles (author_id);

-- Migration for databases created before author_name existed.
alter table public.articles add column if not exists author_name text;

-- ----------------------------------------------------------------------------
-- article_media: up to 10 images + 2 videos enforced at app + trigger level
-- ----------------------------------------------------------------------------
create table if not exists public.article_media (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.articles (id) on delete cascade,
  kind        public.media_kind not null,
  url         text not null,
  storage_path text,
  poster_url  text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists article_media_article_idx
  on public.article_media (article_id, position);

-- Enforce media caps (10 images, 2 videos) per article
create or replace function public.enforce_media_limits()
returns trigger language plpgsql as $$
declare
  img_count int;
  vid_count int;
begin
  select count(*) into img_count from public.article_media
    where article_id = new.article_id and kind = 'image';
  select count(*) into vid_count from public.article_media
    where article_id = new.article_id and kind = 'video';
  if new.kind = 'image' and img_count >= 10 then
    raise exception 'Maximum of 10 images per article';
  end if;
  if new.kind = 'video' and vid_count >= 2 then
    raise exception 'Maximum of 2 videos per article';
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_media_limits on public.article_media;
create trigger trg_enforce_media_limits
  before insert on public.article_media
  for each row execute function public.enforce_media_limits();

-- ----------------------------------------------------------------------------
-- updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_articles_touch on public.articles;
create trigger trg_articles_touch before update on public.articles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- Auto-create a profile when an auth user is created (invite-only -> author)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that were created before this trigger existed
-- (otherwise their articles.author_id foreign key would fail).
insert into public.profiles (id, full_name, display_name, avatar_url)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.email),
  coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.articles      enable row level security;
alter table public.article_media enable row level security;

-- profiles: readable by all (author bylines/avatars are public); writable by self/admin
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Allow a signed-in user to create their own profile row (self-heal path for
-- accounts that pre-date the handle_new_user trigger).
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert
  with check (id = auth.uid());

-- articles: published readable by everyone; drafts only by owner/admin
drop policy if exists articles_select_public on public.articles;
create policy articles_select_public on public.articles for select
  using (
    status = 'published'
    or author_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists articles_insert_author on public.articles;
create policy articles_insert_author on public.articles for insert
  with check (author_id = auth.uid());

drop policy if exists articles_update_owner on public.articles;
create policy articles_update_owner on public.articles for update
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists articles_delete_owner on public.articles;
create policy articles_delete_owner on public.articles for delete
  using (author_id = auth.uid() or public.is_admin());

-- article_media: visible if parent article is visible; writable by article owner/admin
drop policy if exists media_select on public.article_media;
create policy media_select on public.article_media for select
  using (exists (
    select 1 from public.articles a
    where a.id = article_id
      and (a.status = 'published' or a.author_id = auth.uid() or public.is_admin())
  ));

drop policy if exists media_write on public.article_media;
create policy media_write on public.article_media for all
  using (exists (
    select 1 from public.articles a
    where a.id = article_id and (a.author_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.articles a
    where a.id = article_id and (a.author_id = auth.uid() or public.is_admin())
  ));

-- ----------------------------------------------------------------------------
-- Storage buckets
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('article-media', 'article-media', true)
  on conflict (id) do nothing;

-- Public read on both buckets
drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read on storage.objects for select
  using (bucket_id in ('avatars', 'article-media'));

-- Authenticated users may upload/update/delete within their own folder (user-id prefix)
drop policy if exists storage_auth_write on storage.objects;
create policy storage_auth_write on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'article-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists storage_auth_modify on storage.objects;
create policy storage_auth_modify on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'article-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists storage_auth_delete on storage.objects;
create policy storage_auth_delete on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'article-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- After running: in Authentication -> Providers/Settings disable "Enable signups"
-- to keep the platform invite-only. Create the first admin via the dashboard,
-- then promote: update public.profiles set role='admin' where id='<uuid>';
-- =============================================================================
