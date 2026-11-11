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
 assert not has_table_privilege('authenticated','icue_rooms.presence','select');
 assert not has_table_privilege('authenticated','icue_rooms.presence','insert');
 assert not has_table_privilege('anon','icue_rooms.presence','select');
 assert not has_function_privilege('anon','public.room_chat_bootstrap()','execute');
 assert not has_function_privilege('anon','public.room_chat_presence(text)','execute');
 assert not has_function_privilege('anon','public.room_chat_create_staff(text)','execute');
 assert has_function_privilege('authenticated','public.room_chat_create_staff(text)','execute');
 assert not has_function_privilege('anon','public.room_chat_edit(uuid,bigint,jsonb)','execute');
 assert has_function_privilege('authenticated','public.room_chat_edit(uuid,bigint,jsonb)','execute');
 assert not has_function_privilege('anon','public.room_chat_delete(uuid,bigint)','execute');
 assert has_function_privilege('authenticated','public.room_chat_delete(uuid,bigint)','execute');
 assert not has_function_privilege('anon','public.room_chat_delete_file(uuid,uuid)','execute');
 assert has_function_privilege('authenticated','public.room_chat_delete_file(uuid,uuid)','execute');
 assert not has_function_privilege('anon','icue_rooms.set_presence(text)','execute');
 assert has_function_privilege('authenticated','public.room_chat_presence(text)','execute');
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
 begin perform public.room_chat_presence('available');assert false;exception when insufficient_privilege then null;end;
 begin perform 1 from icue_rooms.presence;assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_create('Forged room',array[auth.uid()]);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_create_staff('Staff leak');assert false;exception when insufficient_privilege then null;end;
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
reset role;
update public.profiles set display_name='Room Member' where id='00000000-0000-4000-8000-000000009104';
update public.profiles set display_name='Room Manager', full_name='Mina Manager' where id='00000000-0000-4000-8000-000000009103';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009104',true);
do $$declare s jsonb;begin
 assert jsonb_array_length(public.room_chat_bootstrap()->'rooms')=1;
 begin perform public.room_chat_messages(current_setting('test.private_room')::uuid);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_presence('away');assert false;exception when invalid_parameter_value then null;end;
 s:=public.room_chat_presence('available');
 assert (select x->>'status' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009104')='available','Fresh presence is available';
 assert (select x->>'display_name' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009104')='Room Member';
 assert (select x->>'status' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009103')='offline','A chat member without a heartbeat is offline';
 assert (select x->>'full_name' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009103')='Mina Manager','Offline staff keep a full name';
 assert (select x->>'email' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009103')='room-manager@example.invalid','Offline staff keep an email';
 assert (select x->>'email' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009104')='room-member@example.invalid','Online staff keep an email';
 assert not (select x ? 'full_name' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009104'),'An empty full name is omitted';
 assert not exists(select 1 from jsonb_array_elements(s->'members') x where x->>'id' in ('00000000-0000-4000-8000-000000009101','00000000-0000-4000-8000-000000009105')),'Customers stay out of the directory';
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009103',true);
select public.room_chat_presence('busy');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009104',true);
do $$declare s jsonb;begin
 s:=public.room_chat_presence('available');
 assert (select x->>'status' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009103')='busy','A fresh busy choice stays busy';
 assert (select x->>'email' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009103')='room-manager@example.invalid','A busy member keeps an email';
 assert (select x->>'full_name' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009103')='Mina Manager','A busy member keeps a full name';
 assert (select n from jsonb_array_elements(s->'members') with ordinality t(x,n) where x->>'id'='00000000-0000-4000-8000-000000009104')
  < (select n from jsonb_array_elements(s->'members') with ordinality t(x,n) where x->>'id'='00000000-0000-4000-8000-000000009103'),'Available members sort before busy members';
end $$;
reset role;
update icue_rooms.presence set seen_at=clock_timestamp()-interval '46 seconds' where user_id='00000000-0000-4000-8000-000000009103';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009104',true);
do $$declare s jsonb;begin
 s:=public.room_chat_presence('available');
 assert (select x->>'status' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009103')='offline','Presence older than 45 seconds is offline';
 assert (select x->>'full_name' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009103')='Mina Manager','An expired heartbeat restores the full name';
 assert (select x->>'email' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009103')='room-manager@example.invalid','An expired heartbeat restores the email';
 assert (select x->>'status' from jsonb_array_elements(s->'members') x where x->>'id'='00000000-0000-4000-8000-000000009104')='available';
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009104',true);
do $$begin begin perform public.room_chat_create_staff('Member room');assert false;exception when insufficient_privilege then null;end;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009103',true);
do $$begin begin perform public.room_chat_create_staff(' ');assert false;exception when invalid_parameter_value then null;end;end $$;
select set_config('test.staff_room',(public.room_chat_create_staff('Planning')#>>'{room,id}'),true);
reset role;
do $$begin
 assert (select kind from icue_rooms.rooms where id=current_setting('test.staff_room')::uuid)='staff','Staff rooms are a distinct kind';
 assert not exists(select 1 from icue_rooms.participants where room_id=current_setting('test.staff_room')::uuid),'Staff rooms have no participant list';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009104',true);
do $$begin
 assert exists(select 1 from jsonb_array_elements(public.room_chat_bootstrap()->'rooms') r where r->>'id'=current_setting('test.staff_room') and r->>'kind'='staff'),'Members can see staff rooms';
 assert jsonb_array_length(public.room_chat_messages(current_setting('test.staff_room')::uuid)->'messages')=0;
end $$;
select set_config('test.edit_message',(public.room_chat_send(current_setting('test.staff_room')::uuid,'00000000-0000-4000-8000-000000009131','{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Edit me"}]}]}')#>>'{message,id}'),true);
do $$declare s jsonb;v_edited text;begin
 s:=public.room_chat_edit(current_setting('test.staff_room')::uuid,current_setting('test.edit_message')::bigint,'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Edited"}]},{"type":"sticker","attrs":{"name":"heart"}}]}');
 assert s->'message'->'document'->'content'->0->'content'->0->>'text'='Edited','Sender can replace the message';
 assert s->'message'->'document'->'content'->1->'attrs'->>'name'='heart';
 assert s->'message'->>'edited_at' is not null;
 assert s->'message'->>'deleted_at' is null;
 assert jsonb_array_length(s->'message'->'files')=0;
 v_edited:=s->'message'->>'edited_at';
 s:=public.room_chat_edit(current_setting('test.staff_room')::uuid,current_setting('test.edit_message')::bigint,'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Edited"}]},{"type":"sticker","attrs":{"name":"heart"}}]}');
 assert s->'message'->>'edited_at'=v_edited,'Saving the same document does not mark it edited again';
 begin perform public.room_chat_edit(current_setting('test.staff_room')::uuid,current_setting('test.edit_message')::bigint,'{"type":"doc","content":[]}');assert false;exception when invalid_parameter_value then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009103',true);
do $$begin begin perform public.room_chat_edit(current_setting('test.staff_room')::uuid,current_setting('test.edit_message')::bigint,'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Taken"}]}]}');assert false;exception when insufficient_privilege then null;end;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009101',true);
do $$begin begin perform public.room_chat_edit(current_setting('test.staff_room')::uuid,current_setting('test.edit_message')::bigint,'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Taken"}]}]}');assert false;exception when insufficient_privilege then null;end;end $$;
reset role;
update icue_rooms.messages set created_at=clock_timestamp()-interval '30 hours' where id=current_setting('test.edit_message')::bigint;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009104',true);
do $$begin
 perform public.room_chat_edit(current_setting('test.staff_room')::uuid,current_setting('test.edit_message')::bigint,'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Still editable"}]}]}');
 begin perform public.room_chat_delete(current_setting('test.staff_room')::uuid,current_setting('test.edit_message')::bigint);assert false;exception when invalid_parameter_value then null;end;
end $$;
reset role;
update icue_rooms.messages set created_at=clock_timestamp()-interval '49 hours' where id=current_setting('test.edit_message')::bigint;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009104',true);
do $$begin
 begin perform public.room_chat_edit(current_setting('test.staff_room')::uuid,current_setting('test.edit_message')::bigint,'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Too late"}]}]}');assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_delete(current_setting('test.staff_room')::uuid,current_setting('test.edit_message')::bigint);assert false;exception when invalid_parameter_value then null;end;
end $$;
select set_config('test.deleted_message',(public.room_chat_send(current_setting('test.staff_room')::uuid,'00000000-0000-4000-8000-000000009134','{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Remove me"}]}]}')#>>'{message,id}'),true);
do $$declare s jsonb;s2 jsonb;begin
 s:=public.room_chat_delete(current_setting('test.staff_room')::uuid,current_setting('test.deleted_message')::bigint);
 assert s->'message'->>'deleted_at' is not null,'Deleting keeps a notice row';
 assert s->'message'->'document'='{"type":"doc","content":[]}'::jsonb;
 assert jsonb_array_length(s->'message'->'files')=0;
 assert s->'message'->>'edited_at' is null;
 s2:=public.room_chat_delete(current_setting('test.staff_room')::uuid,current_setting('test.deleted_message')::bigint);
 assert s2->'message'->>'deleted_at'=s->'message'->>'deleted_at','A second delete returns the same notice';
 begin perform public.room_chat_edit(current_setting('test.staff_room')::uuid,current_setting('test.deleted_message')::bigint,'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Back"}]}]}');assert false;exception when invalid_parameter_value then null;end;
end $$;
select set_config('test.keep_file',public.room_chat_file_reserve(current_setting('test.staff_room')::uuid,'00000000-0000-4000-8000-000000009121','keep.jpg','image/jpeg',64,repeat('a',64))->>'id',true);
select set_config('test.keep_path',public.room_chat_file_reserve(current_setting('test.staff_room')::uuid,'00000000-0000-4000-8000-000000009121','keep.jpg','image/jpeg',64,repeat('a',64))->>'path',true);
select set_config('test.only_file',public.room_chat_file_reserve(current_setting('test.staff_room')::uuid,'00000000-0000-4000-8000-000000009122','only.jpg','image/jpeg',64,repeat('b',64))->>'id',true);
select set_config('test.only_path',public.room_chat_file_reserve(current_setting('test.staff_room')::uuid,'00000000-0000-4000-8000-000000009122','only.jpg','image/jpeg',64,repeat('b',64))->>'path',true);
reset role;
set local role service_role;
select public.room_chat_file_ready(current_setting('test.keep_file')::uuid,64,repeat('a',64));
select public.room_chat_file_ready(current_setting('test.only_file')::uuid,64,repeat('b',64));
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009104',true);
select public.room_chat_send(current_setting('test.staff_room')::uuid,'00000000-0000-4000-8000-000000009132','{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Keep"}]}]}',array[current_setting('test.keep_file')::uuid]);
select set_config('test.only_message',(public.room_chat_send(current_setting('test.staff_room')::uuid,'00000000-0000-4000-8000-000000009133','{"type":"doc","content":[]}',array[current_setting('test.only_file')::uuid])#>>'{message,id}'),true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009103',true);
do $$begin begin perform public.room_chat_delete_file(current_setting('test.staff_room')::uuid,current_setting('test.keep_file')::uuid);assert false;exception when insufficient_privilege then null;end;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009104',true);
do $$declare s jsonb;begin
 s:=public.room_chat_delete_file(current_setting('test.staff_room')::uuid,current_setting('test.keep_file')::uuid);
 assert s->'message'->>'deleted_at' is null,'Removing one file leaves the message';
 assert s->'message'->'document'->'content'->0->'content'->0->>'text'='Keep';
 assert jsonb_array_length(s->'message'->'files')=0;
 s:=public.room_chat_delete_file(current_setting('test.staff_room')::uuid,current_setting('test.only_file')::uuid);
 assert s->'message'->>'id'=current_setting('test.only_message');
 assert s->'message'->>'deleted_at' is not null,'Removing the last file becomes the notice';
 assert s->'message'->'document'='{"type":"doc","content":[]}'::jsonb;
end $$;
reset role;
do $$begin
 assert exists(select 1 from icue_rooms.messages where id=current_setting('test.deleted_message')::bigint and deleted_at is not null and document='{"type":"doc","content":[]}'::jsonb),'Deleted text is overwritten and the row remains';
 assert exists(select 1 from icue_rooms.messages where id=current_setting('test.only_message')::bigint and deleted_at is not null);
 assert not exists(select 1 from icue_rooms.files where id in (current_setting('test.keep_file')::uuid,current_setting('test.only_file')::uuid));
 assert exists(select 1 from icue_rooms.file_cleanup where path=current_setting('test.keep_path'));
 assert exists(select 1 from icue_rooms.file_cleanup where path=current_setting('test.only_path'));
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009101',true);
do $$begin
 assert not exists(select 1 from jsonb_array_elements(public.room_chat_bootstrap()->'rooms') r where r->>'id'=current_setting('test.staff_room')),'Customers cannot see staff rooms';
 begin perform public.room_chat_messages(current_setting('test.staff_room')::uuid);assert false;exception when insufficient_privilege then null;end;
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
 begin perform public.room_chat_edit(current_setting('test.private_room')::uuid,current_setting('test.message')::bigint,'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Archived"}]}]}');assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_delete(current_setting('test.private_room')::uuid,current_setting('test.message')::bigint);assert false;exception when insufficient_privilege then null;end;
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
