begin;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000009401','alias-member@example.invalid'),
 ('00000000-0000-4000-8000-000000009402','alias-author@example.invalid'),
 ('00000000-0000-4000-8000-000000009403','alias-customer@example.invalid'),
 ('00000000-0000-4000-8000-000000009404','alias-manager@example.invalid');
update public.profiles set role='member',full_name='Alice Nguyen',display_name='Alice' where id='00000000-0000-4000-8000-000000009401';
update public.profiles set role='author',full_name='Bao Tran',display_name='Bao' where id='00000000-0000-4000-8000-000000009402';
update public.profiles set role='manager',full_name='Dung Le',display_name='Dung' where id='00000000-0000-4000-8000-000000009404';
select set_config('test.members_room',(select id::text from icue_rooms.rooms where kind='members'),true);
do $$begin
 assert not has_table_privilege('authenticated','icue_rooms.aliases','select');
 assert not has_table_privilege('authenticated','icue_rooms.aliases','update');
 assert not has_function_privilege('anon','public.room_chat_set_alias(text)','execute');
 assert has_function_privilege('authenticated','public.room_chat_set_alias(text)','execute');
 assert not has_function_privilege('authenticated','icue_rooms.alias_of(uuid)','execute');
 assert not has_function_privilege('authenticated','icue_rooms.alias_state(uuid)','execute');
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009401',true);
do $$declare s jsonb;begin
 assert public.room_chat_bootstrap()->'alias'->>'alias' is null,'No alias yet';
 assert public.room_chat_set_alias('')->>'alias' is null,'Clearing an absent alias is a no-op';
 begin perform public.room_chat_set_alias('A');assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_set_alias(repeat('x',41));assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_set_alias(E'Tab\tname');assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_set_alias('Two  spaces');assert false;exception when invalid_parameter_value then null;end;
 begin perform public.room_chat_set_alias('bao tran');assert false,'Cannot impersonate a colleague full name';exception when unique_violation then null;end;
 begin perform public.room_chat_set_alias('DUNG');assert false,'Cannot impersonate a colleague display name';exception when unique_violation then null;end;
 s:=public.room_chat_set_alias('  Night Owl  ');
 assert s->>'alias'='Night Owl' and (s->>'next_change_at')::timestamptz>clock_timestamp()+interval '29 days';
 assert public.room_chat_set_alias('Night Owl')->>'alias'='Night Owl','Saving the same alias does not use the change';
 begin perform public.room_chat_set_alias('Early Bird');assert false,'One change per 30 days';exception when program_limit_exceeded then null;end;
 begin perform public.room_chat_set_alias('');assert false,'Clearing also waits';exception when program_limit_exceeded then null;end;
 assert public.room_chat_bootstrap()->'alias'->>'alias'='Night Owl';
 perform public.room_chat_send(current_setting('test.members_room')::uuid,'00000000-0000-4000-8000-000000009411','{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}');
end $$;

-- Colleagues see the alias with the real name; nobody else can take it.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009402',true);
do $$declare m jsonb;d jsonb;r jsonb;begin
 m:=public.room_chat_messages(current_setting('test.members_room')::uuid)->'messages'->-1;
 assert m->>'alias'='Night Owl' and m->>'full_name'='Alice Nguyen' and m->>'display_name'='Alice';
 select x into d from jsonb_array_elements(public.room_chat_presence('available')->'members') x where x->>'id'='00000000-0000-4000-8000-000000009401';
 assert d->>'alias'='Night Owl' and d->>'full_name'='Alice Nguyen';
 r:=public.room_chat_direct('00000000-0000-4000-8000-000000009401')->'room';
 assert r->'peer'->>'alias'='Night Owl' and r->'peer'->>'full_name'='Alice Nguyen';
 begin perform public.room_chat_set_alias('night owl');assert false,'Aliases are unique ignoring case';exception when unique_violation then null;end;
 begin perform public.room_chat_set_alias('alice nguyen');assert false;exception when unique_violation then null;end;
 assert public.room_chat_set_alias('Ink')->>'alias'='Ink';
end $$;

-- Customers cannot set an alias.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009403',true);
do $$begin
 begin perform public.room_chat_set_alias('Inside Job');assert false;exception when insufficient_privilege then null;end;
 assert public.room_chat_bootstrap()->'alias' is null or jsonb_typeof(public.room_chat_bootstrap()->'alias')='null';
end $$;

-- After 30 days the alias can change or be cleared; a demoted account's alias disappears.
reset role;
update icue_rooms.aliases set changed_at=clock_timestamp()-interval '31 days' where user_id='00000000-0000-4000-8000-000000009401';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009401',true);
do $$begin
 assert public.room_chat_set_alias('Early Bird')->>'alias'='Early Bird';
end $$;
reset role;
update public.profiles set role='customer' where id='00000000-0000-4000-8000-000000009402';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009401',true);
do $$begin
 assert not exists(select 1 from jsonb_array_elements(public.room_chat_presence('available')->'members') x where x->>'alias'='Ink');
end $$;
rollback;
