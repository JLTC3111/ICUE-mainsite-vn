alter table public.article_translations
  add column if not exists media jsonb not null default '[]'::jsonb;
