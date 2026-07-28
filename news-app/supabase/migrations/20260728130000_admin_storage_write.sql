-- Let admins manage storage objects belonging to other authors.
--
-- Every articles/article_media policy already grants admins write access via
-- public.is_admin(), but the storage policies did not: they required the first
-- path segment (the owner's user id) to equal auth.uid(). Media lives under
-- '<author-uuid>/media/...', so an admin editing someone else's article could
-- upload (files go under the admin's own folder) but could NOT delete the
-- original author's files.
--
-- That failed silently: supabase.storage.remove() does not throw when RLS
-- denies the delete, so syncMedia() in news-app/src/lib/articles.js removed the
-- article_media row while the file stayed behind as an orphan in the bucket.

drop policy if exists storage_auth_write on storage.objects;
create policy storage_auth_write on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'article-media')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists storage_auth_modify on storage.objects;
create policy storage_auth_modify on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'article-media')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists storage_auth_delete on storage.objects;
create policy storage_auth_delete on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'article-media')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
