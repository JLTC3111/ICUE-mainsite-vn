begin;
create policy test_broad_profile_reads on public.profiles
 for select to anon,authenticated using(true);
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000009101','private-customer@example.invalid','{"display_name":"Private Customer"}'),
 ('00000000-0000-4000-8000-000000009102','other-customer@example.invalid','{"display_name":"Other Customer"}'),
 ('00000000-0000-4000-8000-000000009103','public-author@example.invalid','{"display_name":"Public Author"}'),
 ('00000000-0000-4000-8000-000000009104','administrator@example.invalid','{"display_name":"Administrator"}');
update public.profiles set role='author' where id='00000000-0000-4000-8000-000000009103';
update public.profiles set role='admin' where id='00000000-0000-4000-8000-000000009104';

set local role anon;
do $$ begin
 assert not exists(select 1 from public.profiles where role='customer'), 'Anonymous readers cannot enumerate customer accounts';
 assert (select display_name='Public Author' from public.profiles where id='00000000-0000-4000-8000-000000009103'), 'Public author bylines remain available';
 assert exists(select 1 from public.profiles where id='00000000-0000-4000-8000-000000009104'), 'Public staff bylines remain available';
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009101',true);
set local role authenticated;
do $$ begin
 assert (select display_name='Private Customer' from public.profiles where id=auth.uid()), 'A customer can load their own account profile';
 assert not exists(select 1 from public.profiles where id='00000000-0000-4000-8000-000000009102'), 'Customers cannot read one another';
 assert exists(select 1 from public.profiles where id='00000000-0000-4000-8000-000000009103'), 'Customers still see public author bylines';
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009103',true);
set local role authenticated;
do $$ begin
 assert not exists(select 1 from public.profiles where role='customer'), 'Authors cannot enumerate customers';
 assert exists(select 1 from public.profiles where id=auth.uid()), 'Authors can authorize Studio against their own database profile';
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009104',true);
set local role authenticated;
do $$ begin
 assert (select count(*) from public.profiles where id in ('00000000-0000-4000-8000-000000009101','00000000-0000-4000-8000-000000009102'))=2, 'Administrators retain customer support access';
end $$;
reset role;

set local role service_role;
do $$ begin
 assert exists(select 1 from public.profiles where id='00000000-0000-4000-8000-000000009101'), 'Privileged account maintenance retains access';
end $$;
reset role;
rollback;
