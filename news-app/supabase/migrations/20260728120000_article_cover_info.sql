-- Attribution/extra info for the cover image, mirroring article_media.info.
--
-- Like media captions this is AUTHOR-WRITTEN CONTENT (e.g. "Nguồn: NASA",
-- "Ảnh tạo bởi A.I"), not a UI label — it is never routed through i18n. The
-- source value is written in the article's language (always Vietnamese), and
-- each locale's version is hand-authored in the newsroom Translations editor.
alter table public.articles
  add column if not exists cover_info text;

-- Per-locale translation of the above, alongside title/subtitle/content_html.
alter table public.article_translations
  add column if not exists cover_info text;
