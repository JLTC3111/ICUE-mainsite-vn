import BentoCardComparison from './BentoCardComparison'
import { PLACEHOLDER_COVER } from '../lib/bentoArticles'

export default function BentoCardBackground({ item }) {
  if (item.comparison) {
    return (
      <BentoCardComparison
        before={item.comparison.before}
        after={item.comparison.after}
      />
    )
  }

  if (item.img && item.img !== PLACEHOLDER_COVER) {
    return (
      <img src={item.img} alt="" className="bento-card__img" loading="lazy" decoding="async" />
    )
  }

  return <div className="bento-card__placeholder">ICUE</div>
}
