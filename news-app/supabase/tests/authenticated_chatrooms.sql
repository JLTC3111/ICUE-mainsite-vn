begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000009101','room-customer1@example.invalid'),
 ('00000000-0000-4000-8000-000000009102','room-customer2@example.invalid'),
 ('00000000-0000-4000-8000-000000009103','room-manager@example.invalid'),
 ('00000000-0000-4000-8000-000000009104','room-member@example.invalid'),
 ('00000000-0000-4000-8000-000000009105','room-unconfirmed@example.invalid');
update public.profiles set role='manager' where id='00000000-0000-4000-8000-000000009103';
update public.profiles set role='member' where id='00000000-0000-4000-8000-000000009104';
update auth.users set email_confirmed_at=null where id='00000000-0000-4000-8000-000000009105';
select set_config('test.members_room',(select id::text from icue_rooms.rooms where kind='members'),true);
do $$begin
 assert not has_table_privilege('authenticated','icue_rooms.messages','select');
 assert not has_table_privilege('authenticated','icue_rooms.network_events','select');
 assert not has_table_privilege('authenticated','icue_rooms.upload_attempts','insert');
 assert not has_function_privilege('anon','public.room_chat_bootstrap()','execute');
 assert not has_function_privilege('authenticated','icue_rooms.account()','execute');
 assert not has_function_privilege('authenticated','public.room_chat_file_ready(uuid,integer,text)','execute');
 assert not has_function_privilege('authenticated','public.room_chat_network_record(uuid,text,text,text,text,text)','execute');
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009103',true);
select set_config('test.private_room',public.room_chat_create('Customer project',array['00000000-0000-4000-8000-000000009101']::uuid[])->'room'->>'id',true);
do $$begin
 assert jsonb_array_length(public.room_chat_bootstrap()->'rooms')=2;
 assert (public.room_chat_bootstrap()->>'can_manage')::boolean;
 assert jsonb_array_length(public.room_chat_participants(current_setting('test.private_room')::uuid)->'participants')=2;
 assert jsonb_array_length(public.room_chat_customers('room-customer')->'customers')=2;
 begin insert into public.articles(author_id,slug,title) values(auth.uid(),'forged-manager-article','Chat management is not newsroom editing');assert false;exception when insufficient_privilege then null;end;
 begin update public.profiles set role='admin' where id=auth.uid();assert false;exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009101',true);
select set_config('test.message',(public.room_chat_send(current_setting('test.private_room')::uuid,'00000000-0000-4000-8000-000000009111',
 '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello","marks":[{"type":"bold"},{"type":"italic"},{"type":"underline"},{"type":"strike"}]}]},{"type":"sticker","attrs":{"name":"wave"}}]}'::jsonb)->'message'->>'id'),true);
select set_config('test.file',public.room_chat_file_reserve(current_setting('test.private_room')::uuid,'00000000-0000-4000-8000-000000009112','picture.webp','image/webp',128,repeat('1',64))->>'id',true);
select set_config('test.file_path',public.room_chat_file_reserve(current_setting('test.private_room')::uuid,'00000000-0000-4000-8000-000000009112','picture.webp','image/webp',128,repeat('1',64))->>'path',true);
do $$declare s jsonb;begin
 assert jsonb_array_length(public.room_chat_bootstrap()->'rooms')=1;
 assert not (public.room_chat_bootstrap()->>'can_manage')::boolean;
 begin perform public.room_chat_messages(current_setting('test.members_room')::uuid);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_create('Forged room',array[auth.uid()]);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_customers('');assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_network_events(current_setting('test.private_room')::uuid);assert false;exception when insufficient_privilege then null;end;
 s:=public.room_chat_send(current_setting('test.private_room')::uuid,'00000000-0000-4000-8000-000000009111',
 '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello","marks":[{"type":"bold"},{"type":"italic"},{"type":"underline"},{"type":"strike"}]}]},{"type":"sticker","attrs":{"name":"wave"}}]}'::jsonb);
 assert s->'message'->>'id'=current_setting('test.message'),'Retries reuse exact message';
 begin perform public.room_chat_send(current_setting('test.private_room')::uuid,'00000000-0000-4000-8000-000000009111','{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Changed"}]}]}');assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_send(current_setting('test.private_room')::uuid,gen_random_uuid(),'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"X","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}]}]}');assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_send(current_setting('test.private_room')::uuid,gen_random_uuid(),'{"type":"doc","content":[{"type":"sticker","attrs":{"name":"<svg onload=alert(1)>"}}]}');assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_file_reserve(current_setting('test.private_room')::uuid,gen_random_uuid(),'evil.svg','image/svg+xml',128,repeat('1',64));assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_file_reserve(current_setting('test.private_room')::uuid,gen_random_uuid(),'no-extension','image/png',128,repeat('1',64));assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_send(current_setting('test.private_room')::uuid,gen_random_uuid(),jsonb_build_object('type','doc','content',jsonb_build_array(jsonb_build_object('type','paragraph','content',jsonb_build_array(jsonb_build_object('type','text','text',repeat(' ',4001)))))));assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_file_reserve(current_setting('test.private_room')::uuid,'00000000-0000-4000-8000-000000009112','picture.webp','image/webp',129,repeat('1',64));assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_send(current_setting('test.private_room')::uuid,gen_random_uuid(),'{"type":"doc","content":[]}',array[current_setting('test.file')::uuid]);assert false;exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role service_role;
