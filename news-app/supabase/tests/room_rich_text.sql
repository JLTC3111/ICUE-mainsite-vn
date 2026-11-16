begin;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000009301','rich-member@example.invalid');
update public.profiles set role='member' where id='00000000-0000-4000-8000-000000009301';

-- Accepted shapes: lists up to three levels, numbered start, palette colours and sizes.
do $$
declare
 p jsonb:='{"type":"paragraph","content":[{"type":"text","text":"Item"}]}';
 styled jsonb:='{"type":"paragraph","content":[{"type":"text","text":"Styled","marks":[{"type":"bold"},{"type":"italic"},{"type":"underline"},{"type":"strike"},{"type":"textStyle","attrs":{"color":"#b42318","fontSize":"22px"}}]}]}';
 deep jsonb;
begin
 deep:=jsonb_build_object('type','bulletList','content',jsonb_build_array(jsonb_build_object('type','listItem','content',jsonb_build_array(p))));
 deep:=jsonb_build_object('type','orderedList','attrs',jsonb_build_object('start',3),'content',jsonb_build_array(jsonb_build_object('type','listItem','content',jsonb_build_array(p,deep))));
 deep:=jsonb_build_object('type','bulletList','content',jsonb_build_array(jsonb_build_object('type','listItem','content',jsonb_build_array(p,deep))));
 assert icue_rooms.validate_document(jsonb_build_object('type','doc','content',jsonb_build_array(styled,deep)))>0;
 assert icue_rooms.validate_document('{"type":"doc","content":[{"type":"orderedList","attrs":{"start":1,"type":null},"content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Tiptap output"}]}]}]}]}')>0;
 assert icue_rooms.validate_document('{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Size only","marks":[{"type":"textStyle","attrs":{"color":null,"fontSize":"11px"}}]}]}]}')>0;
 assert icue_rooms.validate_document('{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Plain"}]},{"type":"sticker","attrs":{"name":"wave"}}]}')>0,'Existing documents stay valid';
end $$;

-- Rejected shapes: anything outside the palette, the list grammar or three levels.
do $$
declare
 bad jsonb;
 cases jsonb:=jsonb_build_array(
  '{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"textStyle","attrs":{"color":"#000000"}}]}]}',
  '{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"textStyle","attrs":{"color":"red; background:url(https://example.invalid)"}}]}]}',
  '{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"textStyle","attrs":{"fontSize":"99px"}}]}]}',
  '{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"textStyle","attrs":{"color":"#b42318","fontFamily":"Comic Sans"}}]}]}',
  '{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"textStyle","attrs":{"color":null,"fontSize":null}}]}]}',
  '{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"textStyle","attrs":{"color":7}}]}]}',
  '{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"bold"},{"type":"bold"}]}]}',
  '{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"bold","attrs":{"x":1}}]}]}',
  '{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}]}',
  '{"type":"heading","content":[{"type":"text","text":"x"}]}',
  '{"type":"bulletList","content":[]}',
  '{"type":"bulletList","attrs":{"start":2},"content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}',
  '{"type":"bulletList","content":[{"type":"paragraph","content":[{"type":"text","text":"not an item"}]}]}',
  '{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"sticker","attrs":{"name":"wave"}}]}]}',
  '{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}]}]}',
  '{"type":"orderedList","attrs":{"type":"a"},"content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}',
  '{"type":"orderedList","attrs":{"start":0},"content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}',
  '{"type":"orderedList","attrs":{"start":"3"},"content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}',
  '{"type":"orderedList","attrs":{"start":2.5},"content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}',
  '{"type":"listItem","content":[{"type":"paragraph"}]}',
  '{"type":"paragraph","content":[{"type":"paragraph"}]}'
 );
 p jsonb:='{"type":"paragraph","content":[{"type":"text","text":"Item"}]}';
 tooDeep jsonb;
begin
 for bad in select value from jsonb_array_elements(cases) loop
  begin perform icue_rooms.validate_document(jsonb_build_object('type','doc','content',jsonb_build_array(bad)));assert false,'Accepted '||bad::text;
  exception when invalid_parameter_value then null;end;
 end loop;
 tooDeep:=jsonb_build_object('type','bulletList','content',jsonb_build_array(jsonb_build_object('type','listItem','content',jsonb_build_array(p))));
 for i in 1..3 loop
  tooDeep:=jsonb_build_object('type','bulletList','content',jsonb_build_array(jsonb_build_object('type','listItem','content',jsonb_build_array(p,tooDeep))));
 end loop;
 begin perform icue_rooms.validate_document(jsonb_build_object('type','doc','content',jsonb_build_array(tooDeep)));assert false,'Four list levels';
 exception when invalid_parameter_value then null;end;
 begin perform icue_rooms.validate_document(jsonb_build_object('type','doc','content',jsonb_build_array(jsonb_build_object('type','paragraph','content',jsonb_build_array(jsonb_build_object('type','text','text',repeat('x',4001)))))));assert false;
 exception when invalid_parameter_value then null;end;
 select jsonb_agg(jsonb_build_object('type','listItem','content',jsonb_build_array(p))) into bad from generate_series(1,101);
 begin perform icue_rooms.validate_document(jsonb_build_object('type','doc','content',jsonb_build_array(jsonb_build_object('type','bulletList','content',bad))));assert false,'List item limit';
 exception when invalid_parameter_value then null;end;
end $$;

-- A formatted message round-trips through send and read unchanged.
select set_config('test.members_room',(select id::text from icue_rooms.rooms where kind='members'),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000009301',true);
do $$declare doc jsonb:='{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Agenda","marks":[{"type":"bold"},{"type":"textStyle","attrs":{"color":"#175cd3"}}]}]},{"type":"orderedList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Budget"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Q4","marks":[{"type":"textStyle","attrs":{"fontSize":"17px"}}]}]}]}]}]}]}]}';
 room uuid:=current_setting('test.members_room')::uuid;s jsonb;
begin
 s:=public.room_chat_send(room,'00000000-0000-4000-8000-000000009311',doc);
 assert s->'message'->'document'=doc;
 assert (public.room_chat_messages(room)->'messages'->-1->'document')=doc;
 begin perform public.room_chat_send(room,gen_random_uuid(),'{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"textStyle","attrs":{"color":"#123456"}}]}]}]}');assert false;
 exception when invalid_parameter_value then null;end;
 perform public.room_chat_edit(room,(s->'message'->>'id')::bigint,'{"type":"doc","content":[{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Edited list"}]}]}]}]}');
end $$;
rollback;
