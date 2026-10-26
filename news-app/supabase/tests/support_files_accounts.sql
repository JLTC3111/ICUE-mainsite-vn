begin;
insert into auth.users(id,email,is_anonymous) values
 ('00000000-0000-4000-8000-000000008001','customer1@example.invalid',false),
 ('00000000-0000-4000-8000-000000008002','customer2@example.invalid',false),
 ('00000000-0000-4000-8000-000000008003','staff@example.invalid',false),
 ('00000000-0000-4000-8000-000000008004',null,true);
update public.profiles set role='admin' where id='00000000-0000-4000-8000-000000008003';
do $$ begin
 assert (select role='customer' from public.profiles where id='00000000-0000-4000-8000-000000008001');
 assert not has_table_privilege('anon','icue_support.files','select');
 assert not has_table_privilege('authenticated','icue_support.file_cleanup','select');
 assert not has_function_privilege('authenticated','public.support_chat_file_ready(uuid)','execute');
 assert not has_function_privilege('anon','public.support_chat_cleanup_batch()','execute');
 assert not has_function_privilege('authenticated','icue_support.install_cleanup(text)','execute');
end $$;
create policy test_broad_storage_policy on storage.objects for all to anon,authenticated using(true) with check(true);
set local role anon;
select set_config('test.owned_chat',public.support_chat_open(repeat('c',64),gen_random_uuid(),'Please review this file','en')->'conversation'->>'id',true);
select set_config('test.guest_chat',public.support_chat_prepare(repeat('d',64),'en')->'conversation'->>'id',true);
do $$ begin
 begin insert into storage.objects(bucket_id,name) values('support-chat','forged.pdf'); assert false; exception when insufficient_privilege then null; end;
 begin perform public.support_chat_file_reserve(repeat('c',64),null,gen_random_uuid(),'script.svg','image/svg+xml',20,repeat('1',64)); assert false; exception when invalid_parameter_value then null; end;
 begin perform public.support_chat_file_reserve(repeat('c',64),null,gen_random_uuid(),'file','application/pdf',20,repeat('1',64)); assert false; exception when invalid_parameter_value then null; end;
 begin perform public.support_chat_file_reserve(repeat('c',64),null,gen_random_uuid(),'large.pdf','application/pdf',10485761,repeat('1',64)); assert false; exception when invalid_parameter_value then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000008001',true);
set local role authenticated;
select public.support_chat_claim(repeat('c',64));
select set_config('test.file',public.support_chat_file_reserve(null,current_setting('test.owned_chat')::uuid,'00000000-0000-4000-8000-000000008010','request.pdf','application/pdf',128,repeat('1',64))->>'id',true);
do $$ declare s jsonb; begin
 s:=public.support_chat_read(null,current_setting('test.owned_chat')::uuid);
 assert (s->'conversation'->>'account_saved')::boolean;
 assert s->'conversation'->'guest_expires_at'='null'::jsonb;
 assert jsonb_array_length(public.support_chat_customer_chats()->'conversations')=1;
 begin update public.profiles set role='admin' where id=auth.uid(); assert false; exception when insufficient_privilege then null; end;
 begin insert into public.articles(author_id,slug,title) values(auth.uid(),'customer-forged-article','Not a staff account'); assert false; exception when insufficient_privilege then null; end;
 begin perform public.support_chat_file_ready(current_setting('test.file')::uuid); assert false; exception when insufficient_privilege then null; end;
 begin perform public.support_chat_send_files(gen_random_uuid(),'',array[current_setting('test.file')::uuid],null,current_setting('test.owned_chat')::uuid); assert false; exception when insufficient_privilege then null; end;
 begin perform public.support_chat_inbox(); assert false; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ begin
 begin perform public.support_chat_read(repeat('c',64)); assert false,'Claimed guest capabilities require the owner session'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
