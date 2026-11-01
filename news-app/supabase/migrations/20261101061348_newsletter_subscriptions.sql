begin;

-- Subscriber addresses and email capabilities never enter an exposed schema.
-- Only the server-only service role can call the narrowly scoped RPCs below.
create schema icue_newsletter;
revoke all on schema icue_newsletter from public, anon, authenticated;

create table icue_newsletter.subscribers (
 id uuid primary key default gen_random_uuid(),
 email text not null unique check(email=lower(btrim(email)) and char_length(email)<=254),
 locale text not null default 'vi' check(locale in ('vi','en','de','fr','ja','ko')),
 status text not null default 'pending' check(status in ('pending','active','unsubscribed')),
 confirmation_token text not null unique,
 unsubscribe_token text not null unique,
 confirmation_expires_at timestamptz not null,
 created_at timestamptz not null default clock_timestamp(),
 last_requested_at timestamptz not null default clock_timestamp(),
 confirmed_at timestamptz,
 unsubscribed_at timestamptz
);
create table icue_newsletter.requests (
 id bigint generated always as identity primary key,
 ip_hash text not null check(ip_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default clock_timestamp()
);
create index newsletter_active_subscribers_idx on icue_newsletter.subscribers(id) where status='active';
create index newsletter_request_rate_idx on icue_newsletter.requests(ip_hash,created_at);
create index newsletter_request_expiry_idx on icue_newsletter.requests(created_at);
-- A tombstone outlives deletion and prevents edits or republishing from sending
-- a second announcement. Existing published articles are never backfilled.
create table icue_newsletter.publications (
 article_id uuid primary key,
 created_at timestamptz not null default clock_timestamp()
);
insert into icue_newsletter.publications(article_id)
 select id from public.articles where status='published' or published_at is not null;
create table icue_newsletter.deliveries (
 id uuid primary key default gen_random_uuid(),
 subscriber_id uuid not null references icue_newsletter.subscribers(id) on delete cascade,
 article_id uuid references public.articles(id) on delete cascade,
 kind text not null check(kind in ('confirmation','article')),
 token text not null,
 article_title text,
 article_slug text,
 created_at timestamptz not null default clock_timestamp(),
 attempts integer not null default 0,
 claim_token uuid,
 claimed_until timestamptz,
 next_attempt_at timestamptz not null default clock_timestamp(),
 sent_at timestamptz,
 cancelled_at timestamptz,
 error text,
 unique(subscriber_id,article_id),
 check((kind='article')=(article_id is not null))
);
create index newsletter_delivery_due_idx on icue_newsletter.deliveries(next_attempt_at,created_at)
 where sent_at is null and cancelled_at is null;
-- The subscriber/article unique index also supports subscriber FK lookups.
create index newsletter_delivery_article_idx on icue_newsletter.deliveries(article_id) where article_id is not null;
alter table icue_newsletter.subscribers enable row level security;
alter table icue_newsletter.requests enable row level security;
alter table icue_newsletter.publications enable row level security;
alter table icue_newsletter.deliveries enable row level security;
revoke all on all tables in schema icue_newsletter from public,anon,authenticated;
revoke all on all sequences in schema icue_newsletter from public,anon,authenticated;

create function public.newsletter_subscribe(p_email text,p_locale text,p_ip_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_email text := lower(btrim(p_email));
 v_local text := split_part(v_email,'@',1);
 v_locale text := case when p_locale in ('vi','en','de','fr','ja','ko') then p_locale else 'vi' end;
 v_sub icue_newsletter.subscribers;
 v_now timestamptz := clock_timestamp();
begin
 if v_email is null or char_length(v_email)>254 or char_length(v_local)>64
   or v_local like '.%' or v_local like '%.' or position('..' in v_local)>0
   or v_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
   or exists(select 1 from unnest(string_to_array(split_part(v_email,'@',2),'.')) label where char_length(label)>63)
   or p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
  raise exception 'NEWSLETTER_INVALID_REQUEST';
 end if;
 -- Serialize both rate-limit counters and email upserts across concurrent calls.
 perform pg_advisory_xact_lock(hashtextextended('newsletter-ip:'||p_ip_hash,0));
 perform pg_advisory_xact_lock(hashtextextended('newsletter-email:'||v_email,0));
 -- Count every request before inspecting subscriber state. An exhausted
 -- network gets the same limit response for fresh and existing addresses.
 if (select count(*) from icue_newsletter.requests where ip_hash=p_ip_hash and created_at>v_now-interval '1 hour')>=5 then
  raise exception 'NEWSLETTER_RATE_LIMIT';
 end if;
 insert into icue_newsletter.requests(ip_hash) values(p_ip_hash);
 delete from icue_newsletter.requests where created_at<v_now-interval '24 hours';
 select * into v_sub from icue_newsletter.subscribers where email=v_email for update;
 if v_sub.status='active' then return jsonb_build_object('id',v_sub.id,'queued',false); end if;
 if v_sub.last_requested_at>v_now-interval '5 minutes' then
  -- Keep the public response identical for active and recently requested
  -- addresses so the signup endpoint cannot be used to probe subscription state.
  return jsonb_build_object('id',v_sub.id,'queued',false);
 end if;
 if v_sub.id is null then
  insert into icue_newsletter.subscribers(email,locale,confirmation_token,unsubscribe_token,confirmation_expires_at)
  values(v_email,v_locale,replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),
    replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),v_now+interval '24 hours')
  returning * into v_sub;
 else
  update icue_newsletter.subscribers set locale=v_locale,status='pending',unsubscribed_at=null,
   confirmation_token=case when status='unsubscribed' then replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','') else confirmation_token end,
   unsubscribe_token=case when status='unsubscribed' then replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','') else unsubscribe_token end,
   confirmation_expires_at=v_now+interval '24 hours',last_requested_at=v_now
  where id=v_sub.id returning * into v_sub;
 end if;
 -- Reuse an undelivered confirmation rather than queueing multiple retries.
 -- An explicit request after the cooldown can revive exhausted confirmation
 -- mail. Do not steal a lease from a worker that is still sending it.
 update icue_newsletter.deliveries set attempts=0,error=null,next_attempt_at=v_now,claim_token=null,claimed_until=null
  where subscriber_id=v_sub.id and kind='confirmation' and token=v_sub.confirmation_token
   and sent_at is null and cancelled_at is null and attempts>=10
   and (claimed_until is null or claimed_until<v_now);
 if not exists(select 1 from icue_newsletter.deliveries where subscriber_id=v_sub.id and kind='confirmation'
   and token=v_sub.confirmation_token and sent_at is null and cancelled_at is null) then
  insert into icue_newsletter.deliveries(subscriber_id,kind,token)
   values(v_sub.id,'confirmation',v_sub.confirmation_token);
 end if;
 return jsonb_build_object('id',v_sub.id,'queued',true);
