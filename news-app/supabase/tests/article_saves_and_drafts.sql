-- Transactional tests with synthetic accounts; never sends email or writes files.
begin;
create function pg_temp.assert_ok(value boolean, message text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %', message; end if; end $$;
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000001','private-one@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000000002','private-two@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000000003','admin@example.invalid','{}');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000003';
select pg_temp.assert_ok(not exists(select 1 from public.profiles where full_name like '%@%' or display_name like 'private-%'), 'public profiles do not contain inferred email identities');
select pg_temp.assert_ok(exists(select 1 from information_schema.columns where table_name='article_translations' and column_name='cover_info'), 'complete fresh bootstrap includes cover translations');
select pg_temp.assert_ok(exists(select 1 from information_schema.columns where table_name='article_translations' and column_name='media'), 'complete fresh bootstrap includes media translations');
select pg_temp.assert_ok(to_regclass('public.assist_threads') is not null, 'complete fresh bootstrap includes assist history');
select pg_temp.assert_ok(not has_function_privilege('anon','public.save_article(uuid,uuid,jsonb,jsonb,timestamp with time zone)','EXECUTE'), 'anonymous accounts cannot call article save');
select pg_temp.assert_ok(not has_function_privilege('authenticated','public.queue_article_storage_cleanup(text,text,uuid)','EXECUTE'), 'cleanup enqueue is an internal function');
select pg_temp.assert_ok(not has_function_privilege('authenticated','public.article_storage_path_referenced(text)','EXECUTE'), 'all-account reference lookup is internal');
select pg_temp.assert_ok(not has_table_privilege('authenticated','public.article_storage_cleanup','UPDATE'), 'accounts cannot forge completion tombstones');

insert into storage.objects(bucket_id,name) values
 ('article-media','00000000-0000-4000-8000-000000000001/media/old.jpg'),
 ('article-media','00000000-0000-4000-8000-000000000001/media/new.jpg'),
 ('article-media','00000000-0000-4000-8000-000000000001/covers/cover.jpg'),
 ('article-media','00000000-0000-4000-8000-000000000001/covers/cover-alt.jpg'),
 ('article-media','00000000-0000-4000-8000-000000000002/media/other.jpg');
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
insert into public.articles(id,slug,title,author_id,status) values
 ('10000000-0000-4000-8000-000000000001','draft-fixture','','00000000-0000-4000-8000-000000000001','draft'),
 ('10000000-0000-4000-8000-000000000002','live-fixture','Live title','00000000-0000-4000-8000-000000000001','published');
update public.articles set published_at = '2026-01-01', content_html = '<p>Original body</p>',
 cover_image_url='https://storage.example.invalid/storage/v1/object/public/article-media/00000000-0000-4000-8000-000000000001/covers/cover.jpg',
 cover_image_alt_url='https://storage.example.invalid/storage/v1/object/public/article-media/00000000-0000-4000-8000-000000000001/covers/cover-alt.jpg',
 cover_storage_path='00000000-0000-4000-8000-000000000001/covers/cover.jpg',
 cover_alt_storage_path='00000000-0000-4000-8000-000000000001/covers/cover-alt.jpg'
where id='10000000-0000-4000-8000-000000000002';
insert into public.article_media(id,article_id,kind,url,storage_path) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','image',
 'https://storage.example.invalid/storage/v1/object/public/article-media/00000000-0000-4000-8000-000000000001/media/old.jpg',
 '00000000-0000-4000-8000-000000000001/media/old.jpg');

select public.save_article('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
 '{"title":"","content_html":"","status":"draft"}','[]');
select pg_temp.assert_ok((select title='' and status='draft' and published_at is null from public.articles where slug='draft-fixture'), 'incomplete drafts save privately');

-- A failure in the final article UPDATE occurs after gallery mutations inside
-- the RPC. PostgreSQL must roll back the gallery and cleanup queue too.
do $$ begin
  perform public.save_article('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002',
   '{"title":"Replacement title","content_html":"<p>Replacement body</p>","status":"published","article_date":"invalid-date"}',
   '[{"id":"20000000-0000-4000-8000-000000000002","kind":"image","url":"https://storage.example.invalid/storage/v1/object/public/article-media/00000000-0000-4000-8000-000000000001/media/new.jpg","storage_path":"00000000-0000-4000-8000-000000000001/media/new.jpg","position":1}]');
  raise exception 'FAIL: invalid date unexpectedly committed';
