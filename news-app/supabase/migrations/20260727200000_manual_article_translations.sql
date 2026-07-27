-- Manual per-locale translations replace the machine-translation pipeline.
-- Editors author translations in the newsroom and they are served as-is; no
-- external translation API is called at read time (or at any other time).

-- 'manual' becomes a valid provider alongside the historical machine values,
-- which are kept so existing cached rows stay valid.
alter table public.article_translations
  drop constraint if exists article_translations_provider_check;

alter table public.article_translations
  add constraint article_translations_provider_check
  check (provider in ('google', 'deepl', 'manual'));

alter table public.article_translations
  alter column provider set default 'manual';

-- Editors must be able to read translations for their own unpublished drafts,
-- not just published articles.
drop policy if exists article_translations_select on public.article_translations;
create policy article_translations_select on public.article_translations
  for select using (
    exists (
      select 1 from public.articles a
      where a.id = article_id
        and (a.status = 'published' or a.author_id = auth.uid() or public.is_admin())
    )
  );

-- Writes now come from the browser (the newsroom translation editor) instead of
-- the service-role translate function, so authors need an explicit policy.
drop policy if exists article_translations_write on public.article_translations;
create policy article_translations_write on public.article_translations
  for all using (
    exists (
      select 1 from public.articles a
      where a.id = article_id and (a.author_id = auth.uid() or public.is_admin())
    )
  ) with check (
    exists (
      select 1 from public.articles a
      where a.id = article_id and (a.author_id = auth.uid() or public.is_admin())
    )
  );
