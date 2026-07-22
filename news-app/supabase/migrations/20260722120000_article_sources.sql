-- Structured bibliography entries on articles (label, url, publisher, accessed_at).
alter table public.articles
  add column if not exists sources jsonb not null default '[]'::jsonb;

alter table public.article_translations
  add column if not exists sources jsonb not null default '[]'::jsonb;