exception when invalid_datetime_format then null; end $$;
select pg_temp.assert_ok((select title='Live title' and content_html='<p>Original body</p>' from public.articles where slug='live-fixture'), 'article remains unchanged after failed final write');
select pg_temp.assert_ok((select count(*)=1 from public.article_media where id='20000000-0000-4000-8000-000000000001'), 'old gallery survives failed final write');
select pg_temp.assert_ok((select count(*)=0 from public.article_storage_cleanup), 'failed transaction does not enqueue live files');

-- A gallery constraint failure also rolls back a removal in the same request.
do $$ begin
  perform public.save_article('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003',
   '{"title":"New title","content_html":"<p>New body</p>","status":"published"}',
   '[{"id":"20000000-0000-4000-8000-000000000002","kind":"invalid","url":"invalid","position":1}]');
  raise exception 'FAIL: invalid gallery unexpectedly committed';
exception when invalid_text_representation then null; end $$;
select pg_temp.assert_ok((select count(*)=1 from public.article_media where id='20000000-0000-4000-8000-000000000001'), 'old gallery survives gallery insertion failure');

-- Published edits cannot accidentally unpublish the live article.
do $$ begin
  perform public.save_article('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000004','{"status":"draft"}','[]');
  raise exception 'FAIL: published article became draft';
exception when raise_exception then
  if sqlerrm <> 'A published article cannot be replaced by a draft' then raise; end if;
end $$;

-- Forged object references cannot make the service worker delete another user's file.
do $$ begin
  perform public.save_article('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000005',
   '{"status":"draft"}',
   '[{"id":"20000000-0000-4000-8000-000000000003","kind":"image","url":"https://storage.example.invalid/other.jpg","storage_path":"00000000-0000-4000-8000-000000000002/media/other.jpg","position":1}]');
  raise exception 'FAIL: another account media path accepted';
exception when insufficient_privilege then null; end $$;

do $$ begin
  update public.profiles set role='admin' where id=auth.uid();
  raise exception 'FAIL: profile owner self-promoted';
exception when insufficient_privilege then null; end $$;

-- Successful saves stamp publication once and explicit retries are idempotent.
select public.save_article('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000006',
 '{"title":"New live title","content_html":"<p>New live body</p>","status":"published","cover_image_url":"https://storage.example.invalid/storage/v1/object/public/article-media/00000000-0000-4000-8000-000000000001/covers/cover.jpg","cover_image_alt_url":"https://storage.example.invalid/storage/v1/object/public/article-media/00000000-0000-4000-8000-000000000001/covers/cover-alt.jpg","cover_storage_path":"00000000-0000-4000-8000-000000000001/covers/cover.jpg","cover_alt_storage_path":"00000000-0000-4000-8000-000000000001/covers/cover-alt.jpg"}','[]');
select public.save_article('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000006',
 '{"title":"New live title","content_html":"<p>New live body</p>","status":"published"}','[]','2000-01-01');
select pg_temp.assert_ok((select title='New live title' and published_at='2026-01-01' from public.articles where slug='live-fixture'), 'retry preserves first publication date');
do $$ begin
  perform public.save_article('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000007',
   '{"title":"Stale title","content_html":"<p>Body</p>","status":"published"}','[]','2000-01-01');
  raise exception 'FAIL: stale editor overwrote live edit';
exception when serialization_failure then null; end $$;
select pg_temp.assert_ok((select count(*)=1 from public.pending_article_storage_cleanup() where path like '%/media/old.jpg'), 'removed gallery object remains queued until API cleanup');

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select pg_temp.assert_ok((select count(*)=0 from public.articles where slug='draft-fixture'), 'other author cannot read draft');
select pg_temp.assert_ok((select count(*)=0 from public.pending_article_storage_cleanup()), 'other author cannot read cleanup paths');
do $$ begin
  perform public.save_article('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000008','{"status":"draft"}','[]');
  raise exception 'FAIL: other author saved draft';
exception when insufficient_privilege then null; end $$;

