import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BentoYCarousel from './BentoYCarousel'
import { useArticleTitleTranslations } from '../hooks/useArticleTitleTranslations'
import useMediaQuery from '../hooks/useMediaQuery'
import { fetchPublishedArticles } from '../lib/articles'
import { buildBentoItems } from '../lib/bentoArticles'
import { normalizeUnicode } from '../lib/helpers'
import './ArticleMoreStories.css'

export default function ArticleMoreStories({ article, profile }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 1025px)')
  const [relatedState, setRelatedState] = useState({ articleId: null, rows: [] })

  useEffect(() => {
    if (!isDesktop || !article?.id || article.status !== 'published') {
      return undefined
    }

    let active = true
    fetchPublishedArticles({ limit: 20 })
      .then((published) => {
        if (!active) return
        const related = published
          .filter((candidate) => candidate.id !== article.id)
          .sort((a, b) => {
            const aRelated = a.category === article.category ? 1 : 0
            const bRelated = b.category === article.category ? 1 : 0
            return bRelated - aRelated
          })
          .slice(0, 12)
        setRelatedState({ articleId: article.id, rows: related })
      })
      .catch(() => {
        if (active) setRelatedState({ articleId: article.id, rows: [] })
      })

    return () => {
      active = false
    }
  }, [article?.category, article?.id, article?.status, isDesktop])

  const articles = useMemo(
    () => (relatedState.articleId === article?.id ? relatedState.rows : []),
    [article?.id, relatedState],
  )
  const { titles, subtitles, isTitlePending } = useArticleTitleTranslations(
    articles,
    i18n.resolvedLanguage,
  )
  const items = useMemo(
    () => buildBentoItems(articles, normalizeUnicode, titles, isTitlePending, subtitles),
    [articles, titles, subtitles, isTitlePending],
  )

  if (!isDesktop || article?.status !== 'published' || !items.length) return null

  return (
    <section className="article-more-stories" aria-labelledby="article-more-stories-title">
      <header className="article-more-stories__head">
        <span className="article-more-stories__eyebrow">{t('news.title')}</span>
        <h2 id="article-more-stories-title">{t('article.moreStories')}</h2>
      </header>
      <BentoYCarousel
        items={items}
        profile={profile}
        onItemClick={(item) => {
          if (item.slug) navigate(`/article/${item.slug}`)
        }}
      />
    </section>
  )
}
