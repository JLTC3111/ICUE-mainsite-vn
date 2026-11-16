-- One-to-one direct messages between internal accounts. Only the two participants
-- can read a DM; it turns read-only once either side stops being an active internal account.
begin;
alter table icue_rooms.rooms drop constraint rooms_kind_check;
alter table icue_rooms.rooms add constraint rooms_kind_check check (kind in ('members','customers','staff','dm'));

create table icue_rooms.direct_rooms(
 room_id uuid primary key references icue_rooms.rooms(id) on delete cascade,
 user_low uuid not null references auth.users(id) on delete cascade,
 user_high uuid not null references auth.users(id) on delete cascade,
 check(user_low<user_high),unique(user_low,user_high)
);
create index room_direct_high_idx on icue_rooms.direct_rooms(user_high);
alter table icue_rooms.direct_rooms enable row level security;
revoke all on icue_rooms.direct_rooms from public,anon,authenticated;

create function icue_rooms.active_internal(p_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_user_id
  and p.role::text in ('member','author','manager','admin','owner')
  and not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null and u.deleted_at is null
  and (u.banned_until is null or u.banned_until<=clock_timestamp()));
$$;

create function icue_rooms.direct_writable(p_room_id uuid,p_user_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select icue_rooms.active_internal(p_user_id)
  and exists(select 1 from icue_rooms.participants where room_id=p_room_id and user_id=p_user_id)
  and exists(select 1 from icue_rooms.participants x where x.room_id=p_room_id and x.user_id<>p_user_id and icue_rooms.active_internal(x.user_id));
$$;

create or replace function icue_rooms.authorize(p_room_id uuid,p_write boolean default false) returns void language plpgsql stable security definer set search_path='' as $$
declare a jsonb:=icue_rooms.account();begin
 if not exists(select 1 from icue_rooms.rooms r where r.id=p_room_id and (not p_write or not r.archived)
  and ((r.kind in ('members','staff') and a->>'role' in ('member','author','manager','admin','owner'))
    or (r.kind='customers' and exists(select 1 from icue_rooms.participants p where p.room_id=r.id and p.user_id=auth.uid()))
    or (r.kind='dm' and a->>'role' in ('member','author','manager','admin','owner')
      and exists(select 1 from icue_rooms.participants p where p.room_id=r.id and p.user_id=auth.uid())
      and (not p_write or icue_rooms.direct_writable(r.id,auth.uid())))))
 then raise insufficient_privilege using message='Room unavailable.';end if;
end $$;

create function icue_rooms.room_json(p_room_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(r) || case when r.kind='dm' then jsonb_build_object(
  'peer',(select jsonb_strip_nulls(jsonb_build_object('id',p.id,'display_name',p.display_name,'full_name',nullif(trim(p.full_name),''),'email',nullif(trim(u.email),'')))
   from icue_rooms.participants x join public.profiles p on p.id=x.user_id join auth.users u on u.id=p.id
   where x.room_id=r.id and x.user_id<>auth.uid() limit 1),
  'read_only',not icue_rooms.direct_writable(r.id,auth.uid())) else '{}'::jsonb end
 from icue_rooms.rooms r where r.id=p_room_id;
$$;

create or replace function icue_rooms.bootstrap() returns jsonb language plpgsql security definer set search_path='' as $$
declare a jsonb:=icue_rooms.account();v jsonb;begin
 select coalesce(jsonb_agg(icue_rooms.room_json(r.id) order by r.updated_at desc,r.id),'[]'::jsonb) into v from icue_rooms.rooms r
 where (r.kind in ('members','staff') and a->>'role' in ('member','author','manager','admin','owner'))
 or (r.kind='customers' and exists(select 1 from icue_rooms.participants p where p.room_id=r.id and p.user_id=auth.uid()))
 or (r.kind='dm' and a->>'role' in ('member','author','manager','admin','owner')
  and exists(select 1 from icue_rooms.participants p where p.room_id=r.id and p.user_id=auth.uid()));
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
 or (r.kind='customers' and exists(select 1 from icue_rooms.participants x where x.room_id=r.id and x.user_id=u.id))
 or (r.kind='dm' and icue_rooms.direct_writable(r.id,u.id))))
 then raise insufficient_privilege using message='File unavailable or expired.';end if;
 update icue_rooms.files set state='ready' where id=p_id;
 return jsonb_build_object('id',f.id,'name',f.name,'mime',f.mime,'size',f.size,'sha256',f.sha256,'path',f.path,'status','ready');
end $$;

-- Managers never see a DM's participants or network records, even when they are in it.
create or replace function icue_rooms.participant_list(p_room_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform icue_rooms.authorize(p_room_id);
 if not icue_rooms.can_manage() or exists(select 1 from icue_rooms.rooms where id=p_room_id and kind='dm')
 then raise insufficient_privilege using message='Room manager required.';end if;
 return jsonb_build_object('participants',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name,'role',p.role) order by p.display_name,p.id)
 from icue_rooms.participants x join public.profiles p on p.id=x.user_id where x.room_id=p_room_id),'[]'::jsonb));
end $$;

