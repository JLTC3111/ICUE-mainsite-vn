-- Named staff rooms use the same internal-role gate as Member commons.
-- Customers stay on explicit participant rooms.
begin;
alter table icue_rooms.rooms drop constraint rooms_kind_check;
alter table icue_rooms.rooms add constraint rooms_kind_check check (kind in ('members','customers','staff'));

create or replace function icue_rooms.authorize(p_room_id uuid,p_write boolean default false) returns void language plpgsql stable security definer set search_path='' as $$
declare a jsonb:=icue_rooms.account();begin
 if not exists(select 1 from icue_rooms.rooms r where r.id=p_room_id and (not p_write or not r.archived)
  and ((r.kind in ('members','staff') and a->>'role' in ('member','author','manager','admin','owner'))
    or (r.kind='customers' and exists(select 1 from icue_rooms.participants p where p.room_id=r.id and p.user_id=auth.uid()))))
 then raise insufficient_privilege using message='Room unavailable.';end if;
end $$;

create or replace function icue_rooms.bootstrap() returns jsonb language plpgsql security definer set search_path='' as $$
declare a jsonb:=icue_rooms.account();v jsonb;begin
 select coalesce(jsonb_agg(to_jsonb(r) order by r.updated_at desc,r.id),'[]'::jsonb) into v from icue_rooms.rooms r
 where (r.kind in ('members','staff') and a->>'role' in ('member','author','manager','admin','owner'))
 or (r.kind='customers' and exists(select 1 from icue_rooms.participants p where p.room_id=r.id and p.user_id=auth.uid()));
 return jsonb_build_object('account',a,'rooms',v,'can_manage',icue_rooms.can_manage());
end $$;

create or replace function icue_rooms.file_ready(p_id uuid,p_size integer,p_sha256 text) returns jsonb language plpgsql security definer set search_path='' as $$
declare f icue_rooms.files;begin
 select * into f from icue_rooms.files where id=p_id;
 if f.id is null then raise insufficient_privilege using message='File unavailable.';end if;
 perform 1 from icue_rooms.rooms where id=f.room_id for update;
 select * into f from icue_rooms.files where id=p_id for update;
 if f.id is null or p_size is null or p_sha256 is null or f.size<>p_size or f.sha256<>p_sha256 or f.created_at<=clock_timestamp()-interval '1 hour'
 or not exists(select 1 from auth.users u join public.profiles p on p.id=u.id join icue_rooms.rooms r on r.id=f.room_id
 where u.id=f.user_id and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and u.deleted_at is null
 and (u.banned_until is null or u.banned_until<=clock_timestamp()) and not r.archived
 and ((r.kind in ('members','staff') and p.role::text in ('member','author','manager','admin','owner'))
 or (r.kind='customers' and exists(select 1 from icue_rooms.participants x where x.room_id=r.id and x.user_id=u.id))))
 then raise insufficient_privilege using message='File unavailable or expired.';end if;
 update icue_rooms.files set state='ready' where id=p_id;
 return jsonb_build_object('id',f.id,'name',f.name,'mime',f.mime,'size',f.size,'sha256',f.sha256,'path',f.path,'status','ready');
end $$;

create or replace function icue_rooms.network_events(p_room_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform icue_rooms.authorize(p_room_id);
 if not icue_rooms.can_manage() then raise insufficient_privilege using message='Room manager required.';end if;
 return jsonb_build_object('events',coalesce((select jsonb_agg(to_jsonb(s)) from (select e.id,e.user_id,p.display_name,e.ip,e.source,e.vpn_status,e.proxy_status,e.provider,e.created_at
 from icue_rooms.network_events e join public.profiles p on p.id=e.user_id join icue_rooms.rooms r on r.id=p_room_id
 where e.created_at>clock_timestamp()-interval '7 days' and ((r.kind in ('members','staff') and p.role::text in ('member','author','manager','admin','owner'))
 or (r.kind='customers' and exists(select 1 from icue_rooms.participants x where x.room_id=r.id and x.user_id=e.user_id)))
 order by e.created_at desc,e.id desc limit 100)s),'[]'::jsonb));
end $$;

create function icue_rooms.create_staff_room(p_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;begin
 if not icue_rooms.can_manage() then raise insufficient_privilege using message='Room manager required.';end if;
 if p_name is null or char_length(btrim(p_name)) not between 1 and 100 or p_name ~ '[[:cntrl:]]'
 then raise invalid_parameter_value using message='Room name required.';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if (select count(*) from icue_rooms.rooms where created_by=auth.uid() and created_at>clock_timestamp()-interval '1 day')>=30
 then raise program_limit_exceeded using message='Room creation limit reached.';end if;
 insert into icue_rooms.rooms(name,kind,created_by) values(btrim(p_name),'staff',auth.uid()) returning id into v_id;
 return jsonb_build_object('room',(select to_jsonb(r) from icue_rooms.rooms r where id=v_id));
end $$;

create function public.room_chat_create_staff(p_name text) returns jsonb language sql security invoker set search_path='' as $$
 select icue_rooms.create_staff_room(p_name);
$$;
revoke all on function icue_rooms.create_staff_room(text) from public,anon,authenticated,service_role;
revoke all on function public.room_chat_create_staff(text) from public,anon,authenticated,service_role;
grant execute on function icue_rooms.create_staff_room(text),public.room_chat_create_staff(text) to authenticated;
commit;
