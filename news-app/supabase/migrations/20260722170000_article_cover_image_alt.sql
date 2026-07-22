-- Optional second cover image for before/after cover comparisons.
alter table public.articles
  add column if not exists cover_image_alt_url text;
