begin;

insert into auth.users(id, email) values
  ('00000000-0000-4000-8000-000000007001', 'support-admin@example.invalid'),
  ('00000000-0000-4000-8000-000000007002', 'support-author@example.invalid');
insert into public.profiles(id, display_name, role) values
  ('00000000-0000-4000-8000-000000007001', 'Support Admin', 'admin'),
  ('00000000-0000-4000-8000-000000007002', 'Support Author', 'author')
on conflict (id) do update set role = excluded.role, display_name = excluded.display_name;

do $$ begin
  assert (select count(*) = 3 from pg_class c join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'icue_support' and c.relname in ('conversations','messages','presence') and c.relkind = 'r' and c.relrowsecurity), 'Private tables must enable RLS';
  assert not has_table_privilege('anon', 'icue_support.messages', 'select'), 'Anon cannot read raw messages';
  assert not has_table_privilege('authenticated', 'icue_support.conversations', 'select'), 'Staff cannot bypass the checked RPC';
  assert not has_function_privilege('anon', 'public.support_chat_inbox(text,integer)', 'execute'), 'No anonymous inbox';
  assert not has_function_privilege('anon', 'icue_support.authorize(text,uuid)', 'execute'), 'Internal helper must be private';
  assert (select not prosecdef from pg_proc where oid = 'public.support_chat_read(text,uuid,bigint,boolean)'::regprocedure), 'Public RPC must be an invoker';
end $$;

set local role anon;
select set_config('test.support_id', public.support_chat_open(
  repeat('a',64), '00000000-0000-4000-8000-000000007010', 'A project enquiry', 'en', 'Visitor', '', '/contact') -> 'conversation' ->> 'id', true);
do $$ declare snapshot jsonb; begin
  snapshot := public.support_chat_open(repeat('a',64), '00000000-0000-4000-8000-000000007010', 'A project enquiry', 'en');
  assert jsonb_array_length(snapshot->'messages') = 1, 'Retry after a lost creation response must be idempotent';
  assert snapshot->'conversation'->>'id' = current_setting('test.support_id'), 'Retry must reuse the thread';
  assert snapshot->'conversation'->>'visitor_email' = '', 'No fabricated email';
  assert not (snapshot->'conversation' ? 'token_hash'), 'Never return the capability hash';
  begin perform public.support_chat_read(repeat('b',64)); assert false, 'Wrong capability must fail'; exception when insufficient_privilege then null; end;
  begin perform public.support_chat_read(null,current_setting('test.support_id')::uuid); assert false, 'UUID alone must not authorize'; exception when insufficient_privilege then null; end;
  begin perform public.support_chat_send('00000000-0000-4000-8000-000000007010','Changed payload',repeat('a',64)); assert false, 'Cannot reuse an id for another payload'; exception when invalid_parameter_value then null; end;
  begin perform public.support_chat_open(repeat('b',64),gen_random_uuid(),'Hello','invalid'); assert false, 'Unknown locale'; exception when invalid_parameter_value then null; end;
  begin perform public.support_chat_open(repeat('b',64),gen_random_uuid(),'Hello','en','','','/?token=secret'); assert false, 'Never store URL query parameters'; exception when invalid_parameter_value then null; end;
  begin perform public.support_chat_send(gen_random_uuid(),repeat('x',4001),repeat('a',64)); assert false, 'Bound message size'; exception when invalid_parameter_value then null; end;
  perform public.support_chat_activity(true,repeat('a',64));
  snapshot := public.support_chat_read(repeat('a',64));
  assert (snapshot->'conversation'->>'visitor_typing_until')::timestamptz > clock_timestamp(), 'Visitor typing must expire';
end $$;

reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000007002', true);
set local role authenticated;
do $$ begin
  begin perform public.support_chat_inbox(); assert false, 'Ordinary author cannot read inbox'; exception when insufficient_privilege then null; end;
  begin perform public.support_chat_presence(true); assert false, 'Ordinary author cannot advertise availability'; exception when insufficient_privilege then null; end;
  begin perform public.support_chat_read(null,current_setting('test.support_id')::uuid); assert false, 'Ordinary author cannot read thread'; exception when insufficient_privilege then null; end;
  begin perform public.support_chat_send(gen_random_uuid(),'Forged staff response',null,current_setting('test.support_id')::uuid); assert false, 'Ordinary author cannot reply'; exception when insufficient_privilege then null; end;
