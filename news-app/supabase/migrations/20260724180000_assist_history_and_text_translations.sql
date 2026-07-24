-- AI Assist chat history + freeform text translation cache
-- Apply in Supabase SQL editor or via CLI.

create table if not exists public.assist_threads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  title         text not null default '',
  mode          text not null default 'chat',
  language      text not null default 'vi',
  article_ids   jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists assist_threads_user_updated_idx
  on public.assist_threads (user_id, updated_at desc);

drop trigger if exists trg_assist_threads_touch on public.assist_threads;
create trigger trg_assist_threads_touch
  before update on public.assist_threads
  for each row execute function public.touch_updated_at();

alter table public.assist_threads enable row level security;

drop policy if exists assist_threads_select_own on public.assist_threads;
create policy assist_threads_select_own on public.assist_threads
  for select using (auth.uid() = user_id);

drop policy if exists assist_threads_insert_own on public.assist_threads;
create policy assist_threads_insert_own on public.assist_threads
  for insert with check (auth.uid() = user_id);

drop policy if exists assist_threads_update_own on public.assist_threads;
create policy assist_threads_update_own on public.assist_threads
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists assist_threads_delete_own on public.assist_threads;
create policy assist_threads_delete_own on public.assist_threads
  for delete using (auth.uid() = user_id);

create table if not exists public.assist_messages (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null references public.assist_threads (id) on delete cascade,
  role          text not null check (role in ('user', 'assistant')),
  content       text not null default '',
  draft         jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists assist_messages_thread_created_idx
  on public.assist_messages (thread_id, created_at);

alter table public.assist_messages enable row level security;

drop policy if exists assist_messages_select_own on public.assist_messages;
create policy assist_messages_select_own on public.assist_messages
  for select using (
    exists (
      select 1 from public.assist_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

drop policy if exists assist_messages_insert_own on public.assist_messages;
create policy assist_messages_insert_own on public.assist_messages
  for insert with check (
    exists (
      select 1 from public.assist_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

drop policy if exists assist_messages_delete_own on public.assist_messages;
create policy assist_messages_delete_own on public.assist_messages
  for delete using (
    exists (
      select 1 from public.assist_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

-- Freeform / AI Assist reply translations (content-hash keyed)
create table if not exists public.text_translations (
  content_hash  text not null,
  locale        text not null,
  provider      text not null check (provider in ('google', 'deepl')),
  source_lang   text,
  body          text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (content_hash, locale)
);

create index if not exists text_translations_locale_idx
  on public.text_translations (locale);

drop trigger if exists trg_text_translations_touch on public.text_translations;
create trigger trg_text_translations_touch
  before update on public.text_translations
  for each row execute function public.touch_updated_at();

alter table public.text_translations enable row level security;

-- Readable by authenticated users; writes go through service role on Netlify.
drop policy if exists text_translations_select_auth on public.text_translations;
create policy text_translations_select_auth on public.text_translations
  for select to authenticated using (true);
