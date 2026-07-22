import BentoCardComparison from './BentoCardComparison'
import { resolveArticleCoverComparison } from '../lib/mediaComparison'
import './ArticleThumbnail.css'

export default function ArticleThumbnail({ article, comparison, className = '' }) {
  const pair = comparison ?? (article ? resolveArticleCoverComparison(article) : null)

  if (pair?.before?.url && pair?.after?.url) {
    return (
      <div className={`article-thumb ${className}`.trim()} aria-hidden="true">
        <BentoCardComparison
          before={pair.before}
          after={pair.after}
          staticSplit
          splitPercent={pair.splitPercent}
        />
      </div>
    )
  }

  const url = article?.cover_image_url || pair?.before?.url || null
  return (
    <div className={`article-thumb ${className}`.trim()}>
      {url ? (
        <img src={url} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="article-thumb__placeholder">ICUE</span>
      )}
    </div>
  )
}
