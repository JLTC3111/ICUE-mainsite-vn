-- Staff alerts have their own cursor. Reading a selected thread must not hide
-- a new message before the alert poll observes it.
begin;

create function icue_support.alerts(p_after bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_events jsonb; v_cursor bigint; v_unread bigint; v_more boolean; v_seen jsonb; v_overlap jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_after < 0 then raise exception 'Invalid alert cursor.' using errcode = '22023'; end if;

  select count(*) into v_unread
    from icue_support.messages m join icue_support.conversations c on c.id = m.conversation_id
    where m.sender = 'visitor' and m.seq > c.staff_read_seq
      and (c.owner_id is not null or c.guest_expires_at > clock_timestamp());

  if p_after is null then
    -- Enabling notifications also surfaces existing unread conversations.
    select coalesce(max(m.seq), 0) into v_cursor
      from icue_support.messages m join icue_support.conversations c on c.id = m.conversation_id
      where m.sender = 'visitor' and (c.owner_id is not null or c.guest_expires_at > clock_timestamp());
    select coalesce(jsonb_agg(to_jsonb(e) order by e.seq::bigint), '[]'::jsonb) into v_events from (
      select distinct on (m.conversation_id) m.conversation_id, m.seq::text as seq,
        c.visitor_name, left(m.content, 180) as preview,
        count(*) over (partition by m.conversation_id)::integer as count
      from icue_support.messages m join icue_support.conversations c on c.id = m.conversation_id
      where m.sender = 'visitor' and m.seq > c.staff_read_seq
        and (c.owner_id is not null or c.guest_expires_at > clock_timestamp())
      order by m.conversation_id, m.seq desc
    ) e;
    v_more := false;
    select coalesce(jsonb_agg(seq::text), '[]'::jsonb) into v_seen from (
      select m.seq from icue_support.messages m join icue_support.conversations c on c.id=m.conversation_id
      where m.sender='visitor' and (c.owner_id is not null or c.guest_expires_at>clock_timestamp())
      order by m.seq desc limit 1000
    ) recent;
  else
    -- Read bounded batches in sequence order, including messages already read
    -- by an open inbox. The client drains further batches before waiting.
    with batch as materialized (
      select m.conversation_id, m.seq, m.content, c.visitor_name
      from icue_support.messages m join icue_support.conversations c on c.id = m.conversation_id
      where m.sender = 'visitor' and m.seq > p_after
        and (c.owner_id is not null or c.guest_expires_at > clock_timestamp())
      order by m.seq limit 100
    ), events as (
      select distinct on (conversation_id) conversation_id, seq::text as seq,
        visitor_name, left(content, 180) as preview,
        count(*) over (partition by conversation_id)::integer as count
      from batch order by conversation_id, seq desc
    )
    select coalesce(jsonb_agg(to_jsonb(events) order by events.seq::bigint), '[]'::jsonb),
      coalesce((select max(seq) from batch), p_after),
      coalesce((select jsonb_agg(seq::text) from batch), '[]'::jsonb)
      into v_events, v_cursor, v_seen from events;
    select exists(
      select 1 from icue_support.messages m join icue_support.conversations c on c.id = m.conversation_id
      where m.sender = 'visitor' and m.seq > v_cursor
        and (c.owner_id is not null or c.guest_expires_at > clock_timestamp())
    ) into v_more;
    -- Identity values can commit out of order in separate conversations.
    -- Revisit a bounded overlap; the client keeps processed IDs across reloads.
    select coalesce(jsonb_agg(to_jsonb(recent)), '[]'::jsonb) into v_overlap from (
      select m.conversation_id,m.seq::text as seq,c.visitor_name,left(m.content,180) as preview,1 as count
      from icue_support.messages m join icue_support.conversations c on c.id=m.conversation_id
      where m.sender='visitor' and m.seq<=p_after
        and (c.owner_id is not null or c.guest_expires_at>clock_timestamp())
      order by m.seq desc limit 100
    ) recent;
  end if;
  return jsonb_build_object('events', v_events, 'cursor', v_cursor::text,
    'unread', v_unread, 'has_more', v_more, 'seen', v_seen, 'overlap', v_overlap);
end;
$$;
revoke all on function icue_support.alerts(bigint) from public, anon, authenticated;
grant execute on function icue_support.alerts(bigint) to authenticated;

create function public.support_chat_alerts(p_after bigint default null) returns jsonb
language sql security invoker set search_path = '' as $$ select icue_support.alerts(p_after); $$;
revoke all on function public.support_chat_alerts(bigint) from public, anon, authenticated;
grant execute on function public.support_chat_alerts(bigint) to authenticated;

notify pgrst, 'reload schema';
commit;
