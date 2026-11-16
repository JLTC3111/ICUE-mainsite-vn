begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000009201','dm-member@example.invalid'),
 ('00000000-0000-4000-8000-000000009202','dm-author@example.invalid'),
 ('00000000-0000-4000-8000-000000009203','dm-manager@example.invalid'),
 ('00000000-0000-4000-8000-000000009204','dm-customer@example.invalid'),
 ('00000000-0000-4000-8000-000000009205','dm-unconfirmed@example.invalid'),
 ('00000000-0000-4000-8000-000000009206','dm-banned@example.invalid');
update public.profiles set role='member' where id in ('00000000-0000-4000-8000-000000009201','00000000-0000-4000-8000-000000009205','00000000-0000-4000-8000-000000009206');
update public.profiles set role='author' where id='00000000-0000-4000-8000-000000009202';
update public.profiles set role='manager' where id='00000000-0000-4000-8000-000000009203';
update auth.users set email_confirmed_at=null where id='00000000-0000-4000-8000-000000009205';
update auth.users set banned_until=now()+interval '1 day' where id='00000000-0000-4000-8000-000000009206';
do $$begin
 assert not has_table_privilege('authenticated','icue_rooms.direct_rooms','select');
 assert not has_table_privilege('authenticated','icue_rooms.direct_rooms','insert');
 assert not has_table_privilege('anon','icue_rooms.direct_rooms','select');
 assert not has_function_privilege('anon','public.room_chat_direct(uuid)','execute');
 assert has_function_privilege('authenticated','public.room_chat_direct(uuid)','execute');
 assert not has_function_privilege('anon','icue_rooms.open_direct(uuid)','execute');
 assert not has_function_privilege('authenticated','icue_rooms.active_internal(uuid)','execute');
 assert not has_function_privilege('authenticated','icue_rooms.direct_writable(uuid,uuid)','execute');
 assert not has_function_privilege('authenticated','icue_rooms.room_json(uuid)','execute');
end $$;

-- A member opens a DM with an author; reopening returns the same room.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009201',true);
select set_config('test.dm',public.room_chat_direct('00000000-0000-4000-8000-000000009202')->'room'->>'id',true);
do $$declare r jsonb;begin
 r:=public.room_chat_direct('00000000-0000-4000-8000-000000009202')->'room';
 assert r->>'id'=current_setting('test.dm'),'Reopening returns the same DM';
 assert r->>'kind'='dm' and r->'peer'->>'id'='00000000-0000-4000-8000-000000009202' and not (r->>'read_only')::boolean;
 assert r->'peer'->>'email'='dm-author@example.invalid';
 assert exists(select 1 from jsonb_array_elements(public.room_chat_bootstrap()->'rooms') x where x->>'id'=current_setting('test.dm') and x->'peer'->>'id'='00000000-0000-4000-8000-000000009202');
 begin perform public.room_chat_direct(auth.uid());assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_direct(null);assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_direct('00000000-0000-4000-8000-000000009204');assert false,'Customers cannot receive DMs';exception when insufficient_privilege then null;end;
 begin perform public.room_chat_direct('00000000-0000-4000-8000-000000009205');assert false,'Unconfirmed accounts cannot receive DMs';exception when insufficient_privilege then null;end;
 begin perform public.room_chat_direct('00000000-0000-4000-8000-000000009206');assert false,'Banned accounts cannot receive DMs';exception when insufficient_privilege then null;end;
 begin perform public.room_chat_direct(gen_random_uuid());assert false;exception when insufficient_privilege then null;end;
end $$;
select set_config('test.dm_message',public.room_chat_send(current_setting('test.dm')::uuid,'00000000-0000-4000-8000-000000009211',
 '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Just us"}]}]}'::jsonb)->'message'->>'id',true);
select set_config('test.dm_file',public.room_chat_file_reserve(current_setting('test.dm')::uuid,'00000000-0000-4000-8000-000000009212','note.png','image/png',64,repeat('2',64))->>'id',true);
reset role;
set local role service_role;
select public.room_chat_file_ready(current_setting('test.dm_file')::uuid,64,repeat('2',64));
reset role;
do $$begin
 assert (select count(*) from icue_rooms.direct_rooms where room_id=current_setting('test.dm')::uuid)=1;
 assert (select count(*) from icue_rooms.participants where room_id=current_setting('test.dm')::uuid)=2;
 assert (select state from icue_rooms.files where id=current_setting('test.dm_file')::uuid)='ready','DM participants can finalize uploads';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009201',true);
select public.room_chat_send(current_setting('test.dm')::uuid,'00000000-0000-4000-8000-000000009213','{"type":"doc","content":[]}',array[current_setting('test.dm_file')::uuid]);

-- The other participant reaches the same room from their side.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009202',true);
do $$declare r jsonb;s jsonb;begin
 r:=public.room_chat_direct('00000000-0000-4000-8000-000000009201')->'room';
 assert r->>'id'=current_setting('test.dm'),'Either side reaches the same DM';
 assert r->'peer'->>'id'='00000000-0000-4000-8000-000000009201';
 s:=public.room_chat_messages(current_setting('test.dm')::uuid);
 assert jsonb_array_length(s->'messages')=2;
 assert public.room_chat_file_download(current_setting('test.dm')::uuid,current_setting('test.dm_file')::uuid)->>'sha256'=repeat('2',64);
 perform public.room_chat_send(current_setting('test.dm')::uuid,gen_random_uuid(),'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Reply"}]}]}');
