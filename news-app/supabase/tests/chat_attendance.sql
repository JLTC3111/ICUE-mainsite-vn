begin;
insert into auth.users(id,email) values
  ('00000000-0000-4000-8000-000000007201','attendance-admin@example.invalid'),
  ('00000000-0000-4000-8000-000000007202','attendance-author@example.invalid');
insert into public.profiles(id,display_name,role) values
  ('00000000-0000-4000-8000-000000007201','Attending Staff','admin'),
  ('00000000-0000-4000-8000-000000007202','Author','author')
  on conflict (id) do update set role=excluded.role;

set local role anon;
select set_config('test.attendance_id', public.support_chat_open(repeat('c',64),gen_random_uuid(),'Please help','en')->'conversation'->>'id',true);
select set_config('test.other_chat_id', public.support_chat_open(repeat('d',64),gen_random_uuid(),'Another visitor','en')->'conversation'->>'id',true);
do $$ begin
  assert public.support_chat_read(repeat('c',64))->'conversation'->>'staff_attending_until' is null, 'A visitor cannot create staff presence';
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000007201',true);
set local role authenticated;
do $$ declare r jsonb; begin
  perform public.support_chat_presence(false);
  r:=public.support_chat_read(null,current_setting('test.attendance_id')::uuid);
  assert r->'health'->>'available_until' is null, 'General availability stays off';
  assert (r->'conversation'->>'staff_attending_until')::timestamptz > clock_timestamp(), 'Opening a conversation starts attendance without Go online';
  assert not (r->'conversation' ? 'attending_staff_id'), 'Do not expose staff identifiers';
end $$;
reset role;

set local role anon;
do $$ begin
  assert public.support_chat_read(repeat('c',64))->'conversation'->>'staff_attending_until' is not null, 'Own visitor sees attendance';
  assert public.support_chat_read(repeat('d',64))->'conversation'->>'staff_attending_until' is null, 'Another visitor does not inherit attendance';
end $$;
reset role;

update icue_support.conversations set attending_until=clock_timestamp()-interval '1 second' where id=current_setting('test.attendance_id')::uuid;
set local role anon;
do $$ begin
  assert public.support_chat_read(repeat('c',64))->'conversation'->>'staff_attending_until' is null, 'Attendance expires when staff leave';
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000007202',true);
set local role authenticated;
do $$ begin
  begin perform public.support_chat_read(null,current_setting('test.attendance_id')::uuid); assert false,'An ordinary author cannot attend'; exception when insufficient_privilege then null; end;
  perform public.support_chat_read(repeat('c',64));
  assert public.support_chat_read(repeat('c',64))->'conversation'->>'staff_attending_until' is null, 'A visitor capability cannot impersonate staff';
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000007201',true);
set local role authenticated;
do $$ declare r jsonb; begin
  r:=public.support_chat_send(gen_random_uuid(),'I am here to help',null,current_setting('test.attendance_id')::uuid);
  assert r->'conversation'->>'staff_attending_until' is not null, 'Replying automatically renews attendance';
  r:=public.support_chat_status(current_setting('test.attendance_id')::uuid,'closed');
  assert r->'conversation'->>'staff_attending_until' is null, 'Resolution ends attendance immediately';
  r:=public.support_chat_read(null,current_setting('test.attendance_id')::uuid);
  assert r->'conversation'->>'staff_attending_until' is null, 'Reading a resolved chat cannot renew attendance';
end $$;
reset role;

set local role anon;
do $$ declare r jsonb; begin
  r:=public.support_chat_send(gen_random_uuid(),'Follow-up',repeat('c',64));
  assert r->'conversation'->>'staff_attending_until' is null, 'A follow-up cannot restore an old attendance lease';
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000007201',true);
set local role authenticated;
select public.support_chat_read(null,current_setting('test.attendance_id')::uuid);
reset role;
update public.profiles set role='author' where id='00000000-0000-4000-8000-000000007201';
set local role anon;
do $$ begin
  assert public.support_chat_read(repeat('c',64))->'conversation'->>'staff_attending_until' is null, 'Revoked staff stop appearing as attending immediately';
end $$;
reset role;
rollback;
