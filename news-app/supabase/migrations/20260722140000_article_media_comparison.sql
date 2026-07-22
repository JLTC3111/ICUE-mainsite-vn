-- Optional before/after image pair for interactive comparison on article detail.
alter table public.articles
  add column if not exists media_comparison jsonb;