end $$;

-- A manager outside the DM cannot see or touch it.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009203',true);
do $$begin
 assert not exists(select 1 from jsonb_array_elements(public.room_chat_bootstrap()->'rooms') x where x->>'id'=current_setting('test.dm'));
 begin perform public.room_chat_messages(current_setting('test.dm')::uuid);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_send(current_setting('test.dm')::uuid,gen_random_uuid(),'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Intrude"}]}]}');assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_edit(current_setting('test.dm')::uuid,current_setting('test.dm_message')::bigint,'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Forged"}]}]}');assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_delete(current_setting('test.dm')::uuid,current_setting('test.dm_message')::bigint);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_file_download(current_setting('test.dm')::uuid,current_setting('test.dm_file')::uuid);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_file_reserve(current_setting('test.dm')::uuid,gen_random_uuid(),'leak.png','image/png',64,repeat('3',64));assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_participants(current_setting('test.dm')::uuid);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_network_events(current_setting('test.dm')::uuid);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_members(current_setting('test.dm')::uuid,'00000000-0000-4000-8000-000000009203','add');assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_archive(current_setting('test.dm')::uuid,true);assert false;exception when insufficient_privilege then null;end;
end $$;
-- Even inside their own DM, a manager cannot list participants, read network records or reshape the room.
select set_config('test.dm_manager',public.room_chat_direct('00000000-0000-4000-8000-000000009201')->'room'->>'id',true);
do $$begin
 assert current_setting('test.dm_manager')<>current_setting('test.dm');
 begin perform public.room_chat_participants(current_setting('test.dm_manager')::uuid);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_network_events(current_setting('test.dm_manager')::uuid);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_members(current_setting('test.dm_manager')::uuid,'00000000-0000-4000-8000-000000009202','add');assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_archive(current_setting('test.dm_manager')::uuid,true);assert false;exception when insufficient_privilege then null;end;
end $$;

-- Customers cannot open DMs or see internal ones.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009204',true);
do $$begin
 begin perform public.room_chat_direct('00000000-0000-4000-8000-000000009201');assert false;exception when insufficient_privilege then null;end;
 assert not exists(select 1 from jsonb_array_elements(public.room_chat_bootstrap()->'rooms') x where x->>'kind'='dm');
 begin perform public.room_chat_messages(current_setting('test.dm')::uuid);assert false;exception when insufficient_privilege then null;end;
end $$;

-- Demoting one side locks them out and leaves the other side read-only.
reset role;
update public.profiles set role='customer' where id='00000000-0000-4000-8000-000000009202';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009202',true);
do $$begin
 assert not exists(select 1 from jsonb_array_elements(public.room_chat_bootstrap()->'rooms') x where x->>'id'=current_setting('test.dm'));
 begin perform public.room_chat_messages(current_setting('test.dm')::uuid);assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_file_download(current_setting('test.dm')::uuid,current_setting('test.dm_file')::uuid);assert false;exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009201',true);
do $$begin
 assert jsonb_array_length(public.room_chat_messages(current_setting('test.dm')::uuid)->'messages')=3;
 assert public.room_chat_file_download(current_setting('test.dm')::uuid,current_setting('test.dm_file')::uuid)->>'sha256'=repeat('2',64);
 assert (select (x->>'read_only')::boolean from jsonb_array_elements(public.room_chat_bootstrap()->'rooms') x where x->>'id'=current_setting('test.dm'));
 begin perform public.room_chat_send(current_setting('test.dm')::uuid,gen_random_uuid(),'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Into a customer account"}]}]}');assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_edit(current_setting('test.dm')::uuid,current_setting('test.dm_message')::bigint,'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Edited"}]}]}');assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_file_reserve(current_setting('test.dm')::uuid,gen_random_uuid(),'late.png','image/png',64,repeat('4',64));assert false;exception when insufficient_privilege then null;end;
 begin perform public.room_chat_direct('00000000-0000-4000-8000-000000009202');assert false;exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.profiles set role='author' where id='00000000-0000-4000-8000-000000009202';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009201',true);
do $$begin
 assert not (select (x->>'read_only')::boolean from jsonb_array_elements(public.room_chat_bootstrap()->'rooms') x where x->>'id'=current_setting('test.dm'));
 assert public.room_chat_direct('00000000-0000-4000-8000-000000009202')->'room'->>'id'=current_setting('test.dm'),'A restored account keeps the same DM';
 perform public.room_chat_send(current_setting('test.dm')::uuid,gen_random_uuid(),'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Welcome back"}]}]}');
end $$;

-- New DMs have their own daily limit and do not use up room creation.
reset role;
insert into icue_rooms.rooms(name,kind,created_by) select 'Direct message','dm','00000000-0000-4000-8000-000000009203' from generate_series(1,30);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009203',true);
do $$begin
 begin perform public.room_chat_direct('00000000-0000-4000-8000-000000009202');assert false,'DM creation is limited per day';exception when program_limit_exceeded then null;end;
 assert public.room_chat_direct('00000000-0000-4000-8000-000000009201')->'room'->>'id'=current_setting('test.dm_manager'),'Existing DMs still open at the limit';
 perform public.room_chat_create_staff('Planning after DMs');
end $$;
rollback;
