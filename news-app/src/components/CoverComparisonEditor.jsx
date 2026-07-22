import { memo, useCallback, useMemo } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  COVER_COMPARISON_ID,
  COVER_COMPARISON_ID_2,
  DEFAULT_COVER_SPLIT_PERCENT,
  findEditorCoverComparisonPairs,
  normalizeSplitPercent,
} from '../lib/mediaComparison'
import ArticleImageComparison from './ArticleImageComparison'
import BentoCardComparison from './BentoCardComparison'
import './MediaUploader.css'

const EMPTY_COMPARISON = {
  pairs: [{ beforeId: null, afterId: null, splitPercent: DEFAULT_COVER_SPLIT_PERCENT }],
}

function CoverComparisonEditor({
  coverUrl = '',
  coverAltUrl = '',
  images = [],
  comparison = EMPTY_COMPARISON,
  onComparisonChange,
  onRemoveImage,
}) {
  const { t } = useTranslation()

  const activePair = comparison.pairs?.[0] ?? EMPTY_COMPARISON.pairs[0]

  const pickerImages = useMemo(() => {
    const list = [...images]
    if (coverAltUrl) {
      list.unshift({
        id: COVER_COMPARISON_ID_2,
        url: coverAltUrl,
        kind: 'image',
        isCover: true,
        coverSlot: 2,
      })
    }
    if (coverUrl) {
      list.unshift({
        id: COVER_COMPARISON_ID,
        url: coverUrl,
        kind: 'image',
        isCover: true,
        coverSlot: 1,
      })
    }
    return list
  }, [coverUrl, coverAltUrl, images])

  const comparisonPair = useMemo(
    () => findEditorCoverComparisonPairs(coverUrl, images, comparison, coverAltUrl)[0] ?? null,
    [coverUrl, coverAltUrl, images, comparison],
  )

  const setComparisonRole = useCallback(
    (itemId, role) => {
      if (!onComparisonChange || !activePair) return
      const next = { ...activePair }
      if (role === 'before') {
        next.beforeId = itemId
        if (next.afterId === itemId) next.afterId = null
      } else if (role === 'after') {
        next.afterId = itemId
        if (next.beforeId === itemId) next.beforeId = null
      } else if (role === 'clear-before') {
        if (next.beforeId === itemId) next.beforeId = null
      } else if (role === 'clear-after') {
        if (next.afterId === itemId) next.afterId = null
      }
      onComparisonChange({ pairs: [next] })
    },
    [activePair, onComparisonChange],
  )

  const setSplitPercent = useCallback(
    (value) => {
      if (!onComparisonChange || !activePair) return
      onComparisonChange({
        pairs: [{
          ...activePair,
          splitPercent: normalizeSplitPercent(value),
        }],
      })
    },
    [activePair, onComparisonChange],
  )

  const clearComparison = useCallback(() => {
    onComparisonChange?.({
      pairs: [{ beforeId: null, afterId: null, splitPercent: DEFAULT_COVER_SPLIT_PERCENT }],
    })
  }, [onComparisonChange])

  const hasComparison = Boolean(comparisonPair)
  const canCompare = pickerImages.length >= 2

  if (!onComparisonChange) return null

  return (
    <section className="media-comparison-editor cover-comparison-editor" aria-labelledby="cover-comparison-heading">
      <div className="media-comparison-editor__intro">
        <div>
          <h4 id="cover-comparison-heading" className="media-comparison-editor__title">
            {t('editor.coverComparisonTitle')}
          </h4>
          <p className="media-comparison-editor__hint">{t('editor.coverComparisonHint')}</p>
        </div>
        {hasComparison && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearComparison}>
            {t('editor.comparisonClear')}
          </button>
        )}
      </div>

      {!canCompare ? (
        <p className="media-comparison-editor__empty">{t('editor.coverComparisonNeedSources')}</p>
      ) : (
        <>
          <ul className="media-comparison-editor__grid">
            {pickerImages.map((img, index) => {
              const isBefore = activePair?.beforeId === img.id
              const isAfter = activePair?.afterId === img.id
              return (
                <li
                  key={img.id}
                  className={`media-comparison-editor__card${isBefore || isAfter ? ' is-selected' : ''}`}
                >
                  <img src={img.url} alt="" loading="lazy" decoding="async" />
                  <span className="media-comparison-editor__index">{index + 1}</span>
                  {!img.isCover && onRemoveImage && (
                    <button
                      type="button"
                      className="media-comparison-editor__remove"
                      onClick={() => onRemoveImage(img.id)}
                      aria-label={t('common.delete')}
                    >
                      <X size={14} strokeWidth={2} aria-hidden />
                    </button>
                  )}
                  {img.isCover && (
                    <span className="media-comparison-editor__badge is-cover">
                      {img.coverSlot === 2 ? t('editor.coverImageAltBadge') : t('editor.coverImageBadge')}
                    </span>
                  )}
                  {(isBefore || isAfter) && (
                    <span className={`media-comparison-editor__badge${isBefore ? ' is-before' : ' is-after'}`}>
                      {isBefore ? t('editor.comparisonBefore') : t('editor.comparisonAfter')}
                    </span>
                  )}
                  <div className="media-comparison-editor__actions">
                    <button
                      type="button"
                      className={`media-comparison-editor__pick${isBefore ? ' is-active' : ''}`}
                      onClick={() => setComparisonRole(
                        img.id,
                        isBefore ? 'clear-before' : 'before',
                      )}
                    >
                      {t('editor.comparisonBefore')}
                    </button>
                    <button
                      type="button"
                      className={`media-comparison-editor__pick${isAfter ? ' is-active' : ''}`}
                      onClick={() => setComparisonRole(
                        img.id,
                        isAfter ? 'clear-after' : 'after',
                      )}
                    >
                      {t('editor.comparisonAfter')}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          {hasComparison && (
            <div className="media-comparison-editor__preview">
              <p className="media-comparison-editor__preview-label">{t('editor.comparisonPreview')}</p>
              <div className="cover-comparison-editor__split">
                <div className="cover-comparison-editor__split-head">
                  <span>{t('editor.coverSplitLabel')}</span>
                  <output className="cover-comparison-editor__split-value">
                    {t('editor.coverSplitValue', { percent: activePair.splitPercent ?? DEFAULT_COVER_SPLIT_PERCENT })}
                  </output>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={activePair.splitPercent ?? DEFAULT_COVER_SPLIT_PERCENT}
                  className="cover-comparison-editor__split-range"
                  aria-label={t('editor.coverSplitLabel')}
                  onChange={(event) => setSplitPercent(event.target.value)}
                />
                <div className="cover-comparison-editor__split-labels" aria-hidden>
                  <span>{t('editor.coverSplitBefore')}</span>
                  <span>{t('editor.coverSplitMiddle')}</span>
                  <span>{t('editor.coverSplitAfter')}</span>
                </div>
              </div>
              <div className="cover-comparison-editor__grid-preview">
                <BentoCardComparison
                  before={comparisonPair.before}
                  after={comparisonPair.after}
                  staticSplit
                  splitPercent={activePair.splitPercent ?? DEFAULT_COVER_SPLIT_PERCENT}
                />
              </div>
              <ArticleImageComparison
                before={comparisonPair.before}
                after={comparisonPair.after}
                showCaption
                fitContent
              />
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default memo(CoverComparisonEditor)