create or replace function icue_rooms.network_events(p_room_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform icue_rooms.authorize(p_room_id);
 if not icue_rooms.can_manage() or exists(select 1 from icue_rooms.rooms where id=p_room_id and kind='dm')
 then raise insufficient_privilege using message='Room manager required.';end if;
 return jsonb_build_object('events',coalesce((select jsonb_agg(to_jsonb(s)) from (select e.id,e.user_id,p.display_name,e.ip,e.source,e.vpn_status,e.proxy_status,e.provider,e.created_at
 from icue_rooms.network_events e join public.profiles p on p.id=e.user_id join icue_rooms.rooms r on r.id=p_room_id
 where e.created_at>clock_timestamp()-interval '7 days' and ((r.kind in ('members','staff') and p.role::text in ('member','author','manager','admin','owner'))
 or (r.kind='customers' and exists(select 1 from icue_rooms.participants x where x.room_id=r.id and x.user_id=e.user_id)))
 order by e.created_at desc,e.id desc limit 100)s),'[]'::jsonb));
end $$;

create or replace function icue_rooms.create_room(p_name text,p_customer_ids uuid[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;begin
 if not icue_rooms.can_manage() then raise insufficient_privilege using message='Room manager required.';end if;
 if p_name is null or char_length(btrim(p_name)) not between 1 and 100 or p_name ~ '[[:cntrl:]]'
 or p_customer_ids is null or cardinality(p_customer_ids) not between 1 and 50 or array_position(p_customer_ids,null) is not null
 or (select count(distinct x) from unnest(p_customer_ids)x)<>cardinality(p_customer_ids)
 then raise invalid_parameter_value using message='Room name and 1–50 customers required.';end if;
 if (select count(*) from public.profiles p join auth.users u on u.id=p.id where p.id=any(p_customer_ids) and p.role::text='customer'
 and not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp()))<>cardinality(p_customer_ids)
 then raise insufficient_privilege using message='Customer unavailable.';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if (select count(*) from icue_rooms.rooms where created_by=auth.uid() and kind<>'dm' and created_at>clock_timestamp()-interval '1 day')>=30
 then raise program_limit_exceeded using message='Room creation limit reached.';end if;
 insert into icue_rooms.rooms(name,kind,created_by) values(btrim(p_name),'customers',auth.uid()) returning id into v_id;
 insert into icue_rooms.participants(room_id,user_id) select v_id,x from unnest(array_append(p_customer_ids,auth.uid()))x;
 return jsonb_build_object('room',(select to_jsonb(r) from icue_rooms.rooms r where id=v_id));
end $$;

create or replace function icue_rooms.create_staff_room(p_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;begin
 if not icue_rooms.can_manage() then raise insufficient_privilege using message='Room manager required.';end if;
 if p_name is null or char_length(btrim(p_name)) not between 1 and 100 or p_name ~ '[[:cntrl:]]'
 then raise invalid_parameter_value using message='Room name required.';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if (select count(*) from icue_rooms.rooms where created_by=auth.uid() and kind<>'dm' and created_at>clock_timestamp()-interval '1 day')>=30
 then raise program_limit_exceeded using message='Room creation limit reached.';end if;
 insert into icue_rooms.rooms(name,kind,created_by) values(btrim(p_name),'staff',auth.uid()) returning id into v_id;
 return jsonb_build_object('room',(select to_jsonb(r) from icue_rooms.rooms r where id=v_id));
end $$;

-- Both account rows are locked in id order, so concurrent opens of the same pair serialize.
create function icue_rooms.open_direct(p_user_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a jsonb:=icue_rooms.account();v_low uuid;v_high uuid;v_id uuid;begin
 if a->>'role' not in ('member','author','manager','admin','owner') then raise insufficient_privilege using message='Chat membership required.';end if;
 if p_user_id is null or p_user_id=auth.uid() then raise invalid_parameter_value using message='Choose another account.';end if;
 v_low:=least(auth.uid(),p_user_id);v_high:=greatest(auth.uid(),p_user_id);
 perform 1 from public.profiles where id=v_low for update;
 perform 1 from public.profiles where id=v_high for update;
 if not icue_rooms.active_internal(auth.uid()) or not icue_rooms.active_internal(p_user_id)
 then raise insufficient_privilege using message='Account unavailable.';end if;
 select room_id into v_id from icue_rooms.direct_rooms where user_low=v_low and user_high=v_high;
 if v_id is null then
  if (select count(*) from icue_rooms.rooms where created_by=auth.uid() and kind='dm' and created_at>clock_timestamp()-interval '1 day')>=30
  then raise program_limit_exceeded using message='Direct message limit reached.';end if;
  insert into icue_rooms.rooms(name,kind,created_by) values('Direct message','dm',auth.uid()) returning id into v_id;
  insert into icue_rooms.direct_rooms(room_id,user_low,user_high) values(v_id,v_low,v_high);
  insert into icue_rooms.participants(room_id,user_id) values(v_id,v_low),(v_id,v_high);
 end if;
 return jsonb_build_object('room',icue_rooms.room_json(v_id));
end $$;

create function public.room_chat_direct(p_user_id uuid) returns jsonb language sql security invoker set search_path='' as $$
 select icue_rooms.open_direct(p_user_id);
$$;

revoke all on function icue_rooms.active_internal(uuid),icue_rooms.direct_writable(uuid,uuid),icue_rooms.room_json(uuid) from public,anon,authenticated,service_role;
revoke all on function icue_rooms.open_direct(uuid) from public,anon,authenticated,service_role;
revoke all on function public.room_chat_direct(uuid) from public,anon,authenticated,service_role;
grant execute on function icue_rooms.open_direct(uuid),public.room_chat_direct(uuid) to authenticated;
commit;