select public.room_chat_file_ready(current_setting('test.file')::uuid,128,repeat('1',64));
select public.room_chat_network_record('00000000-0000-4000-8000-000000009101','203.0.113.7','netlify_context');
select public.room_chat_network_record('00000000-0000-4000-8000-000000009101','203.0.113.7','netlify_context');
reset role;
do $$begin assert (select count(*) from icue_rooms.network_events where user_id='00000000-0000-4000-8000-000000009101')=1,'Network observations throttle';end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009101',true);
select public.room_chat_send(current_setting('test.private_room')::uuid,'00000000-0000-4000-8000-000000009113','{"type":"doc","content":[]}',array[current_setting('test.file')::uuid]);
do $$declare s jsonb;begin
 s:=public.room_chat_messages(current_setting('test.private_room')::uuid);
 assert jsonb_array_length(s->'messages')=2;
 assert s->'messages'->1->'files'->0->>'id'=current_setting('test.file');
 assert not (s->'messages'->1->'files'->0 ? 'path');
 assert public.room_chat_file_download(current_setting('test.private_room')::uuid,current_setting('test.file')::uuid)->>'sha256'=repeat('1',64);
end $$;
do $$begin
 -- Invalid media cannot evade the attempt budget by failing before reservation.
 for i in 1..20 loop perform public.room_chat_file_authorize(current_setting('test.private_room')::uuid);end loop;
 begin perform public.room_chat_file_authorize(current_setting('test.private_room')::uuid);assert false,'Attempt 21 must fail before decoding';exception when program_limit_exceeded then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009102',true);
do $$begin
 assert jsonb_array_length(public.room_chat_bootstrap()->'rooms')=0;
 begin perform public.room_chat_messages(current_setting('test.private_room')::uuid);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_file_download(current_setting('test.private_room')::uuid,current_setting('test.file')::uuid);assert false;exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009104',true);
do $$begin
 assert jsonb_array_length(public.room_chat_bootstrap()->'rooms')=1;
 begin perform public.room_chat_messages(current_setting('test.private_room')::uuid);assert false;exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009103',true);
do $$begin assert jsonb_array_length(public.room_chat_network_events(current_setting('test.private_room')::uuid)->'events')=1;end $$;
select public.room_chat_members(current_setting('test.private_room')::uuid,'00000000-0000-4000-8000-000000009102','add');
select public.room_chat_members(current_setting('test.private_room')::uuid,'00000000-0000-4000-8000-000000009101','remove');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009101',true);
do $$begin
 begin perform public.room_chat_messages(current_setting('test.private_room')::uuid);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_file_download(current_setting('test.private_room')::uuid,current_setting('test.file')::uuid);assert false;exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009103',true);
select public.room_chat_archive(current_setting('test.private_room')::uuid,true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009102',true);
do $$begin
 assert jsonb_array_length(public.room_chat_messages(current_setting('test.private_room')::uuid)->'messages')=2;
 begin perform public.room_chat_file_authorize(current_setting('test.private_room')::uuid);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_send(current_setting('test.private_room')::uuid,gen_random_uuid(),'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Archived"}]}]}');assert false;exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009105',true);
do $$begin begin perform public.room_chat_bootstrap();assert false;exception when insufficient_privilege then null;end;end $$;
reset role;
update auth.users set banned_until=clock_timestamp()+interval '1 day' where id='00000000-0000-4000-8000-000000009103';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009103',true);
do $$begin begin perform public.room_chat_bootstrap();assert false;exception when insufficient_privilege then null;end;end $$;
reset role;
create policy test_room_broad_storage on storage.objects for all to authenticated using(true) with check(true);
set local role authenticated;
do $$begin begin insert into storage.objects(bucket_id,name) values('room-chat','forged.webp');assert false;exception when insufficient_privilege then null;end;end $$;
reset role;
set local role service_role;
select public.room_chat_file_reject(current_setting('test.file')::uuid);
do $$begin assert public.room_chat_cleanup_batch()->'paths' ? current_setting('test.file_path'),'Rejected objects remain queued until Storage deletion succeeds';end $$;
select public.room_chat_cleanup_ack(array[current_setting('test.file_path')]);
reset role;
do $$begin assert not exists(select 1 from icue_rooms.file_cleanup where path=current_setting('test.file_path'));end $$;
-- Abandoned reservations and old network records are deleted by the autonomous
-- worker; object paths remain queued until confirmed Storage removal.
insert into icue_rooms.files(room_id,user_id,client_id,name,mime,size,sha256,path,created_at)
 values(current_setting('test.private_room')::uuid,'00000000-0000-4000-8000-000000009102',gen_random_uuid(),'orphan.png','image/png',128,repeat('2',64),'orphan-room-test.png',clock_timestamp()-interval '2 hours');
update icue_rooms.network_events set created_at=clock_timestamp()-interval '8 days' where user_id='00000000-0000-4000-8000-000000009101';
update icue_rooms.upload_attempts set created_at=clock_timestamp()-interval '11 minutes' where user_id='00000000-0000-4000-8000-000000009101';
set local role service_role;
do $$begin assert public.room_chat_cleanup_batch()->'paths' ? 'orphan-room-test.png';end $$;
reset role;
do $$begin
 assert not exists(select 1 from icue_rooms.files where path='orphan-room-test.png');
 assert not exists(select 1 from icue_rooms.network_events where user_id='00000000-0000-4000-8000-000000009101');
 assert not exists(select 1 from icue_rooms.upload_attempts where user_id='00000000-0000-4000-8000-000000009101');
end $$;
rollback;
