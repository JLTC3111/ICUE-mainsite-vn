-- Prevent profile owners from promoting themselves through the Data API.
-- RLS controls which rows may be changed; column grants control which fields.
revoke insert, update, delete on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant insert (id, full_name, display_name, bio, avatar_url)
  on table public.profiles to authenticated;
grant update (full_name, display_name, bio, avatar_url)
  on table public.profiles to authenticated;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to anon, authenticated
  using (true);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_admin())
  )
  with check (
    id = (select auth.uid())
    or (select public.is_admin())
  );

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and role = 'author'::public.user_role
  );

-- Trigger helpers are internal entry points. PostgreSQL grants function
-- execution to PUBLIC by default, so revoke it explicitly for every role that
-- can reach the Data API.
revoke execute on function public.emit_newsroom_notification(
  uuid, text, text, uuid, public.newsroom_notification_type, integer
) from public, anon, authenticated;

revoke execute on function public.newsroom_notify_article_published()
  from public, anon, authenticated;
revoke execute on function public.newsroom_notify_article_deleted()
  from public, anon, authenticated;
revoke execute on function public.newsroom_notify_article_views()
  from public, anon, authenticated;
revoke execute on function public.newsroom_notify_article_hearts()
  from public, anon, authenticated;
revoke execute on function public.newsroom_notify_article_claps()
  from public, anon, authenticated;

-- These three RPCs authenticate and scope writes with auth.uid(). Keep them
-- available to signed-in users only, rather than inheriting PUBLIC execute.
revoke execute on function public.mark_newsroom_notification_read(uuid)
  from public, anon, authenticated;
revoke execute on function public.mark_all_newsroom_notifications_read()
  from public, anon, authenticated;
revoke execute on function public.dismiss_newsroom_notification(uuid)
  from public, anon, authenticated;

grant execute on function public.mark_newsroom_notification_read(uuid)
  to authenticated;
grant execute on function public.mark_all_newsroom_notifications_read()
  to authenticated;
grant execute on function public.dismiss_newsroom_notification(uuid)
  to authenticated;
