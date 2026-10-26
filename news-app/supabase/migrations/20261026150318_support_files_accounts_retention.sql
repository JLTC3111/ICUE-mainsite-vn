begin;
grant usage on schema icue_support to service_role;
alter table public.profiles alter column role set default 'customer';
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name,display_name,avatar_url,role)
 values(new.id,left(nullif(new.raw_user_meta_data->>'full_name',''),100),
 coalesce(left(nullif(new.raw_user_meta_data->>'display_name',''),100),'Customer'),
 null,'customer') on conflict(id) do nothing;
 return new;
end;
$$;
revoke all on function public.handle_new_user() from public,anon,authenticated;
create function icue_support.is_customer() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='customer');
$$;
revoke all on function icue_support.is_customer() from public;
grant execute on function icue_support.is_customer() to authenticated;
-- New customer identities must not inherit any application's broad authenticated
-- policies. Existing admin/author accounts retain their current access.
do $$ declare r record; cmd text; begin
 for r in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and c.relrowsecurity loop
  foreach cmd in array array['INSERT','UPDATE','DELETE'] loop
   execute format('create policy %I on public.%I as restrictive for %s to authenticated %s',
    'customer_boundary_'||lower(cmd),r.relname,cmd,case cmd when 'INSERT' then 'with check (not (select icue_support.is_customer()))' when 'DELETE' then 'using (not (select icue_support.is_customer()))' else 'using (not (select icue_support.is_customer())) with check (not (select icue_support.is_customer()))' end);
  end loop;
  if r.relname <> all(array['profiles','articles','article_media','article_translations','article_comments','comment_translations','article_reactions','article_claps']) then
   execute format('create policy customer_boundary_select on public.%I as restrictive for select to authenticated using (not (select icue_support.is_customer()))',r.relname);
  end if;
 end loop;
end $$;
-- Restrictive INSERT/DELETE policies use only their applicable clauses.

