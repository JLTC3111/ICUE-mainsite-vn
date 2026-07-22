-- Cached machine translations for visitor comments.
create table if not exists public.comment_translations (
  comment_id   uuid not null references public.article_comments (id) on delete cascade,
  locale       text not null,
  provider     text not null check (provider in ('google', 'deepl')),
  source_lang  text,
  body         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (comment_id, locale)
);

create index if not exists comment_translations_locale_idx
  on public.comment_translations (locale);

drop trigger if exists trg_comment_translations_touch on public.comment_translations;
create trigger trg_comment_translations_touch
  before update on public.comment_translations
  for each row execute function public.touch_updated_at();

alter table public.comment_translations enable row level security;

drop policy if exists comment_translations_select on public.comment_translations;
create policy comment_translations_select on public.comment_translations
  for select using (
    exists (
      select 1
      from public.article_comments c
      join public.articles a on a.id = c.article_id
      where c.id = comment_id and a.status = 'published'
    )
  );
