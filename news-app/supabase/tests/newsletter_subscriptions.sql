-- Entire test rolls back synthetic subscribers and publications; sends no mail.
begin;
do $$ declare f record; begin
 assert not has_schema_privilege('anon','icue_newsletter','USAGE'), 'Subscriber schema is private';
 assert not has_schema_privilege('authenticated','icue_newsletter','USAGE'), 'Accounts cannot enumerate subscribers';
 assert not has_table_privilege('anon','icue_newsletter.subscribers','SELECT'), 'Addresses are never public';
 assert not has_table_privilege('authenticated','icue_newsletter.subscribers','SELECT'), 'Accounts cannot read newsletter addresses';
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'newsletter_%' loop
  assert not has_function_privilege('anon',f.oid,'EXECUTE'), 'Anon cannot call privileged newsletter RPCs';
  assert not has_function_privilege('authenticated',f.oid,'EXECUTE'), 'Accounts cannot call privileged newsletter RPCs';
  assert has_function_privilege('service_role',f.oid,'EXECUTE'), 'Only service calls can manage subscriptions';
 end loop;
 assert not public.newsletter_dispatch_key_valid(''), 'Empty scheduler credentials fail closed';
 assert not public.newsletter_dispatch_key_valid(repeat('a',64)), 'Missing Vault credentials fail closed';
end $$;
set local role anon;
do $$ begin
 begin
  perform public.newsletter_subscribe('forged@example.invalid','en',repeat('a',64));
  raise exception 'FAIL: anon subscription RPC access';
 exception when insufficient_privilege then null; end;
 begin
  perform 1 from icue_newsletter.subscribers;
  raise exception 'FAIL: anon address enumeration';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
select public.newsletter_subscribe('  Newsletter-One@Example.invalid  ','en',repeat('1',64));
reset role;

insert into auth.users(id,email) values('00000000-0000-4000-8000-000000009201','newsletter-author@example.invalid');
update public.profiles set role='author' where id='00000000-0000-4000-8000-000000009201';

do $$ declare
 s icue_newsletter.subscribers;
 s2 icue_newsletter.subscribers;
 receipt jsonb;
 c record;
 claim_id uuid;
 claim_key uuid;
 old_key uuid;
 old_confirm text;
 old_unsubscribe text;
 queue_count integer;
