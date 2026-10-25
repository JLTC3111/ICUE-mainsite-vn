-- General availability and the staff member handling a specific conversation
-- are separate states. Reading/replying renews a short, authorized thread lease.
begin;

alter table icue_support.conversations
  add column attending_staff_id uuid references public.profiles(id) on delete set null,
  add column attending_until timestamptz;
create index support_attending_staff_idx on icue_support.conversations(attending_staff_id);

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
        then v_chat.attending_until else null end),
    'messages', v_messages, 'has_more', exists(select 1 from icue_support.messages where conversation_id = v_id and seq < v_first),
    'health', icue_support.health());
end;
$$;

create or replace function icue_support.set_status(p_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Admin access required.' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('active','closed') then raise exception 'Invalid status.' using errcode = '22023'; end if;
  perform icue_support.authorize(null, p_id);
  update icue_support.conversations set status = p_status, updated_at = clock_timestamp(),
    staff_typing_until = null, attending_staff_id = null, attending_until = null where id = p_id;
  return icue_support.read_chat(null, p_id, null, true);
end;
$$;

-- REPLACE preserves existing grants. Repeat the boundary explicitly so fresh
-- and upgraded installations expose only the same checked entrypoints.
revoke all on function icue_support.read_chat(text,uuid,bigint,boolean) from public, anon, authenticated;
grant execute on function icue_support.read_chat(text,uuid,bigint,boolean) to anon, authenticated;
revoke all on function icue_support.set_status(uuid,text) from public, anon, authenticated;
grant execute on function icue_support.set_status(uuid,text) to authenticated;

notify pgrst, 'reload schema';
commit;
