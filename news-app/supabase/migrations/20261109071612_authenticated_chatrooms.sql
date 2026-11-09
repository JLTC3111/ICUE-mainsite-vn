-- Checked RPCs are the only browser data path. Customer rooms require explicit
-- membership; the shared members room excludes public customer registrations.
begin;
alter type public.user_role add value if not exists 'member';
alter type public.user_role add value if not exists 'manager';
alter type public.user_role add value if not exists 'owner';
commit;
begin;
-- Preserve all existing restrictive business-table policies for new chat roles.
-- This legacy helper means "not newsroom staff"; only author/admin may edit.
create or replace function icue_support.is_customer() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role::text not in ('admin','author'));
$$;
create schema icue_rooms;
revoke all on schema icue_rooms from public,anon;
grant usage on schema icue_rooms to authenticated,service_role;
create table icue_rooms.rooms(
 id uuid primary key default gen_random_uuid(), name text not null check(char_length(btrim(name)) between 1 and 100),
 kind text not null check(kind in ('members','customers')), archived boolean not null default false,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp()
);
create unique index room_one_members_room on icue_rooms.rooms(kind) where kind='members';
insert into icue_rooms.rooms(name,kind) values('ICUE members','members');
create table icue_rooms.participants(
 room_id uuid references icue_rooms.rooms(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,
 joined_at timestamptz not null default clock_timestamp(),primary key(room_id,user_id)
);
create index room_participants_user_idx on icue_rooms.participants(user_id,room_id);
create table icue_rooms.messages(
 id bigint generated always as identity primary key,room_id uuid not null references icue_rooms.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,client_id uuid not null,document jsonb not null,
 created_at timestamptz not null default clock_timestamp(),unique(room_id,user_id,client_id)
);
create index room_messages_page_idx on icue_rooms.messages(room_id,id desc);
create index room_messages_rate_idx on icue_rooms.messages(user_id,created_at desc);
create table icue_rooms.files(
 id uuid primary key default gen_random_uuid(),room_id uuid not null references icue_rooms.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,client_id uuid not null,
 message_id bigint references icue_rooms.messages(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 180 and name !~ '[[:cntrl:]/\\]'),
 mime text not null check(mime in ('image/png','image/jpeg','image/webp','video/mp4')),
 size integer not null check(size between 1 and 4194304),sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 path text not null unique,state text not null default 'reserved' check(state in ('reserved','ready')),
 created_at timestamptz not null default clock_timestamp(),unique(room_id,user_id,client_id)
);
create index room_files_message_idx on icue_rooms.files(message_id);
create index room_files_orphan_idx on icue_rooms.files(created_at) where message_id is null;
create index room_files_user_rate_idx on icue_rooms.files(user_id,created_at desc);
create table icue_rooms.file_cleanup(path text primary key,created_at timestamptz not null default clock_timestamp());
create table icue_rooms.network_events(
 id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,
 ip inet,source text not null,vpn_status text not null check(vpn_status in ('unknown','detected','not_detected')),
 proxy_status text not null check(proxy_status in ('unknown','detected','not_detected')),provider text,
 created_at timestamptz not null default clock_timestamp()
);
create index room_network_user_created_idx on icue_rooms.network_events(user_id,created_at desc);
-- Count attempts before invoking a media decoder, including corrupt files that
-- never reach reservation. Account row locks serialize concurrent requests.
create table icue_rooms.upload_attempts(
 id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp()
);
create index room_upload_attempt_user_created_idx on icue_rooms.upload_attempts(user_id,created_at desc);
do $$ declare t text;begin
 foreach t in array array['rooms','participants','messages','files','file_cleanup','network_events','upload_attempts'] loop
  execute format('alter table icue_rooms.%I enable row level security',t);
 end loop;
end $$;
revoke all on all tables in schema icue_rooms from public,anon,authenticated;
revoke all on all sequences in schema icue_rooms from public,anon,authenticated;

create function icue_rooms.account() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v jsonb;begin
 select jsonb_build_object('id',p.id,'role',p.role,'display_name',p.display_name) into v
 from public.profiles p join auth.users u on u.id=p.id where p.id=auth.uid()
 and not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null and u.deleted_at is null
 and (u.banned_until is null or u.banned_until<=clock_timestamp());
 if v is null then raise insufficient_privilege using message='Verified account required.';end if;
 return v;
end $$;
create function icue_rooms.can_manage() returns boolean language sql stable security definer set search_path='' as $$
 select icue_rooms.account()->>'role' in ('manager','admin','owner');
$$;
create function icue_rooms.authorize(p_room_id uuid,p_write boolean default false) returns void language plpgsql stable security definer set search_path='' as $$
declare a jsonb:=icue_rooms.account();begin
 if not exists(select 1 from icue_rooms.rooms r where r.id=p_room_id and (not p_write or not r.archived)
  and ((r.kind='members' and a->>'role' in ('member','author','manager','admin','owner'))
    or (r.kind='customers' and exists(select 1 from icue_rooms.participants p where p.room_id=r.id and p.user_id=auth.uid()))))
 then raise insufficient_privilege using message='Room unavailable.';end if;
end $$;
create function icue_rooms.validate_document(d jsonb) returns integer language plpgsql immutable set search_path='' as $$
declare n jsonb;t jsonb;m jsonb;v_size integer:=0;v_chars integer:=0;v_nodes integer:=0;begin
 if jsonb_typeof(d) is distinct from 'object' or d->>'type' is distinct from 'doc' or d-array['type','content']<>'{}'::jsonb
 or jsonb_typeof(d->'content') is distinct from 'array' or octet_length(d::text)>24000 or jsonb_array_length(d->'content')>100
 then raise invalid_parameter_value using message='Unsupported message document.';end if;
 for n in select value from jsonb_array_elements(d->'content') loop
  if jsonb_typeof(n) is distinct from 'object' then raise invalid_parameter_value using message='Unsupported message node.';end if;
  if n->>'type'='sticker' then
   if n-array['type','attrs']<>'{}'::jsonb or jsonb_typeof(n->'attrs') is distinct from 'object'
    or (n->'attrs')-'name'<>'{}'::jsonb or (n->'attrs'->>'name') is null or n->'attrs'->>'name' not in ('wave','celebrate','heart')
   then raise invalid_parameter_value using message='Unsupported sticker.';end if;
   v_size:=v_size+1;
  elsif n->>'type'='paragraph' then
   if n-array['type','content']<>'{}'::jsonb or (n ? 'content' and jsonb_typeof(n->'content') is distinct from 'array')
   then raise invalid_parameter_value using message='Unsupported paragraph.';end if;
   for t in select value from jsonb_array_elements(coalesce(n->'content','[]'::jsonb)) loop
    v_nodes:=v_nodes+1;
    if v_nodes>1000 or jsonb_typeof(t) is distinct from 'object' or t->>'type' is distinct from 'text'
     or t-array['type','text','marks']<>'{}'::jsonb or jsonb_typeof(t->'text') is distinct from 'string'
     or (t ? 'marks' and jsonb_typeof(t->'marks') is distinct from 'array')
    then raise invalid_parameter_value using message='Unsupported text.';end if;
    v_size:=v_size+char_length(btrim(t->>'text'));
    v_chars:=v_chars+char_length(t->>'text');
    if jsonb_array_length(coalesce(t->'marks','[]'::jsonb))>4 then raise invalid_parameter_value using message='Too many text marks.';end if;
    for m in select value from jsonb_array_elements(coalesce(t->'marks','[]'::jsonb)) loop
     if jsonb_typeof(m) is distinct from 'object' or m-'type'<>'{}'::jsonb or m->>'type' is null
      or m->>'type' not in ('bold','italic','underline','strike') then raise invalid_parameter_value using message='Unsupported text mark.';end if;
    end loop;
   end loop;
  else raise invalid_parameter_value using message='Unsupported message node.';
  end if;
 end loop;
 if v_chars>4000 then raise invalid_parameter_value using message='Message too long.';end if;
 return v_size;
end $$;
create function icue_rooms.message_json(p_id bigint) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'client_id',m.client_id,'user_id',m.user_id,'display_name',p.display_name,
 'document',m.document,'created_at',m.created_at,'files',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'name',f.name,'mime',f.mime,'size',f.size) order by f.created_at,f.id) from icue_rooms.files f where f.message_id=m.id and f.state='ready'),'[]'::jsonb))
 from icue_rooms.messages m join public.profiles p on p.id=m.user_id where m.id=p_id;
