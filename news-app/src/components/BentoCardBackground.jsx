import ArticleImageComparison from './ArticleImageComparison'
import { PLACEHOLDER_COVER } from '../lib/bentoArticles'

export default function BentoCardBackground({ item }) {
  if (item.comparison) {
    return (
      <div
        className="bento-card__comparison"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <ArticleImageComparison
          before={item.comparison.before}
          after={item.comparison.after}
        />
      </div>
    )
  }

  if (item.img && item.img !== PLACEHOLDER_COVER) {
    return (
      <img src={item.img} alt="" className="bento-card__img" loading="lazy" decoding="async" />
    )
  }

  return <div className="bento-card__placeholder">ICUE</div>
}
