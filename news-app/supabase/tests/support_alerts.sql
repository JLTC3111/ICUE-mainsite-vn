begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000008301','alert-admin@example.invalid'),
 ('00000000-0000-4000-8000-000000008302','alert-author@example.invalid');
update public.profiles set role='admin' where id='00000000-0000-4000-8000-000000008301';

do $$ begin
 assert not has_function_privilege('anon','public.support_chat_alerts(bigint)','execute');
 assert not has_function_privilege('anon','icue_support.alerts(bigint)','execute');
 assert (select not prosecdef from pg_proc where oid='public.support_chat_alerts(bigint)'::regprocedure);
 assert not has_table_privilege('authenticated','icue_support.messages','select');
end $$;

insert into icue_support.conversations(id,token_hash,locale,visitor_name,owner_id)
 select md5('alert-conversation-'||n)::uuid,sha256(convert_to('alert-token-'||n,'UTF8')),'en','Visitor '||n,'00000000-0000-4000-8000-000000008302'
 from generate_series(1,120) n;
insert into icue_support.messages(conversation_id,client_id,sender,content)
 select md5('alert-conversation-'||n)::uuid,gen_random_uuid(),'visitor','Hello '||n from generate_series(1,120) n;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000008302',true);
set local role authenticated;
do $$ begin
 begin perform public.support_chat_alerts(); assert false,'Authors cannot read staff alerts'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000008301',true);
set local role authenticated;
do $$ declare result jsonb; begin
 result:=public.support_chat_alerts();
 assert (result->>'unread')::integer=120,'Unread count includes conversations beyond the first inbox page';
 assert jsonb_array_length(result->'events')=120,'Enabling alerts surfaces all unread conversations';
 assert not (result->>'has_more')::boolean;
 assert not (result->'events'->0 ? 'visitor_email') and not (result->'events'->0 ? 'token_hash'),'Only toast metadata is returned';
 perform set_config('test.alert_cursor',result->>'cursor',true);
 result:=public.support_chat_alerts(current_setting('test.alert_cursor')::bigint);
 assert jsonb_array_length(result->'events')=0,'A poll does not replay old messages';
 assert (result->>'unread')::integer=120,'Polling alerts does not mark chats read';
 begin perform public.support_chat_alerts(-1); assert false,'Reject invalid cursors'; exception when invalid_parameter_value then null; end;
end $$;
reset role;

insert into icue_support.messages(conversation_id,client_id,sender,content)
 values (md5('alert-conversation-1')::uuid,gen_random_uuid(),'staff','Staff replies never produce chat alerts');
set local role authenticated;
do $$ declare result jsonb; begin
 result:=public.support_chat_alerts(current_setting('test.alert_cursor')::bigint);
 assert jsonb_array_length(result->'events')=0,'Do not notify staff about their own replies';
end $$;
reset role;
insert into icue_support.messages(conversation_id,client_id,sender,content) values
 (md5('alert-conversation-1')::uuid,gen_random_uuid(),'visitor','A new question'),
 (md5('alert-conversation-1')::uuid,gen_random_uuid(),'visitor','Latest visitor preview');
set local role authenticated;
do $$ declare result jsonb; begin
 perform public.support_chat_read(null,md5('alert-conversation-1')::uuid);
 result:=public.support_chat_alerts(current_setting('test.alert_cursor')::bigint);
 assert jsonb_array_length(result->'events')=1,'Group new messages by conversation';
 assert (result->'events'->0->>'count')::integer=2,'Count visitor messages only';
 assert result->'events'->0->>'preview'='Latest visitor preview';
 assert (result->>'unread')::integer=119,'The open thread may already be read without hiding its alerts';
 perform set_config('test.alert_cursor',result->>'cursor',true);
end $$;
reset role;

insert into icue_support.messages(conversation_id,client_id,sender,content)
 select md5('alert-conversation-2')::uuid,gen_random_uuid(),'visitor','Batch '||n from generate_series(1,105) n;
set local role authenticated;
do $$ declare result jsonb; begin
 result:=public.support_chat_alerts(current_setting('test.alert_cursor')::bigint);
 assert (result->'events'->0->>'count')::integer=100 and (result->>'has_more')::boolean,'Bound large bursts and expose remaining messages';
 result:=public.support_chat_alerts((result->>'cursor')::bigint);
 assert (result->'events'->0->>'count')::integer=5 and not (result->>'has_more')::boolean,'Drain the next batch without losing messages';
 perform set_config('test.alert_cursor',result->>'cursor',true);
end $$;
reset role;

-- Reserve a lower identity before a later message commits, then insert it
-- after the alert cursor has advanced, as concurrent visitor requests can do.
select set_config('test.late_alert_seq',nextval(pg_get_serial_sequence('icue_support.messages','seq'))::text,true);
insert into icue_support.messages(conversation_id,client_id,sender,content)
 values(md5('alert-conversation-2')::uuid,gen_random_uuid(),'visitor','Commits first');
set local role authenticated;
select set_config('test.alert_cursor',public.support_chat_alerts(current_setting('test.alert_cursor')::bigint)->>'cursor',true);
reset role;
insert into icue_support.messages(seq,conversation_id,client_id,sender,content) overriding system value
 values(current_setting('test.late_alert_seq')::bigint,md5('alert-conversation-3')::uuid,gen_random_uuid(),'visitor','Late commit');
set local role authenticated;
do $$ declare result jsonb; begin
 result:=public.support_chat_alerts(current_setting('test.alert_cursor')::bigint);
 assert exists(select 1 from jsonb_array_elements(result->'overlap') e where e->>'seq'=current_setting('test.late_alert_seq')),'Catch committed messages below the cursor';
end $$;
reset role;

insert into icue_support.conversations(id,token_hash,locale,guest_expires_at)
 values (md5('expired-alert')::uuid,sha256(convert_to('expired-alert-token','UTF8')),'en',clock_timestamp()-interval '1 hour');
insert into icue_support.messages(conversation_id,client_id,sender,content)
 values (md5('expired-alert')::uuid,gen_random_uuid(),'visitor','Expired private chat');
set local role authenticated;
do $$ declare result jsonb; begin
 result:=public.support_chat_alerts(current_setting('test.alert_cursor')::bigint);
 assert jsonb_array_length(result->'events')=0,'Expired guest content cannot reach toast previews';
 assert (result->>'unread')::integer=226,'Unread totals omit expired guests';
end $$;
reset role;
update public.profiles set role='author' where id='00000000-0000-4000-8000-000000008301';
set local role authenticated;
do $$ begin
 begin perform public.support_chat_alerts(); assert false,'Recheck staff permission on every request'; exception when insufficient_privilege then null; end;
end $$;
rollback;