end $$;

reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000007001', true);
set local role authenticated;
do $$ declare snapshot jsonb; begin
  assert public.support_chat_presence(true)->>'available_until' is not null, 'Admin must be able to go online';
  snapshot := public.support_chat_inbox();
  assert jsonb_array_length(snapshot->'conversations') = 1, 'Admin sees visitor queue';
  assert (snapshot->'conversations'->0->>'unread')::integer = 1, 'Queue tracks unread visitor messages';
  snapshot := public.support_chat_read(null,current_setting('test.support_id')::uuid);
  assert (public.support_chat_inbox()->'conversations'->0->>'unread')::integer = 0, 'Reading clears team unread count';
  snapshot := public.support_chat_send('00000000-0000-4000-8000-000000007011','A real staff reply',null,current_setting('test.support_id')::uuid);
  assert snapshot->'conversation'->>'status' = 'active', 'Reply activates the conversation';
  assert snapshot->'messages'->1->>'sender' = 'staff', 'Staff identity comes from authorization';
  assert snapshot->'messages'->1->>'sender_name' = 'Support Admin', 'Staff display name comes from profile';
  perform public.support_chat_activity(true,null,current_setting('test.support_id')::uuid);
  perform public.support_chat_status(current_setting('test.support_id')::uuid,'closed');
end $$;

reset role;
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
do $$ declare snapshot jsonb; begin
  snapshot := public.support_chat_read(repeat('a',64));
  assert snapshot->'messages'->1->>'content' = 'A real staff reply', 'Visitor receives actual staff message';
  assert snapshot->'conversation'->>'status' = 'closed', 'Resolution reaches visitor';
  assert (snapshot->'conversation'->>'staff_read_seq')::bigint >= (snapshot->'messages'->0->>'seq')::bigint, 'Visitor sees accurate receipt';
  snapshot := public.support_chat_send(gen_random_uuid(),'<script>literal text</script>',repeat('a',64));
  assert snapshot->'conversation'->>'status' = 'waiting', 'Visitor follow-up reopens a resolved conversation';
  assert snapshot->'messages'->2->>'content' = '<script>literal text</script>', 'Messages remain plain text';
end $$;

reset role;
-- Seed an older backlog to exercise real pagination without rate-limit bypasses.
insert into icue_support.messages(conversation_id,client_id,sender,content,created_at)
  select current_setting('test.support_id')::uuid, gen_random_uuid(), 'staff', 'Backlog ' || n, clock_timestamp() - interval '10 minutes'
  from generate_series(1,60) n;
set local role anon;
do $$ declare newest jsonb; older jsonb; begin
  newest := public.support_chat_read(repeat('a',64));
  assert jsonb_array_length(newest->'messages') = 50 and (newest->>'has_more')::boolean, 'Latest page is bounded';
  older := public.support_chat_read(repeat('a',64),null,(newest->'messages'->0->>'seq')::bigint,false);
  assert jsonb_array_length(older->'messages') = 13 and not (older->>'has_more')::boolean, 'Older page contains every remaining message';
  assert (older->'messages'->12->>'seq')::bigint < (newest->'messages'->0->>'seq')::bigint, 'Pages do not overlap';
end $$;

reset role;
update icue_support.presence set seen_at = clock_timestamp() - interval '46 seconds';
do $$ begin assert public.support_chat_health()->>'available_until' is null, 'Disconnected staff must expire'; end $$;
update icue_support.presence set seen_at = clock_timestamp();
update public.profiles set role = 'author' where id = '00000000-0000-4000-8000-000000007001';
do $$ begin assert public.support_chat_health()->>'available_until' is null, 'A revoked administrator is never advertised online'; end $$;

insert into icue_support.messages(conversation_id,client_id,sender,content)
  select current_setting('test.support_id')::uuid, gen_random_uuid(), 'visitor', 'Rate test ' || n from generate_series(1,30) n;
set local role anon;
do $$ begin
  begin perform public.support_chat_send(gen_random_uuid(),'Too many messages',repeat('a',64)); assert false, 'Per-thread rate limit'; exception when raise_exception then null; end;
end $$;
reset role;
rollback;
