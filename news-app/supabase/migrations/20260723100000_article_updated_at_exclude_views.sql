-- Keep articles.updated_at as "last edited", not "last viewed".
-- record_article_view only increments view_count; that update must not bump updated_at.
-- Profiles keep the simple touch_updated_at trigger.

create or replace function public.touch_articles_updated_at()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(NEW) - 'view_count' - 'updated_at')
     = (to_jsonb(OLD) - 'view_count' - 'updated_at') then
    NEW.updated_at = OLD.updated_at;
    return NEW;
  end if;
  NEW.updated_at = now();
  return NEW;
end;
$$;

drop trigger if exists trg_articles_touch on public.articles;
create trigger trg_articles_touch
  before update on public.articles
  for each row execute function public.touch_articles_updated_at();
