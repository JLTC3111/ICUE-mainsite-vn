-- Visitor presence is scoped to a chat window. Sequence numbers protect
-- against an old heartbeat arriving after a close; multiple tabs stay separate.
begin;

create table icue_support.visitor_connections (
  conversation_id uuid not null references icue_support.conversations(id) on delete cascade,
  connection_id uuid not null,
  sequence bigint not null check (sequence between 1 and 9007199254740991),
  state text not null check (state in ('active','away','left')),
  seen_at timestamptz not null default clock_timestamp(),
  primary key (conversation_id,connection_id)
);
create index support_visitor_seen_idx on icue_support.visitor_connections(conversation_id,seen_at desc);
alter table icue_support.visitor_connections enable row level security;
revoke all on icue_support.visitor_connections from public,anon,authenticated;

-- Only checked read/inbox implementations call this helper; it is not an API.
create function icue_support.visitor_state(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('visitor_status',
    case when active_until>clock_timestamp() then 'active'
      when away_until>clock_timestamp() then 'away'
      when last_seen is null then 'unknown'
      when last_state='left' then 'left' else 'disconnected' end,
    'visitor_seen_at',last_seen,
    'visitor_presence_until',case when active_until>clock_timestamp() then active_until
      when away_until>clock_timestamp() then away_until else null end)
  from (
    select max(seen_at+interval '45 seconds') filter(where state='active') as active_until,
      max(seen_at+interval '45 seconds') filter(where state='away') as away_until,
      max(seen_at) as last_seen,
      (array_agg(state order by seen_at desc,connection_id))[1] as last_state
    from icue_support.visitor_connections where conversation_id=p_id
  ) s;
$$;

create function icue_support.visitor_presence(p_token text,p_connection_id uuid,p_sequence bigint,p_state text) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if p_token is null then raise exception 'Visitor capability required.' using errcode='42501'; end if;
  v_id:=icue_support.authorize(p_token,null);
  if p_connection_id is null or p_sequence is null or p_sequence not between 1 and 9007199254740991
    or p_state is null or p_state not in ('active','away','left') then
    raise exception 'Invalid presence update.' using errcode='22023';
  end if;
  perform 1 from icue_support.conversations where id=v_id for update;
  delete from icue_support.visitor_connections where conversation_id=v_id and seen_at<clock_timestamp()-interval '1 day';
  if not exists(select 1 from icue_support.visitor_connections where conversation_id=v_id and connection_id=p_connection_id)
    and (select count(*) from icue_support.visitor_connections where conversation_id=v_id)>=20 then
    delete from icue_support.visitor_connections where conversation_id=v_id and connection_id=(
      select connection_id from icue_support.visitor_connections where conversation_id=v_id
        and seen_at<clock_timestamp()-interval '45 seconds' order by seen_at limit 1);
    if (select count(*) from icue_support.visitor_connections where conversation_id=v_id)>=20 then
      raise exception 'Too many chat windows.' using errcode='P0001';
    end if;
  end if;
  insert into icue_support.visitor_connections(conversation_id,connection_id,sequence,state,seen_at)
    values(v_id,p_connection_id,p_sequence,p_state,clock_timestamp())
    on conflict(conversation_id,connection_id) do update set sequence=excluded.sequence,state=excluded.state,seen_at=excluded.seen_at
    where excluded.sequence>icue_support.visitor_connections.sequence;
end;
$$;

create or replace function icue_support.read_chat(p_token text, p_id uuid, p_before bigint, p_mark_read boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_chat icue_support.conversations; v_messages jsonb; v_first bigint; v_latest bigint;
begin
  v_id := icue_support.authorize(p_token, p_id);
  if p_mark_read and p_before is null then
    select coalesce(max(seq), 0) into v_latest from icue_support.messages where conversation_id = v_id;
    if p_token is null then
      update icue_support.conversations set staff_read_seq = greatest(staff_read_seq, v_latest)
        where id = v_id and staff_read_seq < v_latest;
      -- A selected, visible inbox thread polls this read. Renew at most every
      -- 15 seconds; it also runs after a staff reply without requiring Go online.
      update icue_support.conversations set attending_staff_id = auth.uid(),
        attending_until = clock_timestamp() + interval '45 seconds'
        where id = v_id and status <> 'closed' and (
          attending_staff_id is distinct from auth.uid() or attending_until is null
          or attending_until < clock_timestamp() + interval '30 seconds');
    else
      update icue_support.conversations set visitor_read_seq = greatest(visitor_read_seq, v_latest)
        where id = v_id and visitor_read_seq < v_latest;
    end if;
  end if;
  select * into v_chat from icue_support.conversations where id = v_id;
  select coalesce(jsonb_agg(to_jsonb(m) - 'conversation_id' order by m.seq), '[]'::jsonb), min(m.seq)
    into v_messages, v_first from (
      select * from icue_support.messages where conversation_id = v_id
        and (p_before is null or seq < p_before) order by seq desc limit 50
    ) m;
  return jsonb_build_object('conversation', jsonb_build_object(
      'id', v_chat.id, 'locale', v_chat.locale, 'status', v_chat.status,
      'visitor_name', v_chat.visitor_name, 'visitor_email', v_chat.visitor_email,
      'page_path', v_chat.page_path, 'created_at', v_chat.created_at,
      'visitor_read_seq', v_chat.visitor_read_seq, 'staff_read_seq', v_chat.staff_read_seq,
      'visitor_typing_until', v_chat.visitor_typing_until, 'staff_typing_until', v_chat.staff_typing_until,
      'staff_attending_until', case when v_chat.status <> 'closed'
        and v_chat.attending_until > clock_timestamp()
        and exists(select 1 from public.profiles where id = v_chat.attending_staff_id and role = 'admin')
        then v_chat.attending_until else null end) || icue_support.visitor_state(v_id),
    'messages', v_messages, 'has_more', exists(select 1 from icue_support.messages where conversation_id = v_id and seq < v_first),
    'health', icue_support.health());
end;
$$;

create or replace function icue_support.inbox(p_status text, p_offset integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_rows jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Admin access required.' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('open','closed','all') or p_offset is null or p_offset not between 0 and 100000 then
    raise exception 'Invalid filter.' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(to_jsonb(c) || icue_support.visitor_state(c.id) order by c.updated_at desc, c.id), '[]'::jsonb) into v_rows from (
    select c.id, c.locale, c.visitor_name, c.visitor_email, c.page_path, c.status, c.created_at, c.updated_at,
      (select content from icue_support.messages m where m.conversation_id = c.id order by seq desc limit 1) as preview,
      (select count(*) from icue_support.messages m where m.conversation_id = c.id and m.sender = 'visitor' and m.seq > c.staff_read_seq) as unread
      from icue_support.conversations c
      where p_status = 'all' or (p_status = 'open' and c.status <> 'closed') or (p_status = 'closed' and c.status = 'closed')
      order by c.updated_at desc, c.id limit 51 offset p_offset
  ) c;
  return jsonb_build_object('conversations', v_rows, 'health', icue_support.health());
end;
$$;

create function public.support_chat_visitor_presence(p_token text,p_connection_id uuid,p_sequence bigint,p_state text)
returns void language sql security invoker set search_path='' as $$
  select icue_support.visitor_presence(p_token,p_connection_id,p_sequence,p_state);
$$;
revoke all on function icue_support.visitor_state(uuid) from public,anon,authenticated;
revoke all on function icue_support.visitor_presence(text,uuid,bigint,text) from public,anon,authenticated;
grant execute on function icue_support.visitor_presence(text,uuid,bigint,text) to anon,authenticated;
revoke all on function public.support_chat_visitor_presence(text,uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.support_chat_visitor_presence(text,uuid,bigint,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