$$;
create function icue_rooms.bootstrap() returns jsonb language plpgsql security definer set search_path='' as $$
declare a jsonb:=icue_rooms.account();v jsonb;begin
 select coalesce(jsonb_agg(to_jsonb(r) order by r.updated_at desc,r.id),'[]'::jsonb) into v from icue_rooms.rooms r
 where (r.kind='members' and a->>'role' in ('member','author','manager','admin','owner'))
 or (r.kind='customers' and exists(select 1 from icue_rooms.participants p where p.room_id=r.id and p.user_id=auth.uid()));
 return jsonb_build_object('account',a,'rooms',v,'can_manage',icue_rooms.can_manage());
end $$;
create function icue_rooms.read_messages(p_room_id uuid,p_before bigint default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;v_min bigint;begin
 perform icue_rooms.authorize(p_room_id);
 select coalesce(jsonb_agg(icue_rooms.message_json(s.id) order by s.id),'[]'::jsonb),min(s.id) into v,v_min
 from (select id from icue_rooms.messages where room_id=p_room_id and (p_before is null or id<p_before) order by id desc limit 50)s;
 return jsonb_build_object('messages',v,'has_more',exists(select 1 from icue_rooms.messages where room_id=p_room_id and id<v_min));
end $$;
create function icue_rooms.send(p_room_id uuid,p_client_id uuid,p_document jsonb,p_files uuid[] default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id bigint;v_doc jsonb;v_files uuid[];v_count integer;v_text integer;begin
 perform icue_rooms.authorize(p_room_id,true);
 if p_client_id is null or p_files is null or cardinality(p_files)>5 or array_position(p_files,null) is not null
 or cardinality(p_files)<>(select count(distinct x) from unnest(p_files)x) then raise invalid_parameter_value using message='Invalid message or files.';end if;
 v_text:=icue_rooms.validate_document(p_document);
 if v_text=0 and cardinality(p_files)=0 then raise invalid_parameter_value using message='Message is empty.';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 perform 1 from icue_rooms.rooms where id=p_room_id for update;
 perform icue_rooms.authorize(p_room_id,true);
 select id,document into v_id,v_doc from icue_rooms.messages where room_id=p_room_id and user_id=auth.uid() and client_id=p_client_id;
 if v_id is not null then
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into v_files from icue_rooms.files where message_id=v_id;
  if v_doc<>p_document or v_files<>(select coalesce(array_agg(x order by x),'{}'::uuid[]) from unnest(p_files)x)
  then raise invalid_parameter_value using message='Retry payload does not match.';end if;
  return jsonb_build_object('message',icue_rooms.message_json(v_id));
 end if;
 if (select count(*) from icue_rooms.messages where user_id=auth.uid() and created_at>clock_timestamp()-interval '1 minute')>=30
 then raise program_limit_exceeded using message='Please wait before sending more messages.';end if;
 perform 1 from icue_rooms.files where id=any(p_files) for update;
 select count(*) into v_count from icue_rooms.files where id=any(p_files) and room_id=p_room_id and user_id=auth.uid()
 and state='ready' and message_id is null and created_at>clock_timestamp()-interval '1 hour';
 if v_count<>cardinality(p_files) then raise insufficient_privilege using message='Files unavailable.';end if;
 insert into icue_rooms.messages(room_id,user_id,client_id,document) values(p_room_id,auth.uid(),p_client_id,p_document) returning id into v_id;
 update icue_rooms.files set message_id=v_id where id=any(p_files);
 update icue_rooms.rooms set updated_at=clock_timestamp() where id=p_room_id;
 return jsonb_build_object('message',icue_rooms.message_json(v_id));
end $$;
create function icue_rooms.participant_list(p_room_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform icue_rooms.authorize(p_room_id);
 if not icue_rooms.can_manage() then raise insufficient_privilege using message='Room manager required.';end if;
 return jsonb_build_object('participants',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name,'role',p.role) order by p.display_name,p.id)
 from icue_rooms.participants x join public.profiles p on p.id=x.user_id where x.room_id=p_room_id),'[]'::jsonb));