set local role anon;
set local request.jwt.claim.role = 'anon';
set local request.jwt.claim.sub = '';
select pg_temp.assert_ok((select count(*)=0 from public.articles where slug='draft-fixture'), 'anonymous visitors cannot read draft');
select pg_temp.assert_ok((select count(*)=2 from storage.objects), 'anonymous bucket listings reveal only published cover files');
do $$ declare name text; begin
  foreach name in array array['get_hearts','toggle_heart','get_claps','toggle_clap'] loop
    begin
      execute format('select public.%I(%L::uuid)', name, '10000000-0000-4000-8000-000000000001');
      raise exception 'FAIL: draft reaction % was exposed',name;
    exception when raise_exception then
      if sqlerrm <> 'article not found' then raise; end if;
    end;
  end loop;
end $$;
select pg_temp.assert_ok((public.toggle_heart('10000000-0000-4000-8000-000000000002')->>'count')::int=1, 'published hearts still work');
select pg_temp.assert_ok((public.toggle_clap('10000000-0000-4000-8000-000000000002')->>'count')::int=1, 'published claps still work');

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
delete from public.articles where slug='live-fixture';
select pg_temp.assert_ok((select count(*)=3 from public.pending_article_storage_cleanup()), 'deleting article preserves all gallery and cover cleanup paths');
select public.finish_article_storage_cleanup(array['00000000-0000-4000-8000-000000000001/media/old.jpg']);
select pg_temp.assert_ok((select processed_at is not null from public.article_storage_cleanup where path like '%/media/old.jpg'), 'successful cleanup can be acknowledged by owner');
do $$ begin
  insert into public.article_media(id,article_id,kind,url,storage_path) values
   ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','image','retired',
    '00000000-0000-4000-8000-000000000001/media/old.jpg');
  raise exception 'FAIL: retired media path reattached';
exception when insufficient_privilege then null; end $$;

set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
select pg_temp.assert_ok((select count(*)=1 from public.articles where slug='draft-fixture'), 'admin access to drafts is preserved');
select public.save_article('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000009','{"title":"Admin draft edit","status":"draft"}','[]');
select pg_temp.assert_ok((select title='Admin draft edit' from public.articles where slug='draft-fixture'), 'admins retain permitted article editing');
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
-- Shared files are collected only after the last article reference disappears.
insert into public.articles(id,slug,title,author_id,cover_image_url,cover_storage_path) values
 ('10000000-0000-4000-8000-000000000010','shared-one','','00000000-0000-4000-8000-000000000001',
  'https://storage.example.invalid/storage/v1/object/public/article-media/00000000-0000-4000-8000-000000000001/media/new.jpg','00000000-0000-4000-8000-000000000001/media/new.jpg'),
 ('10000000-0000-4000-8000-000000000011','shared-two','','00000000-0000-4000-8000-000000000001',
  'https://storage.example.invalid/storage/v1/object/public/article-media/00000000-0000-4000-8000-000000000001/media/new.jpg','00000000-0000-4000-8000-000000000001/media/new.jpg');
delete from public.articles where slug='shared-one';
select pg_temp.assert_ok(not exists(select 1 from public.pending_article_storage_cleanup() where path like '%/media/new.jpg'), 'shared files remain while another article references them');
delete from public.articles where slug='shared-two';
select pg_temp.assert_ok(exists(select 1 from public.pending_article_storage_cleanup() where path like '%/media/new.jpg'), 'last shared reference deletion makes file eligible for cleanup');

-- Caps also protect direct API writes, including kind-changing updates.
insert into public.article_media(article_id,kind,url)
 select '10000000-0000-4000-8000-000000000001','image','https://external.example.invalid/'||n from generate_series(1,10) n;
insert into public.article_media(article_id,kind,url)
 select '10000000-0000-4000-8000-000000000001','video','https://external.example.invalid/video-'||n from generate_series(1,2) n;
do $$ begin
  insert into public.article_media(article_id,kind,url) values ('10000000-0000-4000-8000-000000000001','image','extra');
  raise exception 'FAIL: image cap not enforced';
exception when raise_exception then if sqlerrm <> 'Maximum of 10 images and 2 videos per article' then raise; end if; end $$;
do $$ begin
  update public.article_media set kind='video' where id=(select id from public.article_media where kind='image' limit 1);
  raise exception 'FAIL: video cap bypassed by update';
exception when raise_exception then if sqlerrm <> 'Maximum of 10 images and 2 videos per article' then raise; end if; end $$;
select pg_temp.assert_ok((select count(*)=12 from public.article_media), 'full 10-image and 2-video gallery remains intact');

reset role;
select pg_temp.assert_ok((select count(*)=5 from storage.objects), 'SQL never directly deletes storage metadata; API owns file removal');
rollback;
