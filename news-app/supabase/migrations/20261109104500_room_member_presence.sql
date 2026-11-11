-- Chat-member presence is private. Browser roles reach it only through the
-- checked RPC, which never returns email addresses or customer accounts.
begin;
create table icue_rooms.presence(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 status text not null check(status in ('available','busy')),
 seen_at timestamptz not null default clock_timestamp()
);
alter table icue_rooms.presence enable row level security;
revoke all on table icue_rooms.presence from public,anon,authenticated;

create function icue_rooms.set_presence(p_status text) returns jsonb language plpgsql security definer set search_path='' as $$
declare a jsonb:=icue_rooms.account();
begin
 if a->>'role' not in ('member','author','manager','admin','owner') then raise insufficient_privilege using message='Chat membership required.';end if;
 if p_status is null or p_status not in ('available','busy') then raise invalid_parameter_value using message='Status must be available or busy.';end if;
 insert into icue_rooms.presence(user_id,status,seen_at) values(auth.uid(),p_status,clock_timestamp())
 on conflict(user_id) do update set status=excluded.status,seen_at=excluded.seen_at;
 return jsonb_build_object('members',coalesce((
  select jsonb_agg(jsonb_build_object('id',s.id,'display_name',s.display_name,'role',s.role,'status',s.presence)
   order by case s.presence when 'available' then 0 when 'busy' then 1 else 2 end,s.display_name,s.id)
  from (
   select p.id,p.display_name,p.role::text as role,
    case when h.seen_at>clock_timestamp()-interval '45 seconds' then h.status else 'offline' end as presence
   from public.profiles p
   join auth.users u on u.id=p.id
   left join icue_rooms.presence h on h.user_id=p.id
   where p.role::text in ('member','author','manager','admin','owner')
    and not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=clock_timestamp())
  ) s
 ),'[]'::jsonb));
end $$;

create function public.room_chat_presence(p_status text) returns jsonb language sql security invoker set search_path='' as $$
 select icue_rooms.set_presence(p_status);
$$;
revoke all on function icue_rooms.set_presence(text) from public,anon,authenticated,service_role;
revoke all on function public.room_chat_presence(text) from public,anon,authenticated,service_role;
grant execute on function icue_rooms.set_presence(text),public.room_chat_presence(text) to authenticated;
commit;