end $$;
create function icue_rooms.create_room(p_name text,p_customer_ids uuid[]) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if (select count(*) from icue_rooms.rooms where created_by=auth.uid() and created_at>clock_timestamp()-interval '1 day')>=30
 then raise program_limit_exceeded using message='Room creation limit reached.';end if;
 insert into icue_rooms.rooms(name,kind,created_by) values(btrim(p_name),'customers',auth.uid()) returning id into v_id;
 insert into icue_rooms.participants(room_id,user_id) select v_id,x from unnest(array_append(p_customer_ids,auth.uid()))x;
 return jsonb_build_object('room',(select to_jsonb(r) from icue_rooms.rooms r where id=v_id));
end $$;
create function icue_rooms.manage_members(p_room_id uuid,p_user_id uuid,p_action text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform 1 from icue_rooms.rooms where id=p_room_id for update;
 perform icue_rooms.authorize(p_room_id,true);
 if not icue_rooms.can_manage() or not exists(select 1 from icue_rooms.rooms where id=p_room_id and kind='customers')
 then raise insufficient_privilege using message='Private room manager required.';end if;
 if p_action is null or p_action not in ('add','remove') or p_user_id is null or p_user_id=auth.uid()
 then raise invalid_parameter_value using message='Invalid membership action.';end if;
 if p_action='add' then
  if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_user_id and p.role::text in ('customer','manager','admin','owner')
   and not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp()))
  then raise insufficient_privilege using message='Account unavailable.';end if;
  if (select count(*) from icue_rooms.participants where room_id=p_room_id)>=100 then raise program_limit_exceeded using message='Room is full.';end if;
  insert into icue_rooms.participants(room_id,user_id) values(p_room_id,p_user_id) on conflict do nothing;
 else delete from icue_rooms.participants where room_id=p_room_id and user_id=p_user_id;
 end if;
 return icue_rooms.participant_list(p_room_id);
