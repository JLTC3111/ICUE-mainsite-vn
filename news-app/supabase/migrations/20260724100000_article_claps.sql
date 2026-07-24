-- Independent clap reactions (one per IP per article), separate from hearts.
-- Visitors may clap and heart the same article at the same time.

create table if not exists public.article_claps (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.articles (id) on delete cascade,
  ip_hash     text not null,
  created_at  timestamptz not null default now(),
  unique (article_id, ip_hash)
);
create index if not exists article_claps_article_idx
  on public.article_claps (article_id);

create or replace function public.get_claps(p_article uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_ip      text := public.client_ip_hash();
  v_count   int;
  v_clapped boolean;
begin
  select count(*) into v_count from public.article_claps where article_id = p_article;
  select exists (
    select 1 from public.article_claps where article_id = p_article and ip_hash = v_ip
  ) into v_clapped;
  return json_build_object('clapped', v_clapped, 'count', v_count);
end $$;

create or replace function public.toggle_clap(p_article uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_ip      text := public.client_ip_hash();
  v_clapped boolean;
  v_count   int;
begin
  if not exists (select 1 from public.articles where id = p_article) then
    raise exception 'article not found';
  end if;

  if exists (
    select 1 from public.article_claps where article_id = p_article and ip_hash = v_ip
  ) then
    delete from public.article_claps where article_id = p_article and ip_hash = v_ip;
    v_clapped := false;
  else
    insert into public.article_claps (article_id, ip_hash)
      values (p_article, v_ip) on conflict do nothing;
    v_clapped := true;
  end if;

  select count(*) into v_count from public.article_claps where article_id = p_article;
  return json_build_object('clapped', v_clapped, 'count', v_count);
end $$;

alter table public.article_claps enable row level security;

grant execute on function public.get_claps(uuid)   to anon, authenticated;
grant execute on function public.toggle_clap(uuid) to anon, authenticated;
