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

insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000009106','named-parts@example.invalid','{"first_name":"Ada","last_name":"Lovelace","full_name":"Should Be Replaced","display_name":"Ada"}'),
 ('00000000-0000-4000-8000-000000009107','full-only@example.invalid','{"full_name":"Only Full"}');
do $$ begin
 assert (select first_name='Ada' and last_name='Lovelace' and full_name='Ada Lovelace' and display_name='Ada' and role='customer' from public.profiles where id='00000000-0000-4000-8000-000000009106'), 'Signup with both parts stores them and refreshes the full name';
 assert (select first_name is null and last_name is null and full_name='Only Full' from public.profiles where id='00000000-0000-4000-8000-000000009107'), 'Signup with only a full name leaves the parts empty';
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009103',true);
set local role authenticated;
do $$ begin
 update public.profiles set first_name=' Ada ', last_name=' Lovelace ', full_name='Ignored', bio='Note' where id=auth.uid();
 assert (select first_name='Ada' and last_name='Lovelace' and full_name='Ada Lovelace' and bio='Note' and display_name='Public Author' and role='author' from public.profiles where id=auth.uid()), 'Both parts refresh the full name without changing the display name or role';
 update public.profiles set bio='Still here' where id=auth.uid();
 assert (select full_name='Ada Lovelace' and first_name='Ada' and bio='Still here' from public.profiles where id=auth.uid()), 'Saving another field keeps the joined name';
 update public.profiles set first_name='Ada', last_name=null, full_name='Kept Name' where id=auth.uid();
 assert (select first_name='Ada' and last_name is null and full_name='Kept Name' from public.profiles where id=auth.uid()), 'One empty part leaves the submitted full name';
 update public.profiles set first_name=null, last_name=null, full_name='Only Full' where id=auth.uid();
 assert (select first_name is null and last_name is null and full_name='Only Full' from public.profiles where id=auth.uid()), 'A direct full name edit stays while both parts are empty';
 begin update public.profiles set first_name=repeat('a',101) where id=auth.uid(); assert false, 'A 101-character name must fail'; exception when check_violation then null; end;
 begin update public.profiles set role='admin' where id=auth.uid(); assert false, 'A profile edit must not change its role'; exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009101',true);
set local role authenticated;
do $$ begin
 update public.profiles set first_name='Nope' where id='00000000-0000-4000-8000-000000009103';
 begin update public.profiles set role='admin' where id=auth.uid(); assert false, 'A customer cannot change their own role'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 assert (select first_name is null and full_name='Only Full' from public.profiles where id='00000000-0000-4000-8000-000000009103'), 'A customer cannot rename another profile';
end $$;

set local role service_role;
do $$ begin
 assert exists(select 1 from public.profiles where id='00000000-0000-4000-8000-000000009101'), 'Privileged account maintenance retains access';
end $$;
reset role;
rollback;