begin
 select * into s from icue_newsletter.subscribers where email='newsletter-one@example.invalid';
 assert s.id is not null and s.status='pending' and s.locale='en', 'Email normalizes and starts unconfirmed';
 assert s.confirmation_token<>s.unsubscribe_token, 'Confirmation and unsubscribe capabilities differ';
 assert not public.newsletter_confirm(s.unsubscribe_token), 'Unsubscribe URL cannot grant consent';
 assert not public.newsletter_confirm(repeat('f',64)), 'Unknown confirmation is rejected';
 assert not public.newsletter_confirm('bad token'), 'Malformed confirmation is rejected';
 assert (select count(*)=1 from icue_newsletter.deliveries where subscriber_id=s.id and kind='confirmation'), 'Confirmation mail is queued durably';
 receipt:=public.newsletter_subscribe('NEWSLETTER-ONE@example.invalid','en',repeat('2',64));
 assert not (receipt->>'queued')::boolean, 'Recently requested addresses silently respect the email resend cooldown';
 assert (select count(*)=1 from icue_newsletter.subscribers), 'Case variants do not create subscribers';

 select * into c from public.newsletter_claim(1,s.id);
 assert c.email=s.email and c.kind='confirmation' and c.token=s.confirmation_token, 'Claims carry the appropriate delivery capability';
 claim_id:=c.id; claim_key:=c.claim_token;
 assert not exists(select 1 from public.newsletter_claim(10,s.id)), 'An in-flight lease cannot be claimed again';
 assert not public.newsletter_finish(claim_id,gen_random_uuid(),null), 'Forged lease acknowledgements fail';
 assert public.newsletter_finish(claim_id,claim_key,'smtp_delivery_failed'), 'SMTP errors are recorded';
 assert (select sent_at is null and error='smtp_delivery_failed' and next_attempt_at>clock_timestamp()
  from icue_newsletter.deliveries where id=claim_id), 'Failed mail remains pending with backoff';
 assert not exists(select 1 from public.newsletter_claim(10,s.id)), 'Backoff blocks immediate retry';
 update icue_newsletter.deliveries set next_attempt_at=clock_timestamp()-interval '1 minute' where id=claim_id;
 select * into c from public.newsletter_claim(1,s.id);
 old_key:=c.claim_token;
 update icue_newsletter.deliveries set claimed_until=clock_timestamp()-interval '1 minute' where id=claim_id;
 select * into c from public.newsletter_claim(1,s.id);
 assert c.claim_token<>old_key, 'Expired leases get new capabilities';
 assert not public.newsletter_finish(claim_id,old_key,null), 'A stale worker cannot acknowledge a newer lease';
 assert public.newsletter_finish(claim_id,c.claim_token,null), 'Current worker can acknowledge SMTP acceptance';
 assert not exists(select 1 from public.newsletter_claim(10,s.id)), 'Accepted mail is not claimed twice';
 update icue_newsletter.subscribers set last_requested_at=clock_timestamp()-interval '10 minutes' where id=s.id;
 perform public.newsletter_subscribe(s.email,'en',repeat('1',64));
 update icue_newsletter.deliveries set attempts=10,error='smtp_delivery_failed',next_attempt_at=clock_timestamp()+interval '24 hours'
  where subscriber_id=s.id and sent_at is null and cancelled_at is null;
 assert not exists(select 1 from public.newsletter_claim(10,s.id)), 'Exhausted mail stops automatic retries';
 update icue_newsletter.subscribers set last_requested_at=clock_timestamp()-interval '10 minutes' where id=s.id;
 perform public.newsletter_subscribe(s.email,'en',repeat('1',64));
 select * into c from public.newsletter_claim(1,s.id);
 assert c.id is not null and c.kind='confirmation', 'Explicit resend revives an exhausted confirmation';
 assert public.newsletter_finish(c.id,c.claim_token,null), 'Revived mail can be acknowledged';

 receipt:=public.newsletter_subscribe('newsletter-two@example.invalid','vi',repeat('3',64));
 select * into s2 from icue_newsletter.subscribers where id=(receipt->>'id')::uuid;
 update icue_newsletter.subscribers set confirmation_expires_at=clock_timestamp()-interval '1 minute' where id=s2.id;
 assert not public.newsletter_confirm(s2.confirmation_token), 'Expired confirmations cannot grant consent';
 assert not exists(select 1 from public.newsletter_claim(10,s2.id)), 'Expired confirmation mail is suppressed';
 assert public.newsletter_confirm(s.confirmation_token), 'Confirmation grants consent';
 assert public.newsletter_confirm(s.confirmation_token), 'Confirmation is idempotent';
 receipt:=public.newsletter_subscribe('NEWSLETTER-ONE@example.invalid','en',repeat('4',64));
 assert not (receipt->>'queued')::boolean, 'Active subscribers do not receive repeated confirmations';

 insert into public.articles(id,slug,title,author_id,status) values
  ('10000000-0000-4000-8000-000000009201','newsletter-fixture','Newsletter article','00000000-0000-4000-8000-000000009201','draft');
 assert not exists(select 1 from icue_newsletter.deliveries where kind='article'), 'Drafts do not enqueue mail';
 update public.articles set status='published' where id='10000000-0000-4000-8000-000000009201';
 assert (select count(*)=1 from icue_newsletter.deliveries where kind='article'), 'Publication queues only currently confirmed readers';
 update public.articles set title='Edited headline' where id='10000000-0000-4000-8000-000000009201';
 update public.articles set status='published' where id='10000000-0000-4000-8000-000000009201';
 update public.articles set status='draft' where id='10000000-0000-4000-8000-000000009201';
 update public.articles set status='published' where id='10000000-0000-4000-8000-000000009201';
 assert (select count(*)=1 from icue_newsletter.deliveries where kind='article'), 'Edits and republishing never send a second announcement';
 select * into c from public.newsletter_claim(10,s.id);
 assert c.kind='article' and c.article_title='Edited headline' and c.article_slug='newsletter-fixture'
  and c.token=s.unsubscribe_token, 'Worker gets current published headline and unsubscribe link';
 assert public.newsletter_finish(c.id,c.claim_token,null), 'Article delivery can be acknowledged';

 insert into public.articles(id,slug,title,author_id,status) values
  ('10000000-0000-4000-8000-000000009202','newsletter-withdrawn','Withdrawn article','00000000-0000-4000-8000-000000009201','published');
 update public.articles set status='draft' where id='10000000-0000-4000-8000-000000009202';
 assert not exists(select 1 from public.newsletter_claim(10,s.id)), 'Withdrawn articles are never sent';
 assert (select cancelled_at is not null from icue_newsletter.deliveries where article_id='10000000-0000-4000-8000-000000009202'), 'Withdrawn mail is cancelled durably';
 insert into public.articles(id,slug,title,author_id,status) values
  ('10000000-0000-4000-8000-000000009203','newsletter-delete','Deleted article','00000000-0000-4000-8000-000000009201','published');
 delete from public.articles where id='10000000-0000-4000-8000-000000009203';
 assert not exists(select 1 from public.newsletter_claim(10,s.id)), 'Deleted articles are never sent';
 assert exists(select 1 from icue_newsletter.publications where article_id='10000000-0000-4000-8000-000000009203'), 'Publication tombstones survive deletion';

 insert into public.articles(id,slug,title,author_id,status) values
  ('10000000-0000-4000-8000-000000009204','newsletter-unsubscribe','Unsubscribe fixture','00000000-0000-4000-8000-000000009201','published');
 old_confirm:=s.confirmation_token; old_unsubscribe:=s.unsubscribe_token;
 assert public.newsletter_unsubscribe(old_unsubscribe), 'Unsubscribe immediately withdraws consent';
 assert public.newsletter_unsubscribe(old_unsubscribe), 'Unsubscribe is idempotent';
 assert not public.newsletter_confirm(old_confirm), 'Old confirmation cannot reactivate an unsubscribed reader';
 assert not exists(select 1 from public.newsletter_claim(10,s.id)), 'Queued article mail stops after unsubscribe';
 assert not exists(select 1 from icue_newsletter.deliveries where subscriber_id=s.id and sent_at is null and cancelled_at is null), 'Unsubscribe cancels all outstanding work';
 update icue_newsletter.subscribers set last_requested_at=clock_timestamp()-interval '10 minutes' where id=s.id;
 perform public.newsletter_subscribe(s.email,'fr',repeat('5',64));
 select * into s from icue_newsletter.subscribers where id=s.id;
 assert s.status='pending' and s.locale='fr' and s.confirmation_token<>old_confirm and s.unsubscribe_token<>old_unsubscribe,
  'Resubscription rotates capabilities and requires fresh consent';
 assert not public.newsletter_confirm(old_confirm), 'Previous-generation confirmation stays invalid';
 assert not public.newsletter_unsubscribe(old_unsubscribe), 'Previous-generation unsubscribe does not revoke new consent';
 assert public.newsletter_confirm(s.confirmation_token), 'Fresh confirmation works';

 -- Different email addresses cannot evade the per-network limit.
 for queue_count in 1..5 loop
  perform public.newsletter_subscribe('newsletter-rate-'||queue_count||'@example.invalid','en',repeat('6',64));
 end loop;
 begin
  perform public.newsletter_subscribe('newsletter-rate-over@example.invalid','en',repeat('6',64));
  raise exception 'FAIL: IP limit bypass';
 exception when raise_exception then if sqlerrm<>'NEWSLETTER_RATE_LIMIT' then raise; end if; end;
 begin
  perform public.newsletter_subscribe(s.email,'fr',repeat('6',64));
  raise exception 'FAIL: exhausted IP probes an active subscriber';
 exception when raise_exception then if sqlerrm<>'NEWSLETTER_RATE_LIMIT' then raise; end if; end;
 begin
  perform public.newsletter_subscribe('newsletter-rate-1@example.invalid','en',repeat('6',64));
  raise exception 'FAIL: exhausted IP probes a pending subscriber';
 exception when raise_exception then if sqlerrm<>'NEWSLETTER_RATE_LIMIT' then raise; end if; end;
 begin
  perform public.newsletter_subscribe(E'bad\n@example.invalid','en',repeat('7',64));
  raise exception 'FAIL: invalid email';
 exception when raise_exception then if sqlerrm<>'NEWSLETTER_INVALID_REQUEST' then raise; end if; end;
 for old_confirm in select unnest(array['one@example.invalid,two@example.invalid','Name <one@example.invalid>',
  'one@example.invalid;two@example.invalid','.leading@example.invalid','trailing.@example.invalid',
  'double..dot@example.invalid','local@-bad.example','local@bad-.example','local@bad..example',
  'local@localhost',repeat('a',65)||'@example.invalid','local@'||repeat('a',64)||'.invalid']) loop
  begin
   perform public.newsletter_subscribe(old_confirm,'en',repeat('7',64));
   raise exception 'FAIL: invalid mailbox %',old_confirm;
  exception when raise_exception then if sqlerrm<>'NEWSLETTER_INVALID_REQUEST' then raise; end if; end;
 end loop;
 perform public.newsletter_subscribe('valid.tag+news@example.invalid','en',repeat('8',64));
end $$;
rollback;
