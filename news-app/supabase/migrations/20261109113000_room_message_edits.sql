-- Senders can revise a message for 48 hours and erase it, or one file, for 24 hours.
-- Erased text is overwritten. The row remains so the conversation can show a notice.
begin;

alter table icue_rooms.messages
 add column edited_at timestamptz,
 add column deleted_at timestamptz;

create or replace function icue_rooms.message_json(p_id bigint) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'client_id',m.client_id,'user_id',m.user_id,'display_name',p.display_name,
 'document',case when m.deleted_at is null then m.document else '{"type":"doc","content":[]}'::jsonb end,
 'created_at',m.created_at,'edited_at',m.edited_at,'deleted_at',m.deleted_at,
 'files',case when m.deleted_at is null then coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'name',f.name,'mime',f.mime,'size',f.size) order by f.created_at,f.id) from icue_rooms.files f where f.message_id=m.id and f.state='ready'),'[]'::jsonb) else '[]'::jsonb end)
 from icue_rooms.messages m join public.profiles p on p.id=m.user_id where m.id=p_id;
$$;

create function icue_rooms.edit_message(p_room_id uuid,p_message_id bigint,p_document jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare m icue_rooms.messages;begin
 perform icue_rooms.authorize(p_room_id,true);
 if p_message_id is null then raise invalid_parameter_value using message='Invalid message.';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 perform 1 from icue_rooms.rooms where id=p_room_id for update;
 perform icue_rooms.authorize(p_room_id,true);
 select * into m from icue_rooms.messages where id=p_message_id and room_id=p_room_id for update;
 if m.id is null or m.user_id is distinct from auth.uid() then raise insufficient_privilege using message='Message unavailable.';end if;
 if m.deleted_at is not null then raise invalid_parameter_value using message='Message unavailable.';end if;
 if m.created_at<=clock_timestamp()-interval '48 hours' then raise invalid_parameter_value using message='The time limit for this change has passed.';end if;
 if m.document=p_document then return jsonb_build_object('message',icue_rooms.message_json(m.id));end if;
 if icue_rooms.validate_document(p_document)=0 then raise invalid_parameter_value using message='Message is empty.';end if;
 update icue_rooms.messages set document=p_document,edited_at=clock_timestamp() where id=m.id;
 return jsonb_build_object('message',icue_rooms.message_json(m.id));
end $$;

create function icue_rooms.delete_message(p_room_id uuid,p_message_id bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare m icue_rooms.messages;begin
 perform icue_rooms.authorize(p_room_id,true);
 if p_message_id is null then raise invalid_parameter_value using message='Invalid message.';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 perform 1 from icue_rooms.rooms where id=p_room_id for update;
 perform icue_rooms.authorize(p_room_id,true);
 select * into m from icue_rooms.messages where id=p_message_id and room_id=p_room_id for update;
 if m.id is null or m.user_id is distinct from auth.uid() then raise insufficient_privilege using message='Message unavailable.';end if;
 if m.deleted_at is not null then return jsonb_build_object('message',icue_rooms.message_json(m.id));end if;
 if m.created_at<=clock_timestamp()-interval '24 hours' then raise invalid_parameter_value using message='The time limit for this change has passed.';end if;
 update icue_rooms.messages set document='{"type":"doc","content":[]}'::jsonb,deleted_at=clock_timestamp(),edited_at=null where id=m.id;
 delete from icue_rooms.files where message_id=m.id;
 return jsonb_build_object('message',icue_rooms.message_json(m.id));
end $$;

create function icue_rooms.delete_message_file(p_room_id uuid,p_file uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare f icue_rooms.files;m icue_rooms.messages;begin
 perform icue_rooms.authorize(p_room_id,true);
 if p_file is null then raise invalid_parameter_value using message='Invalid file.';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 perform 1 from icue_rooms.rooms where id=p_room_id for update;
 perform icue_rooms.authorize(p_room_id,true);
 select * into f from icue_rooms.files where id=p_file and room_id=p_room_id;
 if f.id is null or f.message_id is null or f.user_id is distinct from auth.uid() then raise insufficient_privilege using message='File unavailable.';end if;
 select * into m from icue_rooms.messages where id=f.message_id and room_id=p_room_id for update;
 select * into f from icue_rooms.files where id=p_file and room_id=p_room_id and message_id=m.id for update;
 if m.id is null or m.user_id is distinct from auth.uid() or f.id is null then raise insufficient_privilege using message='File unavailable.';end if;
 if m.deleted_at is not null then return jsonb_build_object('message',icue_rooms.message_json(m.id));end if;
 if m.created_at<=clock_timestamp()-interval '24 hours' then raise invalid_parameter_value using message='The time limit for this change has passed.';end if;
 delete from icue_rooms.files where id=f.id;
 if icue_rooms.validate_document(m.document)=0 and not exists(select 1 from icue_rooms.files where message_id=m.id) then
  update icue_rooms.messages set document='{"type":"doc","content":[]}'::jsonb,deleted_at=clock_timestamp(),edited_at=null where id=m.id;
 end if;
 return jsonb_build_object('message',icue_rooms.message_json(m.id));
end $$;

create function public.room_chat_edit(p_room_id uuid,p_message_id bigint,p_document jsonb) returns jsonb language sql security invoker set search_path='' as $$
 select icue_rooms.edit_message(p_room_id,p_message_id,p_document);
$$;
create function public.room_chat_delete(p_room_id uuid,p_message_id bigint) returns jsonb language sql security invoker set search_path='' as $$
 select icue_rooms.delete_message(p_room_id,p_message_id);
$$;
create function public.room_chat_delete_file(p_room_id uuid,p_file uuid) returns jsonb language sql security invoker set search_path='' as $$
 select icue_rooms.delete_message_file(p_room_id,p_file);
$$;

revoke all on function icue_rooms.edit_message(uuid,bigint,jsonb) from public,anon,authenticated,service_role;
revoke all on function icue_rooms.delete_message(uuid,bigint) from public,anon,authenticated,service_role;
revoke all on function icue_rooms.delete_message_file(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.room_chat_edit(uuid,bigint,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.room_chat_delete(uuid,bigint) from public,anon,authenticated,service_role;
revoke all on function public.room_chat_delete_file(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function icue_rooms.edit_message(uuid,bigint,jsonb),public.room_chat_edit(uuid,bigint,jsonb) to authenticated;
grant execute on function icue_rooms.delete_message(uuid,bigint),public.room_chat_delete(uuid,bigint) to authenticated;
grant execute on function icue_rooms.delete_message_file(uuid,uuid),public.room_chat_delete_file(uuid,uuid) to authenticated;

commit;