select public.support_chat_file_ready(current_setting('test.file')::uuid);
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000008001',true);
set local role authenticated;
select public.support_chat_send_files('00000000-0000-4000-8000-000000008011','',array[current_setting('test.file')::uuid],null,current_setting('test.owned_chat')::uuid);
do $$ declare s jsonb;begin
 s:=public.support_chat_send_files('00000000-0000-4000-8000-000000008011','',array[current_setting('test.file')::uuid],null,current_setting('test.owned_chat')::uuid);
 assert jsonb_array_length(s->'messages')=2,'A lost send response must not duplicate file messages';
 assert s->'messages'->1->>'sender'='visitor','Account owners must never become staff senders';
 assert jsonb_array_length(s->'messages'->1->'attachments')=1;
 assert not (s->'messages'->1->'attachments'->0 ? 'path');
 assert public.support_chat_file_download(null,current_setting('test.owned_chat')::uuid,current_setting('test.file')::uuid)->>'name'='request.pdf';
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000008002',true);
set local role authenticated;
do $$ begin
 assert jsonb_array_length(public.support_chat_customer_chats()->'conversations')=0;
 begin perform public.support_chat_read(null,current_setting('test.owned_chat')::uuid); assert false; exception when insufficient_privilege then null; end;
 begin perform public.support_chat_claim(repeat('c',64)); assert false; exception when insufficient_privilege then null; end;
 begin perform public.support_chat_file_download(null,current_setting('test.owned_chat')::uuid,current_setting('test.file')::uuid); assert false; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000008003',true);
set local role authenticated;
do $$ begin
 assert public.support_chat_file_download(null,current_setting('test.owned_chat')::uuid,current_setting('test.file')::uuid)->>'mime'='application/pdf';
 assert jsonb_array_length(public.support_chat_read(null,current_setting('test.owned_chat')::uuid)->'messages')=2;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select set_config('test.guest_file',public.support_chat_file_reserve(repeat('d',64),null,gen_random_uuid(),'temporary.png','image/png',68,repeat('2',64))->>'id',true);
reset role;
set local role service_role;
select public.support_chat_file_ready(current_setting('test.guest_file')::uuid);
reset role;
set local role anon;
select public.support_chat_send_files(gen_random_uuid(),'Guest upload',array[current_setting('test.guest_file')::uuid],repeat('d',64));
reset role;
update icue_support.conversations set guest_expires_at=clock_timestamp()-interval '1 second' where id=current_setting('test.guest_chat')::uuid;
set local role anon;
do $$ begin
 begin perform public.support_chat_read(repeat('d',64)); assert false,'Expiry denies access before scheduled physical cleanup'; exception when insufficient_privilege then null; end;
 begin perform public.support_chat_visitor_presence(repeat('d',64),gen_random_uuid(),1,'active'); assert false,'Expired sessions cannot be revived'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
do $$ declare s jsonb;begin
 s:=public.support_chat_cleanup_batch(); assert (s->>'conversations_deleted')::int=1;
 assert jsonb_array_length(s->'paths')=1,'Files remain queued until Storage confirms deletion';
end $$;
reset role;
do $$ begin
 assert not exists(select 1 from icue_support.conversations where id=current_setting('test.guest_chat')::uuid);
 assert exists(select 1 from icue_support.conversations where id=current_setting('test.owned_chat')::uuid),'Customer conversations survive guest cleanup';
 assert exists(select 1 from icue_support.files where id=current_setting('test.file')::uuid);
 assert not exists(select 1 from icue_support.files where id=current_setting('test.guest_file')::uuid);
 assert not exists(select 1 from icue_support.messages where conversation_id=current_setting('test.guest_chat')::uuid);
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000008004',true);
set local role authenticated;
do $$ begin
 assert public.support_chat_account() is null;
 begin perform public.support_chat_claim(repeat('d',64)); assert false,'Anonymous auth identities cannot save guest data'; exception when insufficient_privilege then null; end;
end $$;
rollback;
