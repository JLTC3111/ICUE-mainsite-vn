-- Hand-authored comment translations, mirroring the article translation model
-- introduced in 20260727200000_manual_article_translations.sql.
--
-- Only hand-authored rows are stored here. Readers may also get an on-the-fly
-- translation from the Chromium built-in Translator API, but that runs
-- on-device in the reader's browser and its output is deliberately never
-- persisted — a stored translation is always something a human wrote.

-- 'manual' becomes a valid provider alongside the historical machine values,
-- which are kept so any existing cached rows stay valid.
alter table public.comment_translations
  drop constraint if exists comment_translations_provider_check;

alter table public.comment_translations
  add constraint comment_translations_provider_check
  check (provider in ('google', 'deepl', 'manual'));

alter table public.comment_translations
  alter column provider set default 'manual';

-- Editors must be able to read translations on their own unpublished drafts,
-- not just published articles.
drop policy if exists comment_translations_select on public.comment_translations;
create policy comment_translations_select on public.comment_translations
  for select using (
    exists (
      select 1
      from public.article_comments c
      join public.articles a on a.id = c.article_id
      where c.id = comment_id
        and (a.status = 'published' or a.author_id = auth.uid() or public.is_admin())
    )
  );

-- Writes come from the browser (the inline comment translation editor) rather
-- than a service-role function, so the article's author and admins need an
-- explicit policy. Visitors can post comments but never translate them.
drop policy if exists comment_translations_write on public.comment_translations;
create policy comment_translations_write on public.comment_translations
  for all using (
    exists (
      select 1
      from public.article_comments c
      join public.articles a on a.id = c.article_id
      where c.id = comment_id and (a.author_id = auth.uid() or public.is_admin())
    )
  ) with check (
    exists (
      select 1
      from public.article_comments c
      join public.articles a on a.id = c.article_id
      where c.id = comment_id and (a.author_id = auth.uid() or public.is_admin())
    )
  );
