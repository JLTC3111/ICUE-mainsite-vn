-- Account drafts and gallery edits share one transaction. RPCs keep RLS enabled.
alter table public.articles add column if not exists last_save_id uuid;
alter table public.articles add column if not exists cover_storage_path text;
alter table public.articles add column if not exists cover_alt_storage_path text;

-- Public bylines must never be inferred from private account email addresses.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, display_name, avatar_url)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Author'),
    new.raw_user_meta_data->>'avatar_url') on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Repair only the historical fallback, preserving explicitly supplied names.
update public.profiles p set full_name = null
from auth.users u where p.id = u.id and p.full_name = u.email
  and nullif(u.raw_user_meta_data->>'full_name', '') is null;
update public.profiles p set display_name = 'Author'
from auth.users u where p.id = u.id and p.display_name = split_part(u.email, '@', 1)
  and nullif(u.raw_user_meta_data->>'display_name', '') is null;

-- A tombstone survives failed/lost cleanup responses, and prevents a later save
-- from reattaching an object that a cleanup worker may already be deleting.
create table if not exists public.article_storage_cleanup (
  path text primary key,
  source_url text not null,
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists article_storage_cleanup_pending_idx
  on public.article_storage_cleanup (created_at) where processed_at is null;
create index if not exists article_storage_cleanup_owner_pending_idx
  on public.article_storage_cleanup (owner_id, created_at) where processed_at is null;
alter table public.article_storage_cleanup enable row level security;
revoke all on public.article_storage_cleanup from public, anon, authenticated;
grant select on public.article_storage_cleanup to authenticated;
grant all on public.article_storage_cleanup to service_role;
drop policy if exists article_storage_cleanup_select on public.article_storage_cleanup;
create policy article_storage_cleanup_select on public.article_storage_cleanup
  for select to authenticated using (owner_id = (select auth.uid()) or (select public.is_admin()));

create or replace function public.article_storage_path_from_url(p_url text)
returns text language sql immutable set search_path = '' as $$
  select substring(p_url from '^https://[^/]+/storage/v1/object/public/article-media/([a-f0-9-]{36}/[^?#]+)$');
$$;
revoke execute on function public.article_storage_path_from_url(text) from public, anon;
grant execute on function public.article_storage_path_from_url(text) to authenticated, service_role;

create index if not exists article_media_storage_path_idx on public.article_media (storage_path);
create index if not exists articles_cover_storage_path_idx on public.articles (cover_storage_path);
create index if not exists articles_cover_alt_storage_path_idx on public.articles (cover_alt_storage_path);
create index if not exists articles_cover_url_path_idx on public.articles (public.article_storage_path_from_url(cover_image_url));
create index if not exists articles_cover_alt_url_path_idx on public.articles (public.article_storage_path_from_url(cover_image_alt_url));

create or replace function public.article_storage_path_referenced(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.article_media where storage_path = p_path)
    or exists (select 1 from public.articles where cover_storage_path = p_path
      or cover_alt_storage_path = p_path
      or public.article_storage_path_from_url(cover_image_url) = p_path
      or public.article_storage_path_from_url(cover_image_alt_url) = p_path);
$$;
revoke execute on function public.article_storage_path_referenced(text) from public, anon, authenticated;

create or replace function public.queue_article_storage_cleanup(p_path text, p_url text, p_author uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_owner uuid;
begin
  if p_author is null or p_path is null or p_url is null or p_path ~ '(^|/)\.\.(/|$)' then return; end if;
  begin v_owner := split_part(p_path, '/', 1)::uuid;
  exception when invalid_text_representation then return; end;
  -- Legacy metadata is untrusted. Never let an author enqueue another account's
  -- object for deletion by the service worker.
  if v_owner <> p_author and v_owner is distinct from auth.uid() and not public.is_admin() then return; end if;
  insert into public.article_storage_cleanup(path, source_url, owner_id)
    values (p_path, p_url, v_owner) on conflict (path) do nothing;
end $$;
revoke execute on function public.queue_article_storage_cleanup(text, text, uuid) from public, anon, authenticated;

create or replace function public.queue_removed_article_storage()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_author uuid;
begin
  if tg_table_name = 'article_media' then
    select author_id into v_author from public.articles where id = old.article_id;
    if tg_op = 'DELETE' or new.storage_path is distinct from old.storage_path then
      perform public.queue_article_storage_cleanup(old.storage_path, old.url, v_author);
    end if;
  else
    if tg_op = 'DELETE' or new.cover_image_url is distinct from old.cover_image_url then
      perform public.queue_article_storage_cleanup(coalesce(old.cover_storage_path,
        public.article_storage_path_from_url(old.cover_image_url)), old.cover_image_url, old.author_id);
    end if;
    if tg_op = 'DELETE' or new.cover_image_alt_url is distinct from old.cover_image_alt_url then
      perform public.queue_article_storage_cleanup(coalesce(old.cover_alt_storage_path,
        public.article_storage_path_from_url(old.cover_image_alt_url)), old.cover_image_alt_url, old.author_id);
    end if;
    -- BEFORE DELETE still has the parent row, unlike cascading child deletes.
    if tg_op = 'DELETE' then
      perform public.queue_article_storage_cleanup(m.storage_path, m.url, old.author_id)
        from public.article_media m where m.article_id = old.id;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke execute on function public.queue_removed_article_storage() from public, anon, authenticated;
drop trigger if exists trg_article_storage_cleanup on public.articles;
create trigger trg_article_storage_cleanup before update or delete on public.articles
  for each row execute function public.queue_removed_article_storage();
drop trigger if exists trg_media_storage_cleanup on public.article_media;
create trigger trg_media_storage_cleanup before update or delete on public.article_media
  for each row execute function public.queue_removed_article_storage();

create or replace function public.pending_article_storage_cleanup()
returns table(path text, source_url text) language sql security definer set search_path = '' as $$
  select q.path, q.source_url from public.article_storage_cleanup q
  where q.processed_at is null
    and (auth.role() = 'service_role' or (auth.uid() is not null
      and (q.owner_id = auth.uid() or public.is_admin())))
    and not public.article_storage_path_referenced(q.path)
  order by q.created_at limit 100;
$$;
create or replace function public.finish_article_storage_cleanup(p_paths text[])
returns void language sql security definer set search_path = '' as $$
  update public.article_storage_cleanup q set processed_at = now()
  where q.path = any(p_paths) and q.processed_at is null
    and (auth.role() = 'service_role' or (auth.uid() is not null
      and (q.owner_id = auth.uid() or public.is_admin())))
    and not public.article_storage_path_referenced(q.path);
$$;
revoke execute on function public.pending_article_storage_cleanup(), public.finish_article_storage_cleanup(text[])
  from public, anon, authenticated;
grant execute on function public.pending_article_storage_cleanup(), public.finish_article_storage_cleanup(text[])
  to authenticated, service_role;

-- Serialize caps against the parent, including direct Data API writes/updates.
create or replace function public.enforce_media_limits()
returns trigger language plpgsql set search_path = '' as $$
declare v_count integer;
begin
  perform 1 from public.articles where id = new.article_id for update;
  new.storage_path := coalesce(new.storage_path, public.article_storage_path_from_url(new.url));
  if auth.uid() is not null and new.storage_path is not null
    and (tg_op = 'INSERT' or new.storage_path is distinct from old.storage_path) then
    if (split_part(new.storage_path, '/', 1) <> auth.uid()::text and not public.is_admin())
      or new.storage_path ~ '(^|/)\.\.(/|$)'
      or exists (select 1 from public.article_storage_cleanup where path = new.storage_path) then
      raise insufficient_privilege using message = 'Invalid or retired media reference';
    end if;
  end if;
  select count(*) into v_count from public.article_media
    where article_id = new.article_id and kind = new.kind and id <> new.id;
  if (new.kind = 'image' and v_count >= 10) or (new.kind = 'video' and v_count >= 2) then
    raise exception 'Maximum of 10 images and 2 videos per article';
  end if;
  return new;
end $$;
drop trigger if exists trg_enforce_media_limits on public.article_media;
create trigger trg_enforce_media_limits before insert or update on public.article_media
  for each row execute function public.enforce_media_limits();

create or replace function public.validate_article_cover_paths()
returns trigger language plpgsql set search_path = '' as $$
declare v_path text;
begin
  if auth.uid() is null then return new; end if;
  new.cover_storage_path := coalesce(new.cover_storage_path, public.article_storage_path_from_url(new.cover_image_url));
  new.cover_alt_storage_path := coalesce(new.cover_alt_storage_path, public.article_storage_path_from_url(new.cover_image_alt_url));
  foreach v_path in array array[new.cover_storage_path, new.cover_alt_storage_path] loop
    if v_path is not null and (tg_op = 'INSERT' or (v_path is distinct from old.cover_storage_path
      and v_path is distinct from old.cover_alt_storage_path
      and v_path is distinct from public.article_storage_path_from_url(old.cover_image_url)
      and v_path is distinct from public.article_storage_path_from_url(old.cover_image_alt_url))) then
      if (split_part(v_path, '/', 1) <> auth.uid()::text and not public.is_admin())
        or v_path ~ '(^|/)\.\.(/|$)'
        or exists (select 1 from public.article_storage_cleanup where path = v_path) then
        raise insufficient_privilege using message = 'Invalid or retired cover reference';
      end if;
    end if;
  end loop;
  return new;
end $$;
revoke execute on function public.validate_article_cover_paths() from public, anon, authenticated;
drop trigger if exists trg_validate_article_cover_paths on public.articles;
create trigger trg_validate_article_cover_paths before insert or update on public.articles
  for each row execute function public.validate_article_cover_paths();

create or replace function public.save_article(
  p_id uuid, p_save_id uuid, p_payload jsonb, p_media jsonb,
  p_expected_updated_at timestamptz default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_article public.articles%rowtype;
  v_row jsonb;
  v_status public.article_status;
  v_path text;
  v_cover_path text;
  v_alt_path text;
begin
  if auth.uid() is null then raise insufficient_privilege using message = 'Sign in to save an article'; end if;
  select * into v_article from public.articles where id = p_id for update;
  if not found or (v_article.author_id <> auth.uid() and not public.is_admin()) then
    raise insufficient_privilege using message = 'Article not found or not editable';
  end if;
  if p_save_id is null then raise exception 'Save identity required'; end if;
  -- A response can be lost after commit. The same explicit retry is a no-op.
  if v_article.last_save_id = p_save_id then
    return jsonb_build_object('id', p_id, 'slug', v_article.slug, 'updated_at', v_article.updated_at);
  end if;
  if p_expected_updated_at is not null and v_article.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'This article changed in another editor. Reload before saving.';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or jsonb_typeof(p_media) is distinct from 'array' then
    raise exception 'Invalid article payload';
  end if;
  v_status := coalesce((p_payload->>'status')::public.article_status, v_article.status);
  if v_article.status = 'published' and v_status = 'draft' then
    raise exception 'A published article cannot be replaced by a draft';
  end if;
  if v_status = 'published' and (length(btrim(coalesce(p_payload->>'title', ''))) = 0
    or length(btrim(regexp_replace(coalesce(p_payload->>'content_html', ''), '<[^>]*>', '', 'g'))) = 0) then
    raise exception 'A title and article body are required to publish';
  end if;
  if jsonb_array_length(p_media) > 12
    or (select count(*) from jsonb_array_elements(p_media) m where m->>'kind' = 'image') > 10
    or (select count(*) from jsonb_array_elements(p_media) m where m->>'kind' = 'video') > 2
    or (select count(distinct m->>'id') from jsonb_array_elements(p_media) m) <> jsonb_array_length(p_media) then
    raise exception 'Invalid gallery or media limit exceeded';
  end if;
  -- New file references must belong to this account (admins may manage others).
  -- Retained references may have been uploaded by an admin editing the article.
  for v_row in select value from jsonb_array_elements(p_media) loop
    v_path := nullif(v_row->>'storage_path', '');
    if v_path is not null and not exists (select 1 from public.article_media
      where article_id = p_id and id = (v_row->>'id')::uuid and storage_path = v_path) then
      if (split_part(v_path, '/', 1) <> auth.uid()::text and not public.is_admin())
        or v_path ~ '(^|/)\.\.(/|$)'
        or not exists (select 1 from storage.objects where bucket_id = 'article-media' and name = v_path)
        or exists (select 1 from public.article_storage_cleanup where path = v_path) then
        raise insufficient_privilege using message = 'Invalid or retired media reference';
      end if;
    end if;
  end loop;
  v_cover_path := nullif(p_payload->>'cover_storage_path', '');
  v_alt_path := nullif(p_payload->>'cover_alt_storage_path', '');
  foreach v_path in array array[v_cover_path, v_alt_path] loop
    if v_path is not null and v_path is distinct from v_article.cover_storage_path
      and v_path is distinct from v_article.cover_alt_storage_path
      and v_path is distinct from public.article_storage_path_from_url(v_article.cover_image_url)
      and v_path is distinct from public.article_storage_path_from_url(v_article.cover_image_alt_url) then
      if (split_part(v_path, '/', 1) <> auth.uid()::text and not public.is_admin())
        or v_path ~ '(^|/)\.\.(/|$)'
        or not exists (select 1 from storage.objects where bucket_id = 'article-media' and name = v_path)
        or exists (select 1 from public.article_storage_cleanup where path = v_path) then
        raise insufficient_privilege using message = 'Invalid or retired cover reference';
      end if;
    end if;
  end loop;

  delete from public.article_media where article_id = p_id
    and id not in (select (m->>'id')::uuid from jsonb_array_elements(p_media) m);
  for v_row in select value from jsonb_array_elements(p_media) loop
    if exists (select 1 from public.article_media where article_id = p_id and id = (v_row->>'id')::uuid) then
      update public.article_media set kind = (v_row->>'kind')::public.media_kind,
        url = v_row->>'url', storage_path = nullif(v_row->>'storage_path', ''),
        poster_url = nullif(v_row->>'poster_url', ''), info = nullif(v_row->>'info', ''),
        position = (v_row->>'position')::integer
      where article_id = p_id and id = (v_row->>'id')::uuid;
    else
      insert into public.article_media(id, article_id, kind, url, storage_path, poster_url, info, position)
      values ((v_row->>'id')::uuid, p_id, (v_row->>'kind')::public.media_kind, v_row->>'url',
        nullif(v_row->>'storage_path', ''), nullif(v_row->>'poster_url', ''), nullif(v_row->>'info', ''),
        (v_row->>'position')::integer);
    end if;
  end loop;
  update public.articles set
    title = coalesce(p_payload->>'title', ''), subtitle = nullif(p_payload->>'subtitle', ''),
    author_name = nullif(p_payload->>'author_name', ''), content_html = coalesce(p_payload->>'content_html', ''),
    content_json = nullif(p_payload->'content_json', 'null'::jsonb),
    cover_image_url = nullif(p_payload->>'cover_image_url', ''),
    cover_image_alt_url = nullif(p_payload->>'cover_image_alt_url', ''),
    cover_storage_path = v_cover_path, cover_alt_storage_path = v_alt_path,
    cover_info = nullif(p_payload->>'cover_info', ''),
    cover_comparison = nullif(p_payload->'cover_comparison', 'null'::jsonb),
    language = coalesce(nullif(p_payload->>'language', ''), 'vi'),
    category = coalesce(nullif(p_payload->>'category', ''), 'general'),
    article_date = nullif(p_payload->>'article_date', '')::date,
    article_time = nullif(p_payload->>'article_time', '')::time,
    read_minutes = greatest(1, coalesce((p_payload->>'read_minutes')::integer, 1)),
    sources = coalesce(p_payload->'sources', '[]'::jsonb), status = v_status,
    published_at = case when v_status = 'published' then coalesce(v_article.published_at, now()) else v_article.published_at end,
    last_save_id = p_save_id
  where id = p_id returning * into v_article;
  return jsonb_build_object('id', p_id, 'slug', v_article.slug, 'updated_at', v_article.updated_at);
end $$;
revoke execute on function public.save_article(uuid, uuid, jsonb, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.save_article(uuid, uuid, jsonb, jsonb, timestamptz) to authenticated;

-- Public download URLs remain compatible. Anonymous bucket listings must not
-- reveal filenames of unpublished or unattached account uploads.
drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars' or (bucket_id = 'article-media' and (
    split_part(name, '/', 1) = (select auth.uid())::text
    or (select public.is_admin())
    or exists (select 1 from public.article_media m join public.articles a on a.id = m.article_id
      where m.storage_path = storage.objects.name and a.status = 'published')
    or exists (select 1 from public.articles a where a.status = 'published' and (
      a.cover_storage_path = storage.objects.name or a.cover_alt_storage_path = storage.objects.name
      or public.article_storage_path_from_url(a.cover_image_url) = storage.objects.name
      or public.article_storage_path_from_url(a.cover_image_alt_url) = storage.objects.name))
  )));
-- This URL parser contains no data and is used by the anonymous storage policy.
grant execute on function public.article_storage_path_from_url(text) to anon;

-- Pin existing newsroom helper paths without changing their behavior.
do $$ declare helper record; begin
  for helper in select proname, pg_get_function_identity_arguments(oid) as arguments
    from pg_proc where pronamespace = 'public'::regnamespace and proname in (
      'client_ip', 'client_ip_hash', 'touch_updated_at', 'touch_articles_updated_at',
      'newsroom_view_milestones', 'newsroom_reaction_milestones', 'newsroom_crossed_milestone'
    ) loop
    execute format('alter function public.%I(%s) set search_path = public, pg_temp', helper.proname, helper.arguments);
  end loop;
end $$;

-- Anonymous feedback must obey the same published-only visibility as comments.
create or replace function public.get_hearts(p_article uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_ip    text := public.client_ip_hash();
  v_count int;
  v_liked boolean;
begin
  if not exists (select 1 from public.articles where id = p_article and status = 'published') then
    raise exception 'article not found';
  end if;
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
  if not exists (select 1 from public.articles where id = p_article and status = 'published') then
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
  if not exists (select 1 from public.articles where id = p_article and status = 'published') then
    raise exception 'article not found';
  end if;
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
  if not exists (select 1 from public.articles where id = p_article and status = 'published') then
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

revoke execute on function public.get_hearts(uuid), public.toggle_heart(uuid), public.get_claps(uuid), public.toggle_clap(uuid) from public, anon, authenticated;
grant execute on function public.get_hearts(uuid), public.toggle_heart(uuid), public.get_claps(uuid), public.toggle_clap(uuid) to anon, authenticated;
