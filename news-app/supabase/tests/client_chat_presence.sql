begin;
insert into auth.users(id,email) values
  ('00000000-0000-4000-8000-000000007301','client-presence-admin@example.invalid'),
  ('00000000-0000-4000-8000-000000007302','client-presence-author@example.invalid');
insert into public.profiles(id,display_name,role) values
  ('00000000-0000-4000-8000-000000007301','Support Staff','admin'),
  ('00000000-0000-4000-8000-000000007302','Author','author')
  on conflict(id) do update set role=excluded.role;
do $$ begin
  assert (select relrowsecurity from pg_class where oid='icue_support.visitor_connections'::regclass), 'Connection table enables RLS';
  assert not has_table_privilege('anon','icue_support.visitor_connections','select'), 'Visitors cannot enumerate connections';
  assert not has_table_privilege('authenticated','icue_support.visitor_connections','insert'), 'Staff cannot forge connections directly';
  assert not has_function_privilege('anon','icue_support.visitor_state(uuid)','execute'), 'Internal presence lookup is not public';
end $$;

set local role anon;
select set_config('test.client_chat_a',public.support_chat_open(repeat('1',64),gen_random_uuid(),'First client','en')->'conversation'->>'id',true);
select set_config('test.client_chat_b',public.support_chat_open(repeat('2',64),gen_random_uuid(),'Second client','en')->'conversation'->>'id',true);
do $$ declare r jsonb; begin
  assert public.support_chat_read(repeat('1',64))->'conversation'->>'visitor_status'='unknown', 'Missing heartbeats do not invent a departure';
  perform public.support_chat_visitor_presence(repeat('1',64),'00000000-0000-4000-8000-000000007310',1,'active');
  r:=public.support_chat_read(repeat('1',64));
  assert r->'conversation'->>'visitor_status'='active', 'An open chat is present';
  assert (r->'conversation'->>'visitor_presence_until')::timestamptz>clock_timestamp(), 'Presence has an expiry';
  assert public.support_chat_read(repeat('2',64))->'conversation'->>'visitor_status'='unknown', 'Presence is scoped to the visitor';
  perform public.support_chat_visitor_presence(repeat('1',64),'00000000-0000-4000-8000-000000007310',2,'away');
  assert public.support_chat_read(repeat('1',64))->'conversation'->>'visitor_status'='away', 'Background chat is away';
  perform public.support_chat_visitor_presence(repeat('1',64),'00000000-0000-4000-8000-000000007310',3,'left');
  assert public.support_chat_read(repeat('1',64))->'conversation'->>'visitor_status'='left', 'Explicit departure is shown';
  perform public.support_chat_visitor_presence(repeat('1',64),'00000000-0000-4000-8000-000000007310',1,'active');
  assert public.support_chat_read(repeat('1',64))->'conversation'->>'visitor_status'='left', 'An old heartbeat cannot undo a departure';
  perform public.support_chat_visitor_presence(repeat('1',64),'00000000-0000-4000-8000-000000007311',1,'active');
  perform public.support_chat_visitor_presence(repeat('1',64),'00000000-0000-4000-8000-000000007310',4,'left');
  assert public.support_chat_read(repeat('1',64))->'conversation'->>'visitor_status'='active', 'Closing one tab leaves another active tab present';
  perform public.support_chat_visitor_presence(repeat('1',64),'00000000-0000-4000-8000-000000007311',2,'left');
  assert public.support_chat_read(repeat('1',64))->'conversation'->>'visitor_status'='left', 'Closing every tab leaves the chat';
  begin perform public.support_chat_visitor_presence(repeat('3',64),gen_random_uuid(),1,'active'); assert false,'Unknown capability'; exception when insufficient_privilege then null; end;
  begin perform public.support_chat_visitor_presence(repeat('1',64),gen_random_uuid(),0,'active'); assert false,'Invalid sequence'; exception when invalid_parameter_value then null; end;
  begin perform public.support_chat_visitor_presence(repeat('1',64),gen_random_uuid(),1,'forged'); assert false,'Invalid state'; exception when invalid_parameter_value then null; end;
  perform public.support_chat_visitor_presence(repeat('2',64),'00000000-0000-4000-8000-000000007312',1,'active');
end $$;
reset role;

update icue_support.visitor_connections set seen_at=clock_timestamp()-interval '46 seconds'
  where conversation_id=current_setting('test.client_chat_b')::uuid;
set local role anon;
do $$ begin
  assert public.support_chat_read(repeat('2',64))->'conversation'->>'visitor_status'='disconnected', 'A lost heartbeat is disconnected, not an explicit departure';
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000007301',true);
set local role authenticated;
do $$ declare r jsonb; begin
  begin perform public.support_chat_visitor_presence(null,gen_random_uuid(),1,'active'); assert false,'Staff authentication is not a visitor capability'; exception when insufficient_privilege then null; end;
  r:=public.support_chat_read(null,current_setting('test.client_chat_a')::uuid);
  assert r->'conversation'->>'visitor_status'='left', 'The helping staff member sees departures';
  assert not (r->'conversation' ? 'connection_id'), 'Private connection IDs are not returned';
  r:=public.support_chat_inbox();
  assert exists(select 1 from jsonb_array_elements(r->'conversations') c where c->>'id'=current_setting('test.client_chat_a') and c->>'visitor_status'='left'), 'Queue includes client presence';
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000007302',true);
set local role authenticated;
do $$ begin
  begin perform public.support_chat_read(null,current_setting('test.client_chat_a')::uuid); assert false,'Ordinary author cannot read client status'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Bound per-conversation tracking, even with hostile window IDs.
delete from icue_support.visitor_connections where conversation_id=current_setting('test.client_chat_b')::uuid;
set local role anon;
do $$ begin
  for i in 1..20 loop perform public.support_chat_visitor_presence(repeat('2',64),gen_random_uuid(),1,'active'); end loop;
  begin perform public.support_chat_visitor_presence(repeat('2',64),gen_random_uuid(),1,'active'); assert false,'Connection limit'; exception when raise_exception then null; end;
end $$;
reset role;
rollback;
