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
  cover_image_alt_url text,
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
  sources       jsonb not null default '[]'::jsonb,
  media_comparison jsonb,
  cover_comparison jsonb,
  created_at    timestamptz not null default now(),
  -- Last content edit (view_count-only updates do not bump this; see touch_articles_updated_at).
  updated_at    timestamptz not null default now()
);

create index if not exists articles_status_published_idx
  on public.articles (status, published_at desc);
create index if not exists articles_author_idx on public.articles (author_id);

-- Migration for databases created before author_name existed.
alter table public.articles add column if not exists author_name text;

-- Editorial category (slug). See news-app/src/lib/categories.js for the set.
alter table public.articles add column if not exists category text not null default 'general';
create index if not exists articles_category_idx on public.articles (category);

-- Denormalized pageview counter (incremented on each article detail load).
alter table public.articles add column if not exists view_count int not null default 0;

alter table public.articles add column if not exists sources jsonb not null default '[]'::jsonb;

alter table public.articles add column if not exists media_comparison jsonb;
alter table public.articles add column if not exists cover_comparison jsonb;

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

-- Articles: view_count increments must not rewrite updated_at (that field is
-- "last edited"). Any other column change still stamps updated_at = now().
create or replace function public.touch_articles_updated_at()
returns trigger language plpgsql as $$
begin
  if (to_jsonb(NEW) - 'view_count' - 'updated_at')
     = (to_jsonb(OLD) - 'view_count' - 'updated_at') then
    NEW.updated_at = OLD.updated_at;
    return NEW;
  end if;
  NEW.updated_at = now();
  return NEW;
end $$;

drop trigger if exists trg_articles_touch on public.articles;
create trigger trg_articles_touch before update on public.articles
  for each row execute function public.touch_articles_updated_at();

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

-- ============================================================================
-- Visitor engagement: IP-based hearts (likes), claps + comments — no login required.
-- Visitors are identified by a hash of their request IP (read server-side from
-- PostgREST request headers), so writes happen exclusively through SECURITY
-- DEFINER RPCs below. The raw IP is never stored — only an md5 hash.
-- Hearts and claps are independent — a visitor may leave both on one article.
-- ============================================================================

-- One heart per IP per article (toggleable).
create table if not exists public.article_reactions (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.articles (id) on delete cascade,
  ip_hash     text not null,
  created_at  timestamptz not null default now(),
  unique (article_id, ip_hash)
);
create index if not exists article_reactions_article_idx
  on public.article_reactions (article_id);

-- One clap per IP per article (toggleable), independent of hearts.
create table if not exists public.article_claps (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.articles (id) on delete cascade,
  ip_hash     text not null,
  created_at  timestamptz not null default now(),
  unique (article_id, ip_hash)
);
create index if not exists article_claps_article_idx
  on public.article_claps (article_id);

