-- Optional before/after comparison for the article cover image.
alter table public.articles
  add column if not exists cover_comparison jsonb;
