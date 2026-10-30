begin;

-- Author/staff profiles supply public article bylines. Customer profiles are
-- account data: readable only by that customer and existing administrators.
-- A restrictive guard also closes any existing broad permissive read policy
-- in the shared project, while preserving its existing grants/read policies.
drop policy if exists customer_profile_privacy on public.profiles;
create policy customer_profile_privacy on public.profiles as restrictive
  for select to anon, authenticated
  using (
    role in ('author'::public.user_role, 'admin'::public.user_role)
    or id = (select auth.uid())
    or (select public.is_admin())
  );

notify pgrst, 'reload schema';
commit;