end;
$$;

create function public.newsletter_confirm(p_token text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return false; end if;
 update icue_newsletter.subscribers set status='active',confirmed_at=coalesce(confirmed_at,clock_timestamp())
 where confirmation_token=p_token and (status='active' or (status='pending' and confirmation_expires_at>clock_timestamp()))
 returning id into v_id;
 return v_id is not null;
end;
$$;

create function public.newsletter_unsubscribe(p_token text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return false; end if;
 update icue_newsletter.subscribers set status='unsubscribed',unsubscribed_at=coalesce(unsubscribed_at,clock_timestamp())
 where unsubscribe_token=p_token returning id into v_id;
 if v_id is not null then
  update icue_newsletter.deliveries set cancelled_at=clock_timestamp()
   where subscriber_id=v_id and sent_at is null and cancelled_at is null;
 end if;
 return v_id is not null;
end;
$$;

create function icue_newsletter.enqueue_publication()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_inserted uuid;
begin
 if new.status<>'published' then return new; end if;
 if tg_op='UPDATE' and old.status='published' then return new; end if;
 insert into icue_newsletter.publications(article_id) values(new.id)
  on conflict(article_id) do nothing returning article_id into v_inserted;
 if v_inserted is null then return new; end if;
 insert into icue_newsletter.deliveries(subscriber_id,article_id,kind,token,article_title,article_slug)
  select s.id,new.id,'article',s.unsubscribe_token,new.title,new.slug
  from icue_newsletter.subscribers s where s.status='active'
  on conflict(subscriber_id,article_id) do nothing;
 return new;
end;
$$;
revoke all on function icue_newsletter.enqueue_publication() from public,anon,authenticated;
create trigger newsletter_article_published after insert or update of status on public.articles
 for each row execute function icue_newsletter.enqueue_publication();

create function public.newsletter_claim(p_limit integer default 10,p_subscriber_id uuid default null)
returns table(id uuid,claim_token uuid,kind text,email text,locale text,token text,article_title text,article_slug text)
language plpgsql security definer set search_path='' as $$
begin
 -- Revalidate consent and publication immediately before leasing, including
 -- queued work that outlived deletion, withdrawal or an expired confirmation.
 update icue_newsletter.deliveries d set cancelled_at=clock_timestamp()
 from icue_newsletter.subscribers s
 where d.subscriber_id=s.id and d.sent_at is null and d.cancelled_at is null
  and (p_subscriber_id is null or s.id=p_subscriber_id)
  and ((d.kind='confirmation' and (s.status<>'pending' or s.confirmation_token<>d.token or s.confirmation_expires_at<=clock_timestamp()))
   or (d.kind='article' and (s.status<>'active' or s.unsubscribe_token<>d.token
    or not exists(select 1 from public.articles a where a.id=d.article_id and a.status='published'))));
 return query
 with due as (
  select d.id from icue_newsletter.deliveries d
  where d.sent_at is null and d.cancelled_at is null and d.attempts<10
   and d.next_attempt_at<=clock_timestamp() and (d.claimed_until is null or d.claimed_until<clock_timestamp())
   and (p_subscriber_id is null or d.subscriber_id=p_subscriber_id)
  order by d.created_at,d.id limit greatest(1,least(coalesce(p_limit,10),50)) for update skip locked
 ), claimed as (
  update icue_newsletter.deliveries d set attempts=d.attempts+1,claim_token=gen_random_uuid(),claimed_until=clock_timestamp()+interval '5 minutes'
  from due where d.id=due.id returning d.*
 )
 select c.id,c.claim_token,c.kind,s.email,s.locale,c.token,
  case when c.kind='article' then a.title else null end,
  case when c.kind='article' then a.slug else null end
 from claimed c join icue_newsletter.subscribers s on s.id=c.subscriber_id
 left join public.articles a on a.id=c.article_id;
end;
$$;

create function public.newsletter_finish(p_id uuid,p_claim_token uuid,p_error text default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 update icue_newsletter.deliveries set
  sent_at=case when p_error is null then clock_timestamp() else null end,
  error=case when p_error is null then null else left(p_error,100) end,
  next_attempt_at=case when p_error is null then next_attempt_at else clock_timestamp()+least(interval '24 hours',interval '1 minute'*power(2,attempts)) end,
  claim_token=null,claimed_until=null
 where id=p_id and claim_token=p_claim_token and sent_at is null and cancelled_at is null
 returning id into v_id;
 return v_id is not null;
end;
$$;

-- Supabase Cron stores its dispatch credential in Vault. Dynamic SQL keeps the
-- portable bootstrap usable in isolated Postgres tests without that extension.
create function public.newsletter_dispatch_key_valid(p_key text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_valid boolean;
begin
 if p_key is null or p_key !~ '^[a-f0-9]{64}$' or to_regclass('vault.decrypted_secrets') is null then return false; end if;
 execute 'select exists(select 1 from vault.decrypted_secrets where name=''icue_newsletter_dispatch_key'' and sha256(convert_to(decrypted_secret,''UTF8''))=sha256(convert_to($1,''UTF8'')))'
  into v_valid using p_key;
 return coalesce(v_valid,false);
end;
$$;

revoke all on function public.newsletter_subscribe(text,text,text),public.newsletter_confirm(text),
 public.newsletter_unsubscribe(text),public.newsletter_claim(integer,uuid),public.newsletter_finish(uuid,uuid,text),
 public.newsletter_dispatch_key_valid(text) from public,anon,authenticated;
grant execute on function public.newsletter_subscribe(text,text,text),public.newsletter_confirm(text),
 public.newsletter_unsubscribe(text),public.newsletter_claim(integer,uuid),public.newsletter_finish(uuid,uuid,text),
 public.newsletter_dispatch_key_valid(text) to service_role;
notify pgrst, 'reload schema';
commit;