-- Comments left by visitors (multiple allowed per IP).
create table if not exists public.article_comments (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.articles (id) on delete cascade,
  ip_hash     text not null,
  author_name text,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists article_comments_article_idx
  on public.article_comments (article_id, created_at desc);

-- Resolve the caller's client IP from PostgREST-forwarded request headers.
create or replace function public.client_ip()
returns text language sql stable as $$
  select coalesce(
    nullif(split_part(
      current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), ''),
    current_setting('request.headers', true)::json ->> 'x-real-ip',
    'unknown'
  );
$$;

-- Privacy-preserving stable identifier for a visitor (never store the raw IP).
create or replace function public.client_ip_hash()
returns text language sql stable as $$
  select md5(public.client_ip());
$$;

-- Current heart count + whether this visitor has already hearted.
create or replace function public.get_hearts(p_article uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_ip    text := public.client_ip_hash();
  v_count int;
  v_liked boolean;
begin
  select count(*) into v_count from public.article_reactions where article_id = p_article;
  select exists (
    select 1 from public.article_reactions where article_id = p_article and ip_hash = v_ip
  ) into v_liked;
  return json_build_object('liked', v_liked, 'count', v_count);
end $$;

-- Toggle this visitor's heart on/off; returns the new state + count.
create or replace function public.toggle_heart(p_article uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_ip    text := public.client_ip_hash();
  v_liked boolean;
  v_count int;
begin
  if not exists (select 1 from public.articles where id = p_article) then
    raise exception 'article not found';
  end if;

  if exists (
    select 1 from public.article_reactions where article_id = p_article and ip_hash = v_ip
  ) then
    delete from public.article_reactions where article_id = p_article and ip_hash = v_ip;
    v_liked := false;
  else
    insert into public.article_reactions (article_id, ip_hash)
      values (p_article, v_ip) on conflict do nothing;
    v_liked := true;
  end if;

  select count(*) into v_count from public.article_reactions where article_id = p_article;
  return json_build_object('liked', v_liked, 'count', v_count);
end $$;

-- Current clap count + whether this visitor has already clapped.
create or replace function public.get_claps(p_article uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_ip      text := public.client_ip_hash();
  v_count   int;
  v_clapped boolean;
begin
  select count(*) into v_count from public.article_claps where article_id = p_article;
  select exists (
    select 1 from public.article_claps where article_id = p_article and ip_hash = v_ip
  ) into v_clapped;
  return json_build_object('clapped', v_clapped, 'count', v_count);
end $$;

-- Toggle this visitor's clap on/off; returns the new state + count.
create or replace function public.toggle_clap(p_article uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_ip      text := public.client_ip_hash();
  v_clapped boolean;
  v_count   int;
begin
  if not exists (select 1 from public.articles where id = p_article) then
    raise exception 'article not found';
  end if;

  if exists (
    select 1 from public.article_claps where article_id = p_article and ip_hash = v_ip
  ) then
    delete from public.article_claps where article_id = p_article and ip_hash = v_ip;
    v_clapped := false;
  else
    insert into public.article_claps (article_id, ip_hash)
      values (p_article, v_ip) on conflict do nothing;
    v_clapped := true;
  end if;

  select count(*) into v_count from public.article_claps where article_id = p_article;
  return json_build_object('clapped', v_clapped, 'count', v_count);
end $$;

-- Add a comment as the current visitor (identified by IP hash).
create or replace function public.add_comment(p_article uuid, p_body text, p_name text default null)
returns public.article_comments language plpgsql security definer set search_path = public as $$
declare
  v_row public.article_comments;
begin
  if p_body is null or char_length(trim(p_body)) = 0 then
    raise exception 'comment body required';
  end if;
  if not exists (select 1 from public.articles where id = p_article and status = 'published') then
    raise exception 'article not available for comments';
  end if;

  insert into public.article_comments (article_id, ip_hash, author_name, body)
  values (p_article, public.client_ip_hash(), nullif(trim(p_name), ''), trim(p_body))
  returning * into v_row;
  return v_row;
end $$;

-- Increment the view counter for a published article (every page load counts).
create or replace function public.record_article_view(p_article uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update public.articles
    set view_count = view_count + 1
    where id = p_article and status = 'published'
    returning view_count into v_count;

  if v_count is null then
    raise exception 'article not available';
  end if;

  return json_build_object('count', v_count);
end $$;

-- RLS: writes only via the SECURITY DEFINER RPCs above. Comments are publicly
-- readable for published articles; reactions/claps are only read via RPCs.
alter table public.article_reactions enable row level security;
alter table public.article_claps     enable row level security;
alter table public.article_comments  enable row level security;

drop policy if exists comments_select_public on public.article_comments;
create policy comments_select_public on public.article_comments for select
  using (exists (
    select 1 from public.articles a
    where a.id = article_id and a.status = 'published'
  ));

-- Expose the RPCs to anonymous + authenticated visitors.
grant execute on function public.get_hearts(uuid)            to anon, authenticated;
grant execute on function public.toggle_heart(uuid)          to anon, authenticated;
grant execute on function public.get_claps(uuid)             to anon, authenticated;
grant execute on function public.toggle_clap(uuid)           to anon, authenticated;
grant execute on function public.add_comment(uuid, text, text) to anon, authenticated;
grant execute on function public.record_article_view(uuid)   to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Cached machine translations (Google Cloud + DeepL via /api/translate-article)
-- ----------------------------------------------------------------------------
create table if not exists public.article_translations (
  article_id    uuid not null references public.articles (id) on delete cascade,
  locale        text not null,
  provider      text not null check (provider in ('google', 'deepl')),
  source_lang   text,
  title         text not null default '',
  subtitle      text,
  content_html  text not null default '',
  sources       jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (article_id, locale)
);

create index if not exists article_translations_locale_idx
  on public.article_translations (locale);

drop trigger if exists trg_article_translations_touch on public.article_translations;
create trigger trg_article_translations_touch
  before update on public.article_translations
  for each row execute function public.touch_updated_at();

alter table public.article_translations enable row level security;

drop policy if exists article_translations_select on public.article_translations;
create policy article_translations_select on public.article_translations
  for select using (
    exists (
      select 1 from public.articles a
      where a.id = article_id and a.status = 'published'
    )
  );

create table if not exists public.comment_translations (
  comment_id   uuid not null references public.article_comments (id) on delete cascade,
  locale       text not null,
  provider     text not null check (provider in ('google', 'deepl')),
  source_lang  text,
  body         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (comment_id, locale)
);

create index if not exists comment_translations_locale_idx
  on public.comment_translations (locale);

drop trigger if exists trg_comment_translations_touch on public.comment_translations;
create trigger trg_comment_translations_touch
  before update on public.comment_translations
  for each row execute function public.touch_updated_at();

alter table public.comment_translations enable row level security;

drop policy if exists comment_translations_select on public.comment_translations;
create policy comment_translations_select on public.comment_translations
  for select using (
    exists (
      select 1
      from public.article_comments c
      join public.articles a on a.id = c.article_id
      where c.id = comment_id and a.status = 'published'
    )
  );

-- =============================================================================
-- After running: in Authentication -> Providers/Settings disable "Enable signups"
-- to keep the platform invite-only. Create the first admin via the dashboard,
-- then promote: update public.profiles set role='admin' where id='<uuid>';
-- =============================================================================