end $$;
create function icue_rooms.archive_room(p_room_id uuid,p_archived boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform 1 from icue_rooms.rooms where id=p_room_id for update;
 perform icue_rooms.authorize(p_room_id);
 if not icue_rooms.can_manage() or not exists(select 1 from icue_rooms.rooms where id=p_room_id and kind='customers')
 then raise insufficient_privilege using message='Private room manager required.';end if;
 if p_archived is null then raise invalid_parameter_value;end if;
 update icue_rooms.rooms set archived=p_archived,updated_at=clock_timestamp() where id=p_room_id;
 return jsonb_build_object('room',(select to_jsonb(r) from icue_rooms.rooms r where id=p_room_id));
end $$;
create function icue_rooms.customers(p_search text default '') returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not icue_rooms.can_manage() then raise insufficient_privilege using message='Room manager required.';end if;
 if p_search is null or char_length(p_search)>100 then raise invalid_parameter_value;end if;
 return jsonb_build_object('customers',coalesce((select jsonb_agg(to_jsonb(s)) from (
 select p.id,p.display_name,u.email from public.profiles p join auth.users u on u.id=p.id where p.role::text='customer'
 and not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp())
 and (p_search='' or position(lower(p_search) in lower(p.display_name||' '||coalesce(u.email,'')))>0)
 order by p.display_name,p.id limit 50)s),'[]'::jsonb));
