-- =============================================================================
-- In-site bell notifications for admins + authors (newsroom app).
--
-- Every object here is namespaced `newsroom_*`. This project already has
-- unrelated `notifications` / `hr_notifications` tables, and an unprefixed
-- `create table if not exists public.notifications` silently skips them, after
-- which every statement below fails with 42703 (column "recipient_id" does not
-- exist). Nothing in this file touches those tables or the existing
-- `notification_type` enum.
--
-- Events are emitted by database triggers rather than client code, so they fire
-- no matter which path performed the write (dashboard, article page, RPC).
--
--   article_published  — first transition into 'published' (edits never notify)
--   article_deleted    — the article row was removed
--   views_milestone    — view_count crossed a threshold (see newsroom_view_milestones)
--   hearts_milestone   — hearts crossed a threshold (see newsroom_reaction_milestones)
--   claps_milestone    — claps crossed a threshold
--
-- Recipients are the article's author plus every admin. The actor who caused the
-- event never notifies themselves. One row per recipient per event, deduped by
-- dedupe_key so a milestone can only ever land once.
-- =============================================================================

do $$ begin
  create type public.newsroom_notification_type as enum (
    'article_published',
    'article_deleted',
    'views_milestone',
    'hearts_milestone',
    'claps_milestone'
  );
exception when duplicate_object then null; end $$;

-- article_id is intentionally NOT a foreign key: an 'article_deleted' notice has
-- to outlive the article it refers to. Title/slug are snapshotted for the same
-- reason — the notification stays readable after the row is gone.
create table if not exists public.newsroom_notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  type          public.newsroom_notification_type not null,
  article_id    uuid,
  article_slug  text,
  article_title text,
  actor_id      uuid references public.profiles (id) on delete set null,
  actor_name    text,
  threshold     int,
  dedupe_key    text not null,
  read_at       timestamptz,
  created_at    timestamptz not null default now(),
  unique (recipient_id, dedupe_key)
);

-- Turn the confusing 42703 above into an actionable message if the name is ever
-- taken by something else.
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'newsroom_notifications'
      and column_name = 'recipient_id'
  ) then
    raise exception
      'public.newsroom_notifications already exists and is not the newsroom table (no recipient_id column). Rename or drop that table, then re-run this migration.';
  end if;
end $$;

create index if not exists newsroom_notifications_recipient_idx
  on public.newsroom_notifications (recipient_id, created_at desc);
create index if not exists newsroom_notifications_unread_idx
  on public.newsroom_notifications (recipient_id) where read_at is null;
create index if not exists newsroom_notifications_article_idx
  on public.newsroom_notifications (article_id);

-- ----------------------------------------------------------------------------
-- Thresholds — tune these two functions to change what counts as "significant".
-- ----------------------------------------------------------------------------
create or replace function public.newsroom_view_milestones()
returns int[] language sql immutable as $$
  select array[100, 500, 1000, 5000, 10000, 50000, 100000];
$$;

create or replace function public.newsroom_reaction_milestones()
returns int[] language sql immutable as $$
  select array[1, 5, 10, 25, 50, 100, 250, 500, 1000];
$$;

-- Highest threshold strictly above p_old and at or below p_new, else null.
-- Using the highest keeps a single notification when a count jumps several tiers.
create or replace function public.newsroom_crossed_milestone(
  p_old int,
  p_new int,
  p_thresholds int[]
)
returns int language sql immutable as $$
  select max(t)
  from unnest(p_thresholds) as t
  where t > coalesce(p_old, 0) and t <= coalesce(p_new, 0);
$$;

