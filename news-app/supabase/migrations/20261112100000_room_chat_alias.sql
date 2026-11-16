-- Internal accounts can show a chat alias, changeable once every 30 days. The
-- real name stays visible beside it, and the newsroom display name is untouched.
begin;
create table icue_rooms.aliases(
 user_id uuid primary key references auth.users(id) on delete cascade,
 alias text check(alias is null or (char_length(alias) between 2 and 40 and alias=btrim(alias) and alias !~ '[[:cntrl:]]' and alias !~ '\s{2,}')),
 changed_at timestamptz not null default clock_timestamp()
);
create unique index room_alias_unique on icue_rooms.aliases(lower(alias)) where alias is not null;
alter table icue_rooms.aliases enable row level security;
revoke all on icue_rooms.aliases from public,anon,authenticated;

-- Only current internal accounts show an alias.
create function icue_rooms.alias_of(p_user_id uuid) returns text language sql stable security definer set search_path='' as $$
 select a.alias from icue_rooms.aliases a where a.user_id=p_user_id and icue_rooms.active_internal(p_user_id);
$$;

create function icue_rooms.alias_state(p_user_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('alias',a.alias,'changed_at',a.changed_at,'next_change_at',a.changed_at+interval '30 days')
  from icue_rooms.aliases a where a.user_id=p_user_id),jsonb_build_object('alias',null,'changed_at',null,'next_change_at',null));
$$;

create function icue_rooms.set_alias(p_alias text) returns jsonb language plpgsql security definer set search_path='' as $$
declare a jsonb:=icue_rooms.account();v text:=nullif(btrim(coalesce(p_alias,'')),'');r icue_rooms.aliases;begin
 if a->>'role' not in ('member','author','manager','admin','owner') then raise insufficient_privilege using message='Chat membership required.';end if;
 if v is not null and (char_length(v) not between 2 and 40 or v ~ '[[:cntrl:]]' or v ~ '\s{2,}')
 then raise invalid_parameter_value using message='Alias must be 2–40 characters.';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 select * into r from icue_rooms.aliases where user_id=auth.uid();
 if r.alias is not distinct from v then return icue_rooms.alias_state(auth.uid());end if;
 if r.changed_at>clock_timestamp()-interval '30 days' then raise program_limit_exceeded using message='The alias can change once every 30 days.';end if;
 if v is not null and (exists(select 1 from icue_rooms.aliases x where x.user_id<>auth.uid() and lower(x.alias)=lower(v))
  or exists(select 1 from public.profiles p where p.id<>auth.uid() and p.role::text in ('member','author','manager','admin','owner')
   and (lower(btrim(p.display_name))=lower(v) or lower(btrim(p.full_name))=lower(v))))
 then raise unique_violation using message='This alias is already in use.';end if;
 insert into icue_rooms.aliases(user_id,alias,changed_at) values(auth.uid(),v,clock_timestamp())
 on conflict(user_id) do update set alias=excluded.alias,changed_at=excluded.changed_at;
 return icue_rooms.alias_state(auth.uid());
end $$;

create function public.room_chat_set_alias(p_alias text) returns jsonb language sql security invoker set search_path='' as $$
 select icue_rooms.set_alias(p_alias);
$$;

-- The real full name accompanies an alias so colleagues can always tell who it is.
create or replace function icue_rooms.message_json(p_id bigint) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'client_id',m.client_id,'user_id',m.user_id,'display_name',p.display_name,
 'alias',icue_rooms.alias_of(m.user_id),'full_name',case when icue_rooms.alias_of(m.user_id) is not null then nullif(trim(p.full_name),'') end,
 'document',case when m.deleted_at is null then m.document else '{"type":"doc","content":[]}'::jsonb end,
 'created_at',m.created_at,'edited_at',m.edited_at,'deleted_at',m.deleted_at,
 'files',case when m.deleted_at is null then coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'name',f.name,'mime',f.mime,'size',f.size) order by f.created_at,f.id) from icue_rooms.files f where f.message_id=m.id and f.state='ready'),'[]'::jsonb) else '[]'::jsonb end)
 from icue_rooms.messages m join public.profiles p on p.id=m.user_id where m.id=p_id;
$$;

create or replace function icue_rooms.set_presence(p_status text) returns jsonb language plpgsql security definer set search_path='' as $$
declare a jsonb:=icue_rooms.account();
begin
 if a->>'role' not in ('member','author','manager','admin','owner') then raise insufficient_privilege using message='Chat membership required.';end if;
 if p_status is null or p_status not in ('available','busy') then raise invalid_parameter_value using message='Status must be available or busy.';end if;
 insert into icue_rooms.presence(user_id,status,seen_at) values(auth.uid(),p_status,clock_timestamp())
 on conflict(user_id) do update set status=excluded.status,seen_at=excluded.seen_at;
 return jsonb_build_object('members',coalesce((
  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',s.id,'display_name',s.display_name,'full_name',s.full_name,'email',s.email,'role',s.role,'status',s.presence,'alias',s.alias))
   order by case s.presence when 'available' then 0 when 'busy' then 1 else 2 end,
    coalesce(s.alias, s.full_name, case when lower(s.display_name) in ('author','customer') then null else nullif(trim(s.display_name),'') end, s.email), s.id)
  from (
   select p.id,p.display_name,nullif(trim(p.full_name),'') as full_name,nullif(trim(u.email),'') as email,p.role::text as role,x.alias,
    case when h.seen_at>clock_timestamp()-interval '45 seconds' then h.status else 'offline' end as presence
   from public.profiles p
   join auth.users u on u.id=p.id
   left join icue_rooms.presence h on h.user_id=p.id
   left join icue_rooms.aliases x on x.user_id=p.id
   where p.role::text in ('member','author','manager','admin','owner')
    and not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=clock_timestamp())
  ) s
 ),'[]'::jsonb));
end $$;

create or replace function icue_rooms.room_json(p_room_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(r) || case when r.kind='dm' then jsonb_build_object(
  'peer',(select jsonb_strip_nulls(jsonb_build_object('id',p.id,'display_name',p.display_name,'full_name',nullif(trim(p.full_name),''),'email',nullif(trim(u.email),''),'alias',icue_rooms.alias_of(p.id)))
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
 return jsonb_build_object('account',a,'rooms',v,'can_manage',icue_rooms.can_manage(),
  'alias',case when a->>'role' in ('member','author','manager','admin','owner') then icue_rooms.alias_state(auth.uid()) end);
end $$;

revoke all on function icue_rooms.alias_of(uuid),icue_rooms.alias_state(uuid) from public,anon,authenticated,service_role;
revoke all on function icue_rooms.set_alias(text) from public,anon,authenticated,service_role;
revoke all on function public.room_chat_set_alias(text) from public,anon,authenticated,service_role;
grant execute on function icue_rooms.set_alias(text),public.room_chat_set_alias(text) to authenticated;
commit;
