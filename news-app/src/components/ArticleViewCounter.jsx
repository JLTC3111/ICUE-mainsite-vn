import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import Counter from './Counter'
import './ArticleViewCounter.css'

export default function ArticleViewCounter({ count = 0, compact = false, tone = 'light' }) {
  const { t } = useTranslation()
  const parsed = Number(count)
  const safeCount = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0

  return (
    <span
      className={`article-view-counter${compact ? ' article-view-counter--compact' : ''}${tone === 'dark' ? ' article-view-counter--dark' : ''}`}
      aria-label={t('engagement.views', { count: safeCount })}
      title={t('engagement.views', { count: safeCount })}
    >
      <Eye className="article-view-counter__icon" aria-hidden="true" />
      <Counter
        value={safeCount}
        fontSize={compact ? 12 : 15}
        padding={0}
        gap={1}
        horizontalPadding={0}
        showGradient={false}
        textColor="inherit"
        fontWeight={700}
      />
      <span className="article-view-counter__label">{t('engagement.viewsLabel')}</span>
    </span>
  )
}
