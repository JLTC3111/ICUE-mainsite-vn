-- Public registration creates customers; staff roles remain explicitly assigned.
begin;
alter type public.user_role add value if not exists 'customer';
commit;