end $$;

create function icue_rooms.queue_deleted_file() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into icue_rooms.file_cleanup(path) values(old.path) on conflict do nothing;return old;end $$;
create trigger queue_deleted_room_file before delete on icue_rooms.files for each row execute function icue_rooms.queue_deleted_file();
create function icue_rooms.file_authorize(p_room_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform icue_rooms.authorize(p_room_id,true);
 perform 1 from public.profiles where id=auth.uid() for update;
 if (select count(*) from icue_rooms.upload_attempts where user_id=auth.uid() and created_at>clock_timestamp()-interval '10 minutes')>=20
 then raise program_limit_exceeded using message='Please wait before uploading more files.';end if;
 insert into icue_rooms.upload_attempts(user_id) values(auth.uid());
 return jsonb_build_object('room_id',p_room_id);
end $$;
create function icue_rooms.file_reserve(p_room_id uuid,p_client_id uuid,p_name text,p_mime text,p_size integer,p_sha256 text) returns jsonb language plpgsql security definer set search_path='' as $$
declare f icue_rooms.files;v_id uuid:=gen_random_uuid();v_ext text;begin
 perform icue_rooms.authorize(p_room_id,true);
 v_ext:=lower(substring(p_name from '\.([a-zA-Z0-9]+)$'));
 if p_client_id is null or p_name is null or v_ext is null or char_length(p_name) not between 1 and 180 or p_name ~ '[[:cntrl:]/\\]'
 or p_mime is null or p_size is null or p_size not between 1 and 4194304 or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$'
 or not ((p_mime='image/png' and v_ext='png') or (p_mime='image/jpeg' and v_ext in ('jpg','jpeg')) or (p_mime='image/webp' and v_ext='webp') or (p_mime='video/mp4' and v_ext='mp4'))
 then raise invalid_parameter_value using message='Unsupported file.';end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 perform 1 from icue_rooms.rooms where id=p_room_id for update;
 perform icue_rooms.authorize(p_room_id,true);
 select * into f from icue_rooms.files where room_id=p_room_id and user_id=auth.uid() and client_id=p_client_id;
 if f.id is not null then
  if f.name<>p_name or f.mime<>p_mime or f.size<>p_size or f.sha256<>p_sha256 or f.created_at<=clock_timestamp()-interval '1 hour'
  then raise invalid_parameter_value using message='File retry mismatch or expired.';end if;
  return to_jsonb(f)-array['user_id','message_id','created_at']||jsonb_build_object('status',f.state);
 end if;
 if (select count(*) from icue_rooms.files where user_id=auth.uid() and created_at>clock_timestamp()-interval '10 minutes')>=20
 or coalesce((select sum(size) from icue_rooms.files where room_id=p_room_id),0)+p_size>209715200
 then raise program_limit_exceeded using message='Room file limit reached.';end if;
 insert into icue_rooms.files(id,room_id,user_id,client_id,name,mime,size,sha256,path)
 values(v_id,p_room_id,auth.uid(),p_client_id,p_name,p_mime,p_size,p_sha256,p_room_id::text||'/'||v_id::text||'.'||v_ext) returning * into f;
 return to_jsonb(f)-array['user_id','message_id','created_at']||jsonb_build_object('status',f.state);
end $$;
create function icue_rooms.file_ready(p_id uuid,p_size integer,p_sha256 text) returns jsonb language plpgsql security definer set search_path='' as $$
declare f icue_rooms.files;begin
 select * into f from icue_rooms.files where id=p_id;
 if f.id is null then raise insufficient_privilege using message='File unavailable.';end if;
 perform 1 from icue_rooms.rooms where id=f.room_id for update;
 select * into f from icue_rooms.files where id=p_id for update;
 if f.id is null or p_size is null or p_sha256 is null or f.size<>p_size or f.sha256<>p_sha256 or f.created_at<=clock_timestamp()-interval '1 hour'
 or not exists(select 1 from auth.users u join public.profiles p on p.id=u.id join icue_rooms.rooms r on r.id=f.room_id
 where u.id=f.user_id and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and u.deleted_at is null
 and (u.banned_until is null or u.banned_until<=clock_timestamp()) and not r.archived
 and ((r.kind='members' and p.role::text in ('member','author','manager','admin','owner'))
 or (r.kind='customers' and exists(select 1 from icue_rooms.participants x where x.room_id=r.id and x.user_id=u.id))))
 then raise insufficient_privilege using message='File unavailable or expired.';end if;
 update icue_rooms.files set state='ready' where id=p_id;
 return jsonb_build_object('id',f.id,'name',f.name,'mime',f.mime,'size',f.size,'sha256',f.sha256,'path',f.path,'status','ready');
end $$;
create function icue_rooms.file_download(p_room_id uuid,p_file uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare f icue_rooms.files;begin
 perform icue_rooms.authorize(p_room_id);
 select * into f from icue_rooms.files where id=p_file and room_id=p_room_id and state='ready'
 and (message_id is not null or (user_id=auth.uid() and created_at>clock_timestamp()-interval '1 hour'));
 if f.id is null then raise insufficient_privilege using message='File unavailable.';end if;
 return jsonb_build_object('id',f.id,'name',f.name,'mime',f.mime,'size',f.size,'sha256',f.sha256,'path',f.path);
end $$;
create function icue_rooms.file_discard(p_room_id uuid,p_file uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform icue_rooms.authorize(p_room_id);
 perform 1 from icue_rooms.rooms where id=p_room_id for update;
 delete from icue_rooms.files where id=p_file and room_id=p_room_id and user_id=auth.uid() and message_id is null;
end $$;
create function icue_rooms.file_reject(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin delete from icue_rooms.files where id=p_id;end $$;
create function icue_rooms.cleanup_batch() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 delete from icue_rooms.files where message_id is null and created_at<=clock_timestamp()-interval '1 hour';
 delete from icue_rooms.network_events where created_at<clock_timestamp()-interval '7 days';
 delete from icue_rooms.upload_attempts where created_at<=clock_timestamp()-interval '10 minutes';
 return jsonb_build_object('paths',coalesce((select jsonb_agg(path) from (select path from icue_rooms.file_cleanup order by created_at limit 100)s),'[]'::jsonb));
end $$;
create function icue_rooms.cleanup_ack(p_paths text[]) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_paths is null or cardinality(p_paths)>100 then raise invalid_parameter_value;end if;
 delete from icue_rooms.file_cleanup where path=any(p_paths);
end $$;
create function icue_rooms.network_record(p_user_id uuid,p_ip text,p_source text,p_vpn_status text default 'unknown',p_proxy_status text default 'unknown',p_provider text default null) returns void language plpgsql security definer set search_path='' as $$
declare v_ip inet;begin
 if p_user_id is null or p_source is null or char_length(p_source) not between 1 and 80 or p_source ~ '[[:cntrl:]]'
 or p_vpn_status is null or p_vpn_status not in ('unknown','detected','not_detected') or p_proxy_status is null or p_proxy_status not in ('unknown','detected','not_detected')
 or char_length(p_provider)>100 or p_provider ~ '[[:cntrl:]]' or char_length(p_ip)>64
 then raise invalid_parameter_value using message='Invalid network observation.';end if;
 begin v_ip:=nullif(p_ip,'')::inet;exception when invalid_text_representation then raise invalid_parameter_value using message='Invalid IP address.';end;
 if v_ip is not null and masklen(v_ip)<>(case family(v_ip) when 4 then 32 else 128 end) then raise invalid_parameter_value using message='Host IP required.';end if;
 perform 1 from public.profiles where id=p_user_id for update;
 if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=p_user_id and not coalesce(u.is_anonymous,false)
  and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp()))
 then raise insufficient_privilege using message='Verified account required.';end if;
 if exists(select 1 from icue_rooms.network_events where user_id=p_user_id and created_at>clock_timestamp()-interval '1 minute') then return;end if;
 insert into icue_rooms.network_events(user_id,ip,source,vpn_status,proxy_status,provider) values(p_user_id,v_ip,p_source,p_vpn_status,p_proxy_status,p_provider);
end $$;
create function icue_rooms.network_events(p_room_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform icue_rooms.authorize(p_room_id);
 if not icue_rooms.can_manage() then raise insufficient_privilege using message='Room manager required.';end if;
 return jsonb_build_object('events',coalesce((select jsonb_agg(to_jsonb(s)) from (select e.id,e.user_id,p.display_name,e.ip,e.source,e.vpn_status,e.proxy_status,e.provider,e.created_at
 from icue_rooms.network_events e join public.profiles p on p.id=e.user_id join icue_rooms.rooms r on r.id=p_room_id
 where e.created_at>clock_timestamp()-interval '7 days' and ((r.kind='members' and p.role::text in ('member','author','manager','admin','owner'))
 or (r.kind='customers' and exists(select 1 from icue_rooms.participants x where x.room_id=r.id and x.user_id=e.user_id)))
 order by e.created_at desc,e.id desc limit 100)s),'[]'::jsonb));
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('room-chat','room-chat',false,4194304,array['image/png','image/jpeg','image/webp','video/mp4']);
create policy room_storage_private on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'room-chat') with check(bucket_id<>'room-chat');

-- Public wrappers never elevate privileges. Only named private entrypoints are
-- executable, and all helpers/raw tables stay inaccessible to browser roles.
create function public.room_chat_bootstrap() returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.bootstrap(); $$;
create function public.room_chat_messages(p_room_id uuid,p_before bigint default null) returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.read_messages(p_room_id,p_before); $$;
create function public.room_chat_send(p_room_id uuid,p_client_id uuid,p_document jsonb,p_files uuid[] default '{}') returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.send(p_room_id,p_client_id,p_document,p_files); $$;
create function public.room_chat_create(p_name text,p_customer_ids uuid[]) returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.create_room(p_name,p_customer_ids); $$;
create function public.room_chat_participants(p_room_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.participant_list(p_room_id); $$;
create function public.room_chat_members(p_room_id uuid,p_user_id uuid,p_action text) returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.manage_members(p_room_id,p_user_id,p_action); $$;
create function public.room_chat_archive(p_room_id uuid,p_archived boolean) returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.archive_room(p_room_id,p_archived); $$;
create function public.room_chat_customers(p_search text default '') returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.customers(p_search); $$;
create function public.room_chat_file_authorize(p_room_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.file_authorize(p_room_id); $$;
create function public.room_chat_file_reserve(p_room_id uuid,p_client_id uuid,p_name text,p_mime text,p_size integer,p_sha256 text) returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.file_reserve(p_room_id,p_client_id,p_name,p_mime,p_size,p_sha256); $$;
create function public.room_chat_file_ready(p_id uuid,p_size integer,p_sha256 text) returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.file_ready(p_id,p_size,p_sha256); $$;
create function public.room_chat_file_download(p_room_id uuid,p_file uuid) returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.file_download(p_room_id,p_file); $$;
create function public.room_chat_file_discard(p_room_id uuid,p_file uuid) returns void language sql security invoker set search_path='' as $$ select icue_rooms.file_discard(p_room_id,p_file); $$;
create function public.room_chat_file_reject(p_id uuid) returns void language sql security invoker set search_path='' as $$ select icue_rooms.file_reject(p_id); $$;
create function public.room_chat_cleanup_batch() returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.cleanup_batch(); $$;
create function public.room_chat_cleanup_ack(p_paths text[]) returns void language sql security invoker set search_path='' as $$ select icue_rooms.cleanup_ack(p_paths); $$;
create function public.room_chat_network_record(p_user_id uuid,p_ip text,p_source text,p_vpn_status text default 'unknown',p_proxy_status text default 'unknown',p_provider text default null) returns void language sql security invoker set search_path='' as $$ select icue_rooms.network_record(p_user_id,p_ip,p_source,p_vpn_status,p_proxy_status,p_provider); $$;
create function public.room_chat_network_events(p_room_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select icue_rooms.network_events(p_room_id); $$;
revoke all on all functions in schema icue_rooms from public,anon,authenticated,service_role;
do $$ declare f record;v_role text;v_private text;begin
 for f in select p.oid::regprocedure as signature,p.proname,p.proargtypes from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'room_chat_%' loop
  execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
  v_role:=case when f.proname in ('room_chat_file_ready','room_chat_file_reject','room_chat_cleanup_batch','room_chat_cleanup_ack','room_chat_network_record') then 'service_role' else 'authenticated' end;
  execute format('grant execute on function %s to %I',f.signature,v_role);
 end loop;
end $$;
grant execute on function icue_rooms.bootstrap(),icue_rooms.read_messages(uuid,bigint),icue_rooms.send(uuid,uuid,jsonb,uuid[]),
 icue_rooms.create_room(text,uuid[]),icue_rooms.participant_list(uuid),icue_rooms.manage_members(uuid,uuid,text),icue_rooms.archive_room(uuid,boolean),icue_rooms.customers(text),
 icue_rooms.file_authorize(uuid),icue_rooms.file_reserve(uuid,uuid,text,text,integer,text),icue_rooms.file_download(uuid,uuid),icue_rooms.file_discard(uuid,uuid),icue_rooms.network_events(uuid) to authenticated;
grant execute on function icue_rooms.file_ready(uuid,integer,text),icue_rooms.file_reject(uuid),icue_rooms.cleanup_batch(),icue_rooms.cleanup_ack(text[]),icue_rooms.network_record(uuid,text,text,text,text,text) to service_role;

-- Keep the existing five-minute Cron schedule and return signature. Both file
-- workers reuse the existing Vault key, which never enters browser configuration.
create or replace function icue_support.dispatch_cleanup() returns bigint language plpgsql security definer set search_path='' as $$
declare v_endpoint text;v_key text;v_request bigint;
begin
 select endpoint into v_endpoint from icue_support.cleanup_config where id;
 if v_endpoint is null then return null;end if;
 if v_endpoint !~ '^https://[a-z0-9]+\.supabase\.co/functions/v1/support-chat-files$' then raise invalid_parameter_value using message='Invalid cleanup endpoint.';end if;
 select decrypted_secret into v_key from vault.decrypted_secrets where name='icue_support_cleanup_key';
 select net.http_post(url:=v_endpoint,headers:=jsonb_build_object('Content-Type','application/json','x-cleanup-key',v_key),body:='{"action":"cleanup"}'::jsonb,timeout_milliseconds:=10000) into v_request;
 perform net.http_post(url:=regexp_replace(v_endpoint,'support-chat-files$','room-chat-files'),headers:=jsonb_build_object('Content-Type','application/json','x-cleanup-key',v_key),body:='{"action":"cleanup"}'::jsonb,timeout_milliseconds:=10000);
 return v_request;
end $$;
revoke all on function icue_support.dispatch_cleanup() from public,anon,authenticated,service_role;
commit;
