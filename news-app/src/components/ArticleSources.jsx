import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate } from '../lib/helpers'
import { sourcesForDisplay } from '../lib/articleSources'

export default function ArticleSources({ sources, translatedSources }) {
  const { t, i18n } = useTranslation()

  const displaySources = useMemo(
    () => sourcesForDisplay(sources, translatedSources),
    [sources, translatedSources],
  )

  if (!displaySources.length) return null

  return (
    <section className="article-sources icue-readw" aria-labelledby="article-sources-heading">
      <h2 id="article-sources-heading" className="article-sources__title">
        {t('article.sourcesTitle')}
      </h2>
      <ol className="article-sources__list">
        {displaySources.map((row) => {
          const metaParts = []
          if (row.publisher) metaParts.push(row.publisher)
          if (row.accessed_at) {
            metaParts.push(formatDate(row.accessed_at, i18n.resolvedLanguage))
          }

          return (
            <li key={row.id} className="article-sources__item">
              <a
                className="article-sources__link"
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {row.label}
              </a>
              {metaParts.length > 0 && (
                <span className="article-sources__meta">{metaParts.join(' · ')}</span>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
