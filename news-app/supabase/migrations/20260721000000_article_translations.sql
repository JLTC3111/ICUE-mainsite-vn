-- Cached machine translations for published articles (Google Cloud + DeepL).
create table if not exists public.article_translations (
  article_id    uuid not null references public.articles (id) on delete cascade,
  locale        text not null,
  provider      text not null check (provider in ('google', 'deepl')),
  source_lang   text,
  title         text not null default '',
  subtitle      text,
  content_html  text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (article_id, locale)
);

create index if not exists article_translations_locale_idx
  on public.article_translations (locale);

drop trigger if exists trg_article_translations_touch on public.article_translations;
create trigger trg_article_translations_touch
  before update on public.article_translations
  for each row execute function public.touch_updated_at();

alter table public.article_translations enable row level security;

drop policy if exists article_translations_select on public.article_translations;
create policy article_translations_select on public.article_translations
  for select using (
    exists (
      select 1 from public.articles a
      where a.id = article_id and a.status = 'published'
    )
  );

-- Writes happen via service role in the translate API (not from the browser).
