-- A visitor's random capability opens only their own thread. Staff access is
-- checked against the existing, owner-controlled newsroom admin role.
begin;

create schema if not exists icue_support;
revoke all on schema icue_support from public;
grant usage on schema icue_support to anon, authenticated;

create table icue_support.conversations (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  locale text not null check (locale in ('vi','en','de','fr','ko','ja')),
  visitor_name text not null default '' check (char_length(visitor_name) <= 100),
  visitor_email text not null default '' check (char_length(visitor_email) <= 254),
  page_path text not null default '/' check (char_length(page_path) <= 500),
  status text not null default 'waiting' check (status in ('waiting','active','closed')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  visitor_read_seq bigint not null default 0,
  staff_read_seq bigint not null default 0,
  visitor_typing_until timestamptz,
  staff_typing_until timestamptz
);
create index support_queue_updated_idx on icue_support.conversations(updated_at desc, id);
create index support_queue_status_idx on icue_support.conversations(status, updated_at desc);

create table icue_support.messages (
  seq bigint generated always as identity primary key,
  id uuid not null unique default gen_random_uuid(),
  conversation_id uuid not null references icue_support.conversations(id) on delete cascade,
  client_id uuid not null,
  sender text not null check (sender in ('visitor','staff')),
  sender_name text not null default '',
  content text not null check (char_length(trim(content)) between 1 and 4000),
  created_at timestamptz not null default clock_timestamp(),
  unique (conversation_id, client_id)
);
create index support_messages_thread_idx on icue_support.messages(conversation_id, seq desc);
create index support_messages_rate_idx on icue_support.messages(conversation_id, created_at desc);

create table icue_support.presence (
  staff_id uuid primary key references public.profiles(id) on delete cascade,
  available boolean not null default false,
  seen_at timestamptz not null default clock_timestamp()
);
alter table icue_support.conversations enable row level security;
alter table icue_support.messages enable row level security;
alter table icue_support.presence enable row level security;
revoke all on all tables in schema icue_support from public, anon, authenticated;
revoke all on all sequences in schema icue_support from public, anon, authenticated;

create function icue_support.health() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('version', 1, 'server_time', clock_timestamp(),
    'available_until', (select max(s.seen_at) + interval '45 seconds'
      from icue_support.presence s join public.profiles p on p.id = s.staff_id
      where s.available and p.role = 'admin' and s.seen_at > clock_timestamp() - interval '45 seconds'));
$$;

-- A missing token never becomes an anonymous staff identity. Supplying a
-- conversation UUID is useful only to an authorized administrator.
create function icue_support.authorize(p_token text, p_id uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_token is not null then
    if p_token !~ '^[a-f0-9]{64}$' then raise exception 'Conversation unavailable.' using errcode = '42501'; end if;
    select id into v_id from icue_support.conversations
      where token_hash = sha256(convert_to(p_token, 'UTF8')) and (p_id is null or id = p_id);
  elsif auth.uid() is not null and public.is_admin() then
    select id into v_id from icue_support.conversations where id = p_id;
  end if;
  if v_id is null then raise exception 'Conversation unavailable.' using errcode = '42501'; end if;
  return v_id;
end;
$$;

create function icue_support.read_chat(p_token text, p_id uuid, p_before bigint, p_mark_read boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_chat icue_support.conversations; v_messages jsonb; v_first bigint; v_latest bigint;
begin
  v_id := icue_support.authorize(p_token, p_id);
  if p_mark_read and p_before is null then
    select coalesce(max(seq), 0) into v_latest from icue_support.messages where conversation_id = v_id;
    if p_token is null then
      update icue_support.conversations set staff_read_seq = greatest(staff_read_seq, v_latest) where id = v_id;
    else
      update icue_support.conversations set visitor_read_seq = greatest(visitor_read_seq, v_latest) where id = v_id;
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
      'visitor_typing_until', v_chat.visitor_typing_until, 'staff_typing_until', v_chat.staff_typing_until),
    'messages', v_messages, 'has_more', exists(select 1 from icue_support.messages where conversation_id = v_id and seq < v_first),
    'health', icue_support.health());
end;
$$;

create function icue_support.send_chat(p_client_id uuid, p_message text, p_token text, p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_sender text; v_name text; v_existing icue_support.messages;
begin
  v_id := icue_support.authorize(p_token, p_id);
  if p_client_id is null or p_message is null or char_length(trim(p_message)) not between 1 and 4000 then
    raise exception 'Check your message.' using errcode = '22023';
  end if;
  -- Serialize writes per conversation, including retry/rate checks.
  perform 1 from icue_support.conversations where id = v_id for update;
  v_sender := case when p_token is null then 'staff' else 'visitor' end;
  select * into v_existing from icue_support.messages where conversation_id = v_id and client_id = p_client_id;
  if found then
    if v_existing.sender <> v_sender or v_existing.content <> trim(p_message) then
      raise exception 'Message identifier already used.' using errcode = '22023';
    end if;
    return icue_support.read_chat(p_token, v_id, null, true);
  end if;
  if (select count(*) from icue_support.messages where conversation_id = v_id and sender = v_sender
      and created_at > clock_timestamp() - interval '1 minute') >= 30 then
    raise exception 'Please wait before sending another message.' using errcode = 'P0001';
  end if;
  if p_token is null then
    select coalesce(nullif(trim(display_name), ''), 'ICUE') into v_name from public.profiles where id = auth.uid();
  else
    select visitor_name into v_name from icue_support.conversations where id = v_id;
  end if;
  insert into icue_support.messages(conversation_id, client_id, sender, sender_name, content)
    values (v_id, p_client_id, v_sender, coalesce(v_name, ''), trim(p_message));
  update icue_support.conversations set updated_at = clock_timestamp(),
    status = case when v_sender = 'staff' then 'active' when status = 'closed' then 'waiting' else status end,
    visitor_typing_until = case when v_sender = 'visitor' then null else visitor_typing_until end,
    staff_typing_until = case when v_sender = 'staff' then null else staff_typing_until end
    where id = v_id;
  return icue_support.read_chat(p_token, v_id, null, true);
end;
$$;

create function icue_support.open_chat(p_token text, p_client_id uuid, p_message text, p_locale text, p_name text, p_email text, p_path text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$'
    or p_locale is null or p_locale not in ('vi','en','de','fr','ko','ja')
    or p_name is null or char_length(p_name) > 100
    or p_email is null or char_length(p_email) > 254
    or (p_email <> '' and p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or p_path is null or p_path !~ '^/[^?#]*$' or char_length(p_path) > 500 then
    raise exception 'Check your chat details.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_token, 8317));
  select id into v_id from icue_support.conversations where token_hash = sha256(convert_to(p_token, 'UTF8'));
  if v_id is null then
    insert into icue_support.conversations(token_hash, locale, visitor_name, visitor_email, page_path)
      values (sha256(convert_to(p_token, 'UTF8')), p_locale, trim(p_name), lower(trim(p_email)), p_path) returning id into v_id;
  end if;
  return icue_support.send_chat(p_client_id, p_message, p_token, v_id);
end;
$$;

create function icue_support.activity(p_typing boolean, p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  v_id := icue_support.authorize(p_token, p_id);
  if p_typing is null then return; end if;
  if p_token is null then
    update icue_support.conversations set staff_typing_until = case when p_typing then clock_timestamp() + interval '6 seconds' else null end where id = v_id;
  else
    update icue_support.conversations set visitor_typing_until = case when p_typing then clock_timestamp() + interval '6 seconds' else null end where id = v_id;
  end if;
end;
$$;

create function icue_support.set_presence(p_available boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Admin access required.' using errcode = '42501'; end if;
  if p_available is null then raise exception 'Availability required.' using errcode = '22023'; end if;
  insert into icue_support.presence(staff_id, available, seen_at) values (auth.uid(), p_available, clock_timestamp())
    on conflict (staff_id) do update set available = excluded.available, seen_at = excluded.seen_at;
  return icue_support.health();
end;
$$;

create function icue_support.inbox(p_status text, p_offset integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_rows jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Admin access required.' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('open','closed','all') or p_offset is null or p_offset not between 0 and 100000 then
    raise exception 'Invalid filter.' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(to_jsonb(c) order by c.updated_at desc, c.id), '[]'::jsonb) into v_rows from (
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

create function icue_support.set_status(p_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Admin access required.' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('active','closed') then raise exception 'Invalid status.' using errcode = '22023'; end if;
  perform icue_support.authorize(null, p_id);
  update icue_support.conversations set status = p_status, updated_at = clock_timestamp(), staff_typing_until = null where id = p_id;
  return icue_support.read_chat(null, p_id, null, true);
end;
$$;

-- Exposed entrypoints are invokers; privileged implementations remain in the
-- unexposed schema. Every privileged operation checks capability or admin ID.
create function public.support_chat_health() returns jsonb language sql stable security invoker set search_path = '' as $$ select icue_support.health(); $$;
create function public.support_chat_open(p_token text, p_client_id uuid, p_message text, p_locale text, p_name text default '', p_email text default '', p_path text default '/') returns jsonb language sql security invoker set search_path = '' as $$ select icue_support.open_chat(p_token,p_client_id,p_message,p_locale,p_name,p_email,p_path); $$;
create function public.support_chat_read(p_token text default null, p_conversation_id uuid default null, p_before bigint default null, p_mark_read boolean default true) returns jsonb language sql security invoker set search_path = '' as $$ select icue_support.read_chat(p_token,p_conversation_id,p_before,p_mark_read); $$;
create function public.support_chat_send(p_client_id uuid, p_message text, p_token text default null, p_conversation_id uuid default null) returns jsonb language sql security invoker set search_path = '' as $$ select icue_support.send_chat(p_client_id,p_message,p_token,p_conversation_id); $$;
create function public.support_chat_activity(p_typing boolean, p_token text default null, p_conversation_id uuid default null) returns void language sql security invoker set search_path = '' as $$ select icue_support.activity(p_typing,p_token,p_conversation_id); $$;
create function public.support_chat_presence(p_available boolean) returns jsonb language sql security invoker set search_path = '' as $$ select icue_support.set_presence(p_available); $$;
create function public.support_chat_inbox(p_status text default 'open', p_offset integer default 0) returns jsonb language sql stable security invoker set search_path = '' as $$ select icue_support.inbox(p_status,p_offset); $$;
create function public.support_chat_status(p_conversation_id uuid, p_status text) returns jsonb language sql security invoker set search_path = '' as $$ select icue_support.set_status(p_conversation_id,p_status); $$;

revoke all on all functions in schema icue_support from public, anon, authenticated;
grant execute on function icue_support.health(), icue_support.open_chat(text,uuid,text,text,text,text,text),
  icue_support.read_chat(text,uuid,bigint,boolean), icue_support.send_chat(uuid,text,text,uuid), icue_support.activity(boolean,text,uuid) to anon, authenticated;
grant execute on function icue_support.set_presence(boolean), icue_support.inbox(text,integer), icue_support.set_status(uuid,text) to authenticated;
revoke all on function public.support_chat_health(), public.support_chat_open(text,uuid,text,text,text,text,text),
  public.support_chat_read(text,uuid,bigint,boolean), public.support_chat_send(uuid,text,text,uuid),
  public.support_chat_activity(boolean,text,uuid), public.support_chat_presence(boolean),
  public.support_chat_inbox(text,integer), public.support_chat_status(uuid,text) from public, anon, authenticated;
grant execute on function public.support_chat_health(), public.support_chat_open(text,uuid,text,text,text,text,text),
  public.support_chat_read(text,uuid,bigint,boolean), public.support_chat_send(uuid,text,text,uuid), public.support_chat_activity(boolean,text,uuid) to anon, authenticated;
grant execute on function public.support_chat_presence(boolean), public.support_chat_inbox(text,integer), public.support_chat_status(uuid,text) to authenticated;

notify pgrst, 'reload schema';
commit;
