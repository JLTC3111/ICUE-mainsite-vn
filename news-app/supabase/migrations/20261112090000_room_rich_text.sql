-- Chat messages may contain bullet and numbered lists (three levels) and text
-- colour/size from a fixed palette. Colours and sizes must match roomDocument.js.
begin;
create or replace function icue_rooms.validate_document(d jsonb) returns integer language plpgsql immutable set search_path='' as $$
declare
 v_colors constant text[]:=array['#b42318','#c4320a','#a15c07','#067647','#175cd3','#6927da','#c11574','#475467'];
 v_sizes constant text[]:=array['11px','17px','22px'];
 v_stack jsonb;e jsonb;n jsonb;p text;l integer;t jsonb;m jsonb;a jsonb;v_types text[];
 v_size integer:=0;v_chars integer:=0;v_nodes integer:=0;v_blocks integer:=0;
begin
 if jsonb_typeof(d) is distinct from 'object' or d->>'type' is distinct from 'doc' or d-array['type','content']<>'{}'::jsonb
 or jsonb_typeof(d->'content') is distinct from 'array' or octet_length(d::text)>64000 or jsonb_array_length(d->'content')>100
 then raise invalid_parameter_value using message='Unsupported message document.';end if;
 select coalesce(jsonb_agg(jsonb_build_object('n',value,'p','doc','l',0)),'[]'::jsonb) into v_stack from jsonb_array_elements(d->'content');
 while jsonb_array_length(v_stack)>0 loop
  e:=v_stack->(jsonb_array_length(v_stack)-1);v_stack:=v_stack-(jsonb_array_length(v_stack)-1);
  n:=e->'n';p:=e->>'p';l:=(e->>'l')::integer;
  v_blocks:=v_blocks+1;
  if v_blocks>500 or jsonb_typeof(n) is distinct from 'object' then raise invalid_parameter_value using message='Unsupported message node.';end if;
  if n->>'type'='sticker' and p='doc' then
   if n-array['type','attrs']<>'{}'::jsonb or jsonb_typeof(n->'attrs') is distinct from 'object'
    or (n->'attrs')-'name'<>'{}'::jsonb or (n->'attrs'->>'name') is null or n->'attrs'->>'name' not in ('wave','celebrate','heart')
   then raise invalid_parameter_value using message='Unsupported sticker.';end if;
   v_size:=v_size+1;
  elsif n->>'type'='paragraph' and p in ('doc','listItem') then
   if n-array['type','content']<>'{}'::jsonb or (n ? 'content' and jsonb_typeof(n->'content') is distinct from 'array')
   then raise invalid_parameter_value using message='Unsupported paragraph.';end if;
   for t in select value from jsonb_array_elements(coalesce(n->'content','[]'::jsonb)) loop
    v_nodes:=v_nodes+1;
    if v_nodes>1000 or jsonb_typeof(t) is distinct from 'object' or t->>'type' is distinct from 'text'
     or t-array['type','text','marks']<>'{}'::jsonb or jsonb_typeof(t->'text') is distinct from 'string'
     or (t ? 'marks' and jsonb_typeof(t->'marks') is distinct from 'array')
    then raise invalid_parameter_value using message='Unsupported text.';end if;
    v_size:=v_size+char_length(btrim(t->>'text'));
    v_chars:=v_chars+char_length(t->>'text');
    if jsonb_array_length(coalesce(t->'marks','[]'::jsonb))>5 then raise invalid_parameter_value using message='Too many text marks.';end if;
    v_types:='{}';
    for m in select value from jsonb_array_elements(coalesce(t->'marks','[]'::jsonb)) loop
     if jsonb_typeof(m) is distinct from 'object' or m->>'type' is null or m->>'type'=any(v_types)
     then raise invalid_parameter_value using message='Unsupported text mark.';end if;
     v_types:=v_types||(m->>'type');
     if m->>'type' in ('bold','italic','underline','strike') then
      if m-'type'<>'{}'::jsonb then raise invalid_parameter_value using message='Unsupported text mark.';end if;
     elsif m->>'type'='textStyle' then
      a:=m->'attrs';
      if m-array['type','attrs']<>'{}'::jsonb or jsonb_typeof(a) is distinct from 'object' or a-array['color','fontSize']<>'{}'::jsonb
       or (a ? 'color' and jsonb_typeof(a->'color')<>'null' and (jsonb_typeof(a->'color')<>'string' or not (a->>'color'=any(v_colors))))
       or (a ? 'fontSize' and jsonb_typeof(a->'fontSize')<>'null' and (jsonb_typeof(a->'fontSize')<>'string' or not (a->>'fontSize'=any(v_sizes))))
       or coalesce(a->>'color',a->>'fontSize') is null
      then raise invalid_parameter_value using message='Unsupported text style.';end if;
     else raise invalid_parameter_value using message='Unsupported text mark.';
     end if;
    end loop;
   end loop;
  elsif n->>'type' in ('bulletList','orderedList') and p in ('doc','listItem') then
   if l>=3 then raise invalid_parameter_value using message='Lists are nested too deeply.';end if;
   if n-array['type','content','attrs']<>'{}'::jsonb or jsonb_typeof(n->'content') is distinct from 'array'
    or jsonb_array_length(n->'content') not between 1 and 100
    or (n ? 'attrs' and (n->>'type'='bulletList' or jsonb_typeof(n->'attrs') is distinct from 'object'
     or (n->'attrs')-array['start','type']<>'{}'::jsonb
     or (n->'attrs' ? 'type' and jsonb_typeof(n->'attrs'->'type') is distinct from 'null')
     or (n->'attrs' ? 'start' and (jsonb_typeof(n->'attrs'->'start') is distinct from 'number'
      or (n->'attrs'->>'start') !~ '^[0-9]{1,4}$' or (n->'attrs'->>'start')::integer<1))))
   then raise invalid_parameter_value using message='Unsupported list.';end if;
   v_stack:=v_stack||(select jsonb_agg(jsonb_build_object('n',value,'p','list','l',l+1)) from jsonb_array_elements(n->'content'));
  elsif n->>'type'='listItem' and p='list' then
   if n-array['type','content']<>'{}'::jsonb or jsonb_typeof(n->'content') is distinct from 'array'
    or jsonb_array_length(n->'content') not between 1 and 50 or n->'content'->0->>'type' is distinct from 'paragraph'
   then raise invalid_parameter_value using message='Unsupported list item.';end if;
   v_stack:=v_stack||(select jsonb_agg(jsonb_build_object('n',value,'p','listItem','l',l)) from jsonb_array_elements(n->'content'));
  else raise invalid_parameter_value using message='Unsupported message node.';
  end if;
 end loop;
 if v_chars>4000 then raise invalid_parameter_value using message='Message too long.';end if;
 return v_size;
end $$;
revoke all on function icue_rooms.validate_document(jsonb) from public,anon,authenticated,service_role;
commit;
