-- Optional given name and family name. full_name stays independently editable
-- until both parts are present, and existing combined names are not split.
begin;
alter table public.profiles
  add column first_name text,
  add column last_name text,
  add constraint profiles_first_name_length check (first_name is null or char_length(first_name) <= 100),
  add constraint profiles_last_name_length check (last_name is null or char_length(last_name) <= 100);

create function public.sync_profile_full_name() returns trigger
language plpgsql security invoker set search_path='' as $$
declare given text:=nullif(trim(new.first_name),''); family text:=nullif(trim(new.last_name),'');
begin
 new.first_name:=given; new.last_name:=family;
 if given is not null and family is not null then new.full_name:=given||' '||family; end if;
 return new;
end $$;
revoke all on function public.sync_profile_full_name() from public,anon,authenticated;
create trigger profiles_sync_full_name before insert or update on public.profiles
 for each row execute function public.sync_profile_full_name();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name,first_name,last_name,display_name,avatar_url,role)
 values(new.id,left(nullif(new.raw_user_meta_data->>'full_name',''),100),
  left(nullif(new.raw_user_meta_data->>'first_name',''),100),
  left(nullif(new.raw_user_meta_data->>'last_name',''),100),
  coalesce(left(nullif(new.raw_user_meta_data->>'display_name',''),100),'Customer'),
  null,'customer') on conflict(id) do nothing;
 return new;
end $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;

grant insert (first_name, last_name) on table public.profiles to authenticated;
grant update (first_name, last_name) on table public.profiles to authenticated;
commit;