create policy customer_storage_boundary on storage.objects as restrictive for all to authenticated
 using(not (select icue_support.is_customer())) with check(not (select icue_support.is_customer()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('support-chat','support-chat',false,10485760,array['application/pdf','image/png','image/jpeg']);
-- Existing project-wide permissive Storage policies cannot open this bucket.
create policy support_storage_private on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'support-chat') with check(bucket_id<>'support-chat');

alter table icue_support.conversations add column owner_id uuid references auth.users(id) on delete cascade;
alter table icue_support.conversations add column guest_expires_at timestamptz not null default (clock_timestamp()+interval '24 hours');
create index support_customer_threads_idx on icue_support.conversations(owner_id,updated_at desc) where owner_id is not null;
create index support_guest_expiry_idx on icue_support.conversations(guest_expires_at) where owner_id is null;
alter table icue_support.messages drop constraint messages_content_check;
alter table icue_support.messages add constraint messages_content_check check(char_length(content)<=4000);
create table icue_support.files(
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references icue_support.conversations(id) on delete cascade,
 client_id uuid not null, message_id uuid references icue_support.messages(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 180 and name !~ E'[\\r\\n/\\\\]'),
 mime text not null check(mime in ('application/pdf','image/png','image/jpeg')),
 size integer not null check(size between 1 and 10485760), sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 path text not null unique, state text not null default 'reserved' check(state in ('reserved','ready')),
 created_at timestamptz not null default clock_timestamp(), unique(conversation_id,client_id)
);
create index support_files_message_idx on icue_support.files(message_id);
create index support_files_orphan_idx on icue_support.files(created_at) where message_id is null;
create table icue_support.file_cleanup(path text primary key,created_at timestamptz not null default clock_timestamp());
create table icue_support.cleanup_config(id boolean primary key default true check(id),endpoint text,key_hash bytea);
insert into icue_support.cleanup_config(id) values(true);
create function icue_support.queue_deleted_file() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into icue_support.file_cleanup(path) values(old.path) on conflict do nothing; return old; end; $$;
revoke all on function icue_support.queue_deleted_file() from public,anon,authenticated;
create trigger queue_deleted_support_file before delete on icue_support.files for each row execute function icue_support.queue_deleted_file();
alter table icue_support.files enable row level security;
alter table icue_support.file_cleanup enable row level security;
alter table icue_support.cleanup_config enable row level security;
revoke all on icue_support.files,icue_support.file_cleanup,icue_support.cleanup_config from public,anon,authenticated;

create or replace function icue_support.authorize(p_token text,p_id uuid) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare v_id uuid;
begin
 if p_token is not null then
  if p_token !~ '^[a-f0-9]{64}$' then raise insufficient_privilege using message='Conversation unavailable.'; end if;
  select id into v_id from icue_support.conversations
   where token_hash=sha256(convert_to(p_token,'UTF8')) and (p_id is null or id=p_id)
   and ((owner_id is null and guest_expires_at>clock_timestamp()) or owner_id=auth.uid());
 elsif auth.uid() is not null then
  select id into v_id from icue_support.conversations where id=p_id
   and (owner_id=auth.uid() or public.is_admin())
   and (owner_id is not null or guest_expires_at>clock_timestamp());
 end if;
 if v_id is null then raise insufficient_privilege using message='Conversation unavailable.'; end if;
 return v_id;
end;
$$;
create function icue_support.staff_request(p_token text,p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select p_token is null and public.is_admin() and not exists(select 1 from icue_support.conversations where id=p_id and owner_id=auth.uid());
$$;
revoke all on function icue_support.staff_request(text,uuid) from public,anon,authenticated;
create function icue_support.customer_uid() returns uuid language sql stable security definer set search_path='' as $$
 select id from auth.users where id=auth.uid() and is_anonymous is distinct from true and email is not null;
$$;
revoke all on function icue_support.customer_uid() from public,anon,authenticated;
create function icue_support.account() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',u.id,'email',u.email,'name',p.display_name,'role',p.role)
 from auth.users u join public.profiles p on p.id=u.id where u.id=icue_support.customer_uid();
$$;
create function icue_support.customer_chats() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if icue_support.customer_uid() is null then raise insufficient_privilege; end if;
 return jsonb_build_object('conversations',(select coalesce(jsonb_agg(to_jsonb(c) order by c.updated_at desc),'[]'::jsonb) from(
  select c.id,c.locale,c.status,c.created_at,c.updated_at,
   (select nullif(content,'') from icue_support.messages where conversation_id=c.id order by seq desc limit 1) as preview
  from icue_support.conversations c where owner_id=auth.uid() order by updated_at desc limit 100) c));
end;
$$;
create function icue_support.claim_chat(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if icue_support.customer_uid() is null then raise insufficient_privilege; end if;
 v_id:=icue_support.authorize(p_token,null);
 perform 1 from icue_support.conversations where id=v_id for update;
 -- Recheck after the lock so cleanup/claim cannot race a guest back into life.
 perform icue_support.authorize(p_token,v_id);
 update icue_support.conversations set owner_id=auth.uid() where id=v_id and (owner_id is null or owner_id=auth.uid());
 return icue_support.read_chat(p_token,v_id,null,true);
end;
$$;
create function icue_support.prepare_chat(p_token text,p_locale text,p_name text,p_email text,p_path text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' or p_locale not in ('vi','en','de','fr','ko','ja') or p_locale is null
  or p_name is null or char_length(p_name)>100 or p_email is null or char_length(p_email)>254
  or (p_email<>'' and p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  or p_path is null or p_path !~ '^/[^?#]*$' or char_length(p_path)>500 then
  raise exception 'Check your chat details.' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_token,8317));
 select id into v_id from icue_support.conversations where token_hash=sha256(convert_to(p_token,'UTF8'));
 if v_id is null then
  insert into icue_support.conversations(token_hash,locale,visitor_name,visitor_email,page_path,owner_id)
   values(sha256(convert_to(p_token,'UTF8')),p_locale,trim(p_name),lower(trim(p_email)),p_path,icue_support.customer_uid()) returning id into v_id;
 end if;
 return icue_support.read_chat(p_token,v_id,null,true);
end;
$$;
create function icue_support.send_files(p_client_id uuid,p_message text,p_files uuid[],p_token text,p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_sender text;v_staff boolean;v_name text;v_existing icue_support.messages;v_message_id uuid;v_existing_files uuid[];
begin
 v_id:=icue_support.authorize(p_token,p_id);
 perform 1 from icue_support.conversations where id=v_id for update;
 perform icue_support.authorize(p_token,v_id);
 v_staff:=icue_support.staff_request(p_token,v_id);
 v_sender:=case when v_staff then 'staff' else 'visitor' end;
 if p_client_id is null or p_message is null or p_files is null or cardinality(p_files)>5
  or char_length(trim(p_message))>4000 or (trim(p_message)='' and cardinality(p_files)=0)
  or cardinality(p_files)<>(select count(distinct x) from unnest(p_files) x) then
  raise exception 'Check your message and files.' using errcode='22023';
 end if;
 select * into v_existing from icue_support.messages where conversation_id=v_id and client_id=p_client_id;
 if found then
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into v_existing_files from icue_support.files where message_id=v_existing.id;
  if v_existing.sender<>v_sender or v_existing.content<>trim(p_message)
   or v_existing_files<>(select coalesce(array_agg(x order by x),'{}'::uuid[]) from unnest(p_files) x) then
   raise exception 'Message identifier already used.' using errcode='22023';
  end if;
  return icue_support.read_chat(p_token,v_id,null,true);
 end if;
 if (select count(*) from icue_support.messages where conversation_id=v_id and sender=v_sender and created_at>clock_timestamp()-interval '1 minute')>=30 then
  raise exception 'Please wait before sending another message.' using errcode='P0001';
 end if;
 if (select count(*) from icue_support.files where id=any(p_files) and conversation_id=v_id and state='ready' and message_id is null)<>cardinality(p_files) then
  raise insufficient_privilege using message='A file is unavailable.';
 end if;
 if v_staff then select coalesce(nullif(trim(display_name),''),'ICUE') into v_name from public.profiles where id=auth.uid();
 else select visitor_name into v_name from icue_support.conversations where id=v_id; end if;
 insert into icue_support.messages(conversation_id,client_id,sender,sender_name,content)
  values(v_id,p_client_id,v_sender,coalesce(v_name,''),trim(p_message)) returning id into v_message_id;
 update icue_support.files set message_id=v_message_id where id=any(p_files);
 update icue_support.conversations set updated_at=clock_timestamp(),
  guest_expires_at=case when v_sender='visitor' and owner_id is null then clock_timestamp()+interval '24 hours' else guest_expires_at end,
  status=case when v_staff then 'active' when status='closed' then 'waiting' else status end,
  visitor_typing_until=case when not v_staff then null else visitor_typing_until end,
  staff_typing_until=case when v_staff then null else staff_typing_until end where id=v_id;
 return icue_support.read_chat(p_token,v_id,null,true);
end;
$$;
create or replace function icue_support.send_chat(p_client_id uuid,p_message text,p_token text,p_id uuid) returns jsonb
language sql security definer set search_path='' as $$ select icue_support.send_files(p_client_id,p_message,'{}'::uuid[],p_token,p_id); $$;
create or replace function icue_support.open_chat(p_token text,p_client_id uuid,p_message text,p_locale text,p_name text,p_email text,p_path text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_chat jsonb;
begin
 v_chat:=icue_support.prepare_chat(p_token,p_locale,p_name,p_email,p_path);
 return icue_support.send_chat(p_client_id,p_message,p_token,(v_chat->'conversation'->>'id')::uuid);
end;
$$;
create or replace function icue_support.activity(p_typing boolean,p_token text,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 v_id:=icue_support.authorize(p_token,p_id);
 if p_typing is null then return; end if;
 if icue_support.staff_request(p_token,v_id) then
  update icue_support.conversations set staff_typing_until=case when p_typing then clock_timestamp()+interval '6 seconds' else null end where id=v_id;
 else update icue_support.conversations set visitor_typing_until=case when p_typing then clock_timestamp()+interval '6 seconds' else null end where id=v_id;
 end if;
end;
$$;
create or replace function icue_support.read_chat(p_token text, p_id uuid, p_before bigint, p_mark_read boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_chat icue_support.conversations; v_messages jsonb; v_first bigint; v_latest bigint; v_staff boolean;
begin
  v_id := icue_support.authorize(p_token, p_id);
  v_staff := icue_support.staff_request(p_token,v_id);
  if p_mark_read and p_before is null then
    select coalesce(max(seq), 0) into v_latest from icue_support.messages where conversation_id = v_id;
    if v_staff then
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
  select coalesce(jsonb_agg((to_jsonb(m) - 'conversation_id') || jsonb_build_object('attachments', (select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'name',f.name,'mime',f.mime,'size',f.size) order by f.created_at,f.id),'[]'::jsonb) from icue_support.files f where f.message_id=m.id and f.state='ready')) order by m.seq), '[]'::jsonb), min(m.seq)
    into v_messages, v_first from (
      select * from icue_support.messages where conversation_id = v_id
        and (p_before is null or seq < p_before) order by seq desc limit 50
    ) m;
  return jsonb_build_object('conversation', jsonb_build_object(
      'account_saved', v_chat.owner_id is not null, 'guest_expires_at', case when v_chat.owner_id is null then v_chat.guest_expires_at else null end,
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
      where (c.owner_id is not null or c.guest_expires_at>clock_timestamp()) and exists(select 1 from icue_support.messages where conversation_id=c.id)
      and (p_status = 'all' or (p_status = 'open' and c.status <> 'closed') or (p_status = 'closed' and c.status = 'closed'))
      order by c.updated_at desc, c.id limit 51 offset p_offset
  ) c;
  return jsonb_build_object('conversations', v_rows, 'health', icue_support.health());
end;
$$;

drop function public.support_chat_visitor_presence(text,uuid,bigint,text);
drop function icue_support.visitor_presence(text,uuid,bigint,text);
create function icue_support.visitor_presence(p_token text,p_connection_id uuid,p_sequence bigint,p_state text,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if p_token is null and not exists(select 1 from icue_support.conversations where id=p_id and owner_id=auth.uid()) then raise insufficient_privilege; end if;
  v_id:=icue_support.authorize(p_token,p_id);
  if p_connection_id is null or p_sequence is null or p_sequence not between 1 and 9007199254740991
    or p_state is null or p_state not in ('active','away','left') then
    raise exception 'Invalid presence update.' using errcode='22023';
  end if;
  perform 1 from icue_support.conversations where id=v_id for update;
  if p_state='active' then update icue_support.conversations set guest_expires_at=clock_timestamp()+interval '24 hours' where id=v_id and owner_id is null and guest_expires_at>clock_timestamp() and not exists(select 1 from icue_support.visitor_connections where conversation_id=v_id and connection_id=p_connection_id and sequence>=p_sequence); end if;
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


create function icue_support.reserve_file(p_token text,p_id uuid,p_client_id uuid,p_name text,p_mime text,p_size integer,p_sha256 text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_file icue_support.files;v_ext text;
begin
 v_id:=icue_support.authorize(p_token,p_id);
 perform 1 from icue_support.conversations where id=v_id for update;
 perform icue_support.authorize(p_token,v_id);
 v_ext:=lower(substring(p_name from '\.([^.]+)$'));
 if p_client_id is null or p_name is null or char_length(p_name) not between 1 and 180 or p_name ~ E'[\\r\\n/\\\\]'
  or p_size is null or p_size not between 1 and 10485760 or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$'
  or p_mime is null or v_ext is null or not ((p_mime='application/pdf' and v_ext='pdf') or (p_mime='image/png' and v_ext='png') or (p_mime='image/jpeg' and v_ext in ('jpg','jpeg'))) then
  raise exception 'PDF, PNG or JPEG only; maximum 10 MB per file.' using errcode='22023';
 end if;
 select * into v_file from icue_support.files where conversation_id=v_id and client_id=p_client_id;
 if found then
  if v_file.sha256<>p_sha256 or v_file.name<>p_name or v_file.mime<>p_mime or v_file.size<>p_size then raise exception 'Upload identifier already used.' using errcode='22023'; end if;
  return to_jsonb(v_file)-'conversation_id'-'sha256';
 end if;
 if (select coalesce(sum(size),0) from icue_support.files where conversation_id=v_id)+p_size>52428800
  or (select count(*) from icue_support.files where conversation_id=v_id and created_at>clock_timestamp()-interval '10 minutes')>=20 then
  raise exception 'Conversation upload limit reached.' using errcode='P0001';
 end if;
 insert into icue_support.files(conversation_id,client_id,name,mime,size,sha256,path)
  values(v_id,p_client_id,p_name,p_mime,p_size,p_sha256,v_id::text||'/'||p_client_id::text||'.'||v_ext) returning * into v_file;
 return to_jsonb(v_file)-'conversation_id'-'sha256';
end;
$$;
create function icue_support.ready_file(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare f icue_support.files;
begin
 update icue_support.files set state='ready' where id=p_id and exists(select 1 from icue_support.conversations c where c.id=conversation_id and (c.owner_id is not null or c.guest_expires_at>clock_timestamp())) returning * into f;
 if not found then raise insufficient_privilege using message='Upload expired.'; end if;
 return jsonb_build_object('id',f.id,'name',f.name,'mime',f.mime,'size',f.size,'client_id',f.client_id);
end;
$$;
create function icue_support.download_file(p_token text,p_id uuid,p_file uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;f icue_support.files;
begin
 v_id:=icue_support.authorize(p_token,p_id);
 select * into f from icue_support.files where id=p_file and conversation_id=v_id and state='ready' and message_id is not null;
 if not found then raise insufficient_privilege using message='File unavailable.'; end if;
 return jsonb_build_object('path',f.path,'name',f.name,'mime',f.mime,'size',f.size);
end;
$$;
create function icue_support.discard_file(p_token text,p_id uuid,p_file uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 v_id:=icue_support.authorize(p_token,p_id);
 perform 1 from icue_support.conversations where id=v_id for update;
 insert into icue_support.file_cleanup(path) select path from icue_support.files where id=p_file and conversation_id=v_id and message_id is null on conflict do nothing;
 delete from icue_support.files where id=p_file and conversation_id=v_id and message_id is null;
end;
$$;
create function icue_support.cleanup_batch() returns jsonb language plpgsql security definer set search_path='' as $$
declare v_ids uuid[];v_files uuid[];
begin
 select array_agg(id) into v_ids from(select id from icue_support.conversations where owner_id is null and guest_expires_at<=clock_timestamp() order by guest_expires_at limit 100 for update skip locked) c;
 insert into icue_support.file_cleanup(path) select path from icue_support.files where conversation_id=any(v_ids) on conflict do nothing;
 delete from icue_support.conversations where id=any(v_ids);
 select array_agg(id) into v_files from(select id from icue_support.files where message_id is null and created_at<clock_timestamp()-interval '1 hour' order by created_at limit 100 for update skip locked) f;
 insert into icue_support.file_cleanup(path) select path from icue_support.files where id=any(v_files) on conflict do nothing;
 delete from icue_support.files where id=any(v_files);
 return jsonb_build_object('conversations_deleted',coalesce(cardinality(v_ids),0),'paths',(select coalesce(jsonb_agg(path),'[]'::jsonb) from(select path from icue_support.file_cleanup order by created_at limit 100) q));
end;
$$;
create function icue_support.cleanup_ack(p_paths text[]) returns void language sql security definer set search_path='' as $$
 delete from icue_support.file_cleanup where path=any(p_paths);
$$;
create function icue_support.cleanup_key_valid(p_key text) returns boolean language sql stable security definer set search_path='' as $$
 select p_key is not null and sha256(convert_to(p_key,'UTF8'))=key_hash from icue_support.cleanup_config where id;
$$;
create function icue_support.dispatch_cleanup() returns bigint language plpgsql security definer set search_path='' as $$
declare v_endpoint text;v_key text;v_request bigint;
begin
 select endpoint into v_endpoint from icue_support.cleanup_config where id;
 if v_endpoint is null then return null; end if;
 select decrypted_secret into v_key from vault.decrypted_secrets where name='icue_support_cleanup_key';
 select net.http_post(url:=v_endpoint,headers:=jsonb_build_object('Content-Type','application/json','x-cleanup-key',v_key),body:='{"action":"cleanup"}'::jsonb,timeout_milliseconds:=10000) into v_request;
 return v_request;
end;
$$;
create function icue_support.install_cleanup(p_endpoint text) returns void language plpgsql security definer set search_path='' as $$
declare v_key text;
begin
 if p_endpoint !~ '^https://[a-z0-9]+\.supabase\.co/functions/v1/support-chat-files$' then raise exception 'Invalid cleanup endpoint'; end if;
 select decrypted_secret into v_key from vault.decrypted_secrets where name='icue_support_cleanup_key';
 if v_key is null then
  v_key:=encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex');
  perform vault.create_secret(v_key,'icue_support_cleanup_key');
 end if;
 update icue_support.cleanup_config set endpoint=p_endpoint,key_hash=sha256(convert_to(v_key,'UTF8')) where id;
 perform cron.schedule('icue-support-guest-cleanup','*/5 * * * *','select icue_support.dispatch_cleanup()');
end;
$$;
create function public.support_chat_account() returns jsonb language sql security invoker set search_path='' as $$ select icue_support.account(); $$;
revoke all on function public.support_chat_account() from public,anon,authenticated;
grant execute on function public.support_chat_account() to authenticated;
revoke all on function icue_support.account() from public,anon,authenticated;
grant execute on function icue_support.account() to authenticated;
create function public.support_chat_customer_chats() returns jsonb language sql security invoker set search_path='' as $$ select icue_support.customer_chats(); $$;
revoke all on function public.support_chat_customer_chats() from public,anon,authenticated;
grant execute on function public.support_chat_customer_chats() to authenticated;
revoke all on function icue_support.customer_chats() from public,anon,authenticated;
grant execute on function icue_support.customer_chats() to authenticated;
create function public.support_chat_claim(p_token text) returns jsonb language sql security invoker set search_path='' as $$ select icue_support.claim_chat(p_token); $$;
revoke all on function public.support_chat_claim(text) from public,anon,authenticated;
grant execute on function public.support_chat_claim(text) to authenticated;
revoke all on function icue_support.claim_chat(text) from public,anon,authenticated;
grant execute on function icue_support.claim_chat(text) to authenticated;
create function public.support_chat_prepare(p_token text,p_locale text default 'vi',p_name text default '',p_email text default '',p_path text default '/') returns jsonb language sql security invoker set search_path='' as $$ select icue_support.prepare_chat(p_token,p_locale,p_name,p_email,p_path); $$;
revoke all on function public.support_chat_prepare(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.support_chat_prepare(text,text,text,text,text) to anon,authenticated;
revoke all on function icue_support.prepare_chat(text,text,text,text,text) from public,anon,authenticated;
grant execute on function icue_support.prepare_chat(text,text,text,text,text) to anon,authenticated;
create function public.support_chat_send_files(p_client_id uuid,p_message text,p_files uuid[],p_token text default null,p_conversation_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select icue_support.send_files(p_client_id,p_message,p_files,p_token,p_conversation_id); $$;
revoke all on function public.support_chat_send_files(uuid,text,uuid[],text,uuid) from public,anon,authenticated;
grant execute on function public.support_chat_send_files(uuid,text,uuid[],text,uuid) to anon,authenticated;
revoke all on function icue_support.send_files(uuid,text,uuid[],text,uuid) from public,anon,authenticated;
grant execute on function icue_support.send_files(uuid,text,uuid[],text,uuid) to anon,authenticated;
create function public.support_chat_visitor_presence(p_token text,p_connection_id uuid,p_sequence bigint,p_state text,p_conversation_id uuid default null) returns void language sql security invoker set search_path='' as $$ select icue_support.visitor_presence(p_token,p_connection_id,p_sequence,p_state,p_conversation_id); $$;
revoke all on function public.support_chat_visitor_presence(text,uuid,bigint,text,uuid) from public,anon,authenticated;
grant execute on function public.support_chat_visitor_presence(text,uuid,bigint,text,uuid) to anon,authenticated;
revoke all on function icue_support.visitor_presence(text,uuid,bigint,text,uuid) from public,anon,authenticated;
grant execute on function icue_support.visitor_presence(text,uuid,bigint,text,uuid) to anon,authenticated;
create function public.support_chat_file_reserve(p_token text,p_conversation_id uuid,p_client_id uuid,p_name text,p_mime text,p_size integer,p_sha256 text) returns jsonb language sql security invoker set search_path='' as $$ select icue_support.reserve_file(p_token,p_conversation_id,p_client_id,p_name,p_mime,p_size,p_sha256); $$;
revoke all on function public.support_chat_file_reserve(text,uuid,uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.support_chat_file_reserve(text,uuid,uuid,text,text,integer,text) to anon,authenticated;
revoke all on function icue_support.reserve_file(text,uuid,uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function icue_support.reserve_file(text,uuid,uuid,text,text,integer,text) to anon,authenticated;
create function public.support_chat_file_download(p_token text,p_conversation_id uuid,p_file uuid) returns jsonb language sql security invoker set search_path='' as $$ select icue_support.download_file(p_token,p_conversation_id,p_file); $$;
revoke all on function public.support_chat_file_download(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.support_chat_file_download(text,uuid,uuid) to anon,authenticated;
revoke all on function icue_support.download_file(text,uuid,uuid) from public,anon,authenticated;
grant execute on function icue_support.download_file(text,uuid,uuid) to anon,authenticated;
create function public.support_chat_file_discard(p_token text,p_conversation_id uuid,p_file uuid) returns void language sql security invoker set search_path='' as $$ select icue_support.discard_file(p_token,p_conversation_id,p_file); $$;
revoke all on function public.support_chat_file_discard(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.support_chat_file_discard(text,uuid,uuid) to anon,authenticated;
revoke all on function icue_support.discard_file(text,uuid,uuid) from public,anon,authenticated;
grant execute on function icue_support.discard_file(text,uuid,uuid) to anon,authenticated;
create function public.support_chat_file_ready(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select icue_support.ready_file(p_id); $$;
revoke all on function public.support_chat_file_ready(uuid) from public,anon,authenticated;
grant execute on function public.support_chat_file_ready(uuid) to service_role;
revoke all on function icue_support.ready_file(uuid) from public,anon,authenticated;
grant execute on function icue_support.ready_file(uuid) to service_role;
create function public.support_chat_cleanup_batch() returns jsonb language sql security invoker set search_path='' as $$ select icue_support.cleanup_batch(); $$;
revoke all on function public.support_chat_cleanup_batch() from public,anon,authenticated;
grant execute on function public.support_chat_cleanup_batch() to service_role;
revoke all on function icue_support.cleanup_batch() from public,anon,authenticated;
grant execute on function icue_support.cleanup_batch() to service_role;
create function public.support_chat_cleanup_ack(p_paths text[]) returns void language sql security invoker set search_path='' as $$ select icue_support.cleanup_ack(p_paths); $$;
revoke all on function public.support_chat_cleanup_ack(text[]) from public,anon,authenticated;
grant execute on function public.support_chat_cleanup_ack(text[]) to service_role;
revoke all on function icue_support.cleanup_ack(text[]) from public,anon,authenticated;
grant execute on function icue_support.cleanup_ack(text[]) to service_role;
create function public.support_chat_cleanup_key_valid(p_key text) returns boolean language sql security invoker set search_path='' as $$ select icue_support.cleanup_key_valid(p_key); $$;
revoke all on function public.support_chat_cleanup_key_valid(text) from public,anon,authenticated;
grant execute on function public.support_chat_cleanup_key_valid(text) to service_role;
revoke all on function icue_support.cleanup_key_valid(text) from public,anon,authenticated;
grant execute on function icue_support.cleanup_key_valid(text) to service_role;
revoke all on function icue_support.dispatch_cleanup(),icue_support.install_cleanup(text) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
