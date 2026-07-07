import { useTranslation } from 'react-i18next'
import Counter from './Counter'
import './ArticleViewCounter.css'

export default function ArticleViewCounter({ count = 0, compact = false, tone = 'light' }) {
  const { t } = useTranslation()
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  const gradientFrom = tone === 'dark' ? 'rgba(10, 10, 10, 0.92)' : 'var(--icue-surface, #fff)'

  return (
    <span
      className={`article-view-counter${compact ? ' article-view-counter--compact' : ''}${tone === 'dark' ? ' article-view-counter--dark' : ''}`}
      aria-label={t('engagement.views', { count: safeCount })}
    >
      <Counter
        value={safeCount}
        fontSize={compact ? 11 : 13}
        padding={0}
        gap={1}
        horizontalPadding={0}
        gradientHeight={compact ? 3 : 4}
        gradientFrom={gradientFrom}
        gradientTo="transparent"
        textColor="inherit"
        fontWeight={600}
      />
      <span className="article-view-counter__label">{t('engagement.viewsLabel')}</span>
    </span>
  )
}