-- ----------------------------------------------------------------------------
-- Fan-out helper. SECURITY DEFINER so triggers can write past RLS (clients may
-- only ever read their own rows).
-- ----------------------------------------------------------------------------
create or replace function public.emit_newsroom_notification(
  p_article_id uuid,
  p_slug       text,
  p_title      text,
  p_author_id  uuid,
  p_type       public.newsroom_notification_type,
  p_threshold  int default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_actor      uuid := auth.uid();
  v_actor_name text;
  v_dedupe     text;
begin
  v_dedupe := p_type::text || ':' || coalesce(p_article_id::text, 'unknown')
    || case when p_threshold is null then '' else ':' || p_threshold::text end;

  if v_actor is not null then
    select coalesce(display_name, full_name) into v_actor_name
      from public.profiles where id = v_actor;
  end if;

  insert into public.newsroom_notifications (
    recipient_id, type, article_id, article_slug, article_title,
    actor_id, actor_name, threshold, dedupe_key
  )
  select
    r.id, p_type, p_article_id, p_slug, p_title,
    v_actor, v_actor_name, p_threshold, v_dedupe
  from (
    -- Selected through profiles rather than taken at face value: deleting a
    -- user cascades profiles -> articles -> the delete trigger below, and the
    -- author row is already gone by then. Skipping it keeps the FK satisfied.
    select id from public.profiles where id = p_author_id
    union
    select id from public.profiles where role = 'admin'
  ) r
  -- Never notify whoever triggered the event (visitor-driven events have no actor).
  where v_actor is null or r.id <> v_actor
  on conflict (recipient_id, dedupe_key) do nothing;
end $$;

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

-- Publish: only the transition into 'published'. Re-saving a published article
-- (an edit) leaves status untouched and therefore notifies nobody.
create or replace function public.newsroom_notify_article_published()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'published' then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' then
    return null;
  end if;

  perform public.emit_newsroom_notification(
    new.id, new.slug, new.title, new.author_id, 'article_published'
  );
  return null;
end $$;

drop trigger if exists trg_newsroom_notify_published on public.articles;
create trigger trg_newsroom_notify_published
  after insert or update of status on public.articles
  for each row execute function public.newsroom_notify_article_published();

-- Delete: drop the article's now-dangling notifications, then post the notice.
create or replace function public.newsroom_notify_article_deleted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.newsroom_notifications where article_id = old.id;

  perform public.emit_newsroom_notification(
    old.id, old.slug, old.title, old.author_id, 'article_deleted'
  );
  return null;
end $$;

drop trigger if exists trg_newsroom_notify_deleted on public.articles;
create trigger trg_newsroom_notify_deleted
  after delete on public.articles
  for each row execute function public.newsroom_notify_article_deleted();

-- Views: record_article_view() bumps view_count one at a time.
create or replace function public.newsroom_notify_article_views()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_threshold int;
begin
  v_threshold := public.newsroom_crossed_milestone(
    old.view_count, new.view_count, public.newsroom_view_milestones()
  );
  if v_threshold is null then
    return null;
  end if;

  perform public.emit_newsroom_notification(
    new.id, new.slug, new.title, new.author_id, 'views_milestone', v_threshold
  );
  return null;
end $$;

drop trigger if exists trg_newsroom_notify_views on public.articles;
create trigger trg_newsroom_notify_views
  after update of view_count on public.articles
  for each row execute function public.newsroom_notify_article_views();

-- Hearts / claps: toggle_heart() and toggle_clap() insert one row per visitor,
-- so the new total is the previous count + 1.
create or replace function public.newsroom_notify_article_hearts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_count     int;
  v_threshold int;
  v_article   public.articles;
begin
  select count(*) into v_count
    from public.article_reactions where article_id = new.article_id;

  v_threshold := public.newsroom_crossed_milestone(
    v_count - 1, v_count, public.newsroom_reaction_milestones()
  );
  if v_threshold is null then
    return null;
  end if;

  select * into v_article from public.articles where id = new.article_id;
  if v_article.id is null then
    return null;
  end if;

  perform public.emit_newsroom_notification(
    v_article.id, v_article.slug, v_article.title, v_article.author_id,
    'hearts_milestone', v_threshold
  );
  return null;
end $$;

drop trigger if exists trg_newsroom_reactions_notify on public.article_reactions;
create trigger trg_newsroom_reactions_notify
  after insert on public.article_reactions
  for each row execute function public.newsroom_notify_article_hearts();

create or replace function public.newsroom_notify_article_claps()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_count     int;
  v_threshold int;
  v_article   public.articles;
begin
  select count(*) into v_count
    from public.article_claps where article_id = new.article_id;

  v_threshold := public.newsroom_crossed_milestone(
    v_count - 1, v_count, public.newsroom_reaction_milestones()
  );
  if v_threshold is null then
    return null;
  end if;

  select * into v_article from public.articles where id = new.article_id;
  if v_article.id is null then
    return null;
  end if;

  perform public.emit_newsroom_notification(
    v_article.id, v_article.slug, v_article.title, v_article.author_id,
    'claps_milestone', v_threshold
  );
  return null;
end $$;

drop trigger if exists trg_newsroom_claps_notify on public.article_claps;
create trigger trg_newsroom_claps_notify
  after insert on public.article_claps
  for each row execute function public.newsroom_notify_article_claps();

-- ----------------------------------------------------------------------------
-- RLS: recipients read their own rows. All writes go through the RPCs below so
-- read_at is the only field a client can ever change.
-- ----------------------------------------------------------------------------
alter table public.newsroom_notifications enable row level security;

drop policy if exists newsroom_notifications_select_own on public.newsroom_notifications;
create policy newsroom_notifications_select_own on public.newsroom_notifications for select
  using (recipient_id = auth.uid());

create or replace function public.mark_newsroom_notification_read(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.newsroom_notifications
    set read_at = coalesce(read_at, now())
    where id = p_id and recipient_id = auth.uid();
$$;

create or replace function public.mark_all_newsroom_notifications_read()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_updated int;
begin
  update public.newsroom_notifications
    set read_at = now()
    where recipient_id = auth.uid() and read_at is null;
  get diagnostics v_updated = row_count;
  return v_updated;
end $$;

create or replace function public.dismiss_newsroom_notification(p_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.newsroom_notifications
    where id = p_id and recipient_id = auth.uid();
$$;

grant execute on function public.mark_newsroom_notification_read(uuid)      to authenticated;
grant execute on function public.mark_all_newsroom_notifications_read()     to authenticated;
grant execute on function public.dismiss_newsroom_notification(uuid)        to authenticated;

-- Realtime: lets the bell update without polling. Harmless if the publication
-- already carries the table (or if Realtime is disabled on the project — the
-- client falls back to polling either way).
do $$ begin
  alter publication supabase_realtime add table public.newsroom_notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
