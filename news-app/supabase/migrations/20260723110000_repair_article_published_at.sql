-- One-time repair: restore published_at from the author form Date + Time.
-- Those fields were not overwritten when updateArticle reset published_at on
-- every save. Also clear view-polluted updated_at where we can infer it.
--
-- Asia/Ho_Chi_Minh: article_date/time are local editorial values (no tz).

alter table public.articles disable trigger trg_articles_touch;

update public.articles a
set
  published_at = (
    (a.article_date + coalesce(a.article_time, time '00:00'))
    at time zone 'Asia/Ho_Chi_Minh'
  ),
  updated_at = case
    -- Last save rewrote published_at and bumped updated_at together → keep edit time.
    when a.updated_at <= a.published_at + interval '2 minutes'
      then a.updated_at
    -- published_at already matched the form date; later updated_at is view noise.
    when a.published_at is not null
         and (a.published_at at time zone 'Asia/Ho_Chi_Minh')::date = a.article_date
      then a.published_at
    -- published_at was an overwrite from a later edit; that stamp is the last edit.
    when a.published_at is not null
      then a.published_at
    else (
      (a.article_date + coalesce(a.article_time, time '00:00'))
      at time zone 'Asia/Ho_Chi_Minh'
    )
  end
where a.status = 'published'
  and a.article_date is not null;

alter table public.articles enable trigger trg_articles_touch;
