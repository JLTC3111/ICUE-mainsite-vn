import { memo, useCallback, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  COVER_COMPARISON_ID,
  findEditorCoverComparisonPairs,
} from '../lib/mediaComparison'
import ArticleComparisonCarousel from './ArticleComparisonCarousel'
import ArticleImageComparison from './ArticleImageComparison'
import './MediaUploader.css'

const EMPTY_COMPARISON = { pairs: [{ beforeId: null, afterId: null }] }

function CoverComparisonEditor({
  coverUrl = '',
  images = [],
  comparison = EMPTY_COMPARISON,
  onComparisonChange,
  onRemoveImage,
}) {
  const { t } = useTranslation()
  const [activePairIndex, setActivePairIndex] = useState(0)

  const pairs = comparison.pairs ?? EMPTY_COMPARISON.pairs
  const activePair = pairs[activePairIndex] ?? pairs[0]

  const pickerImages = useMemo(() => {
    const list = [...images]
    if (coverUrl) {
      list.unshift({
        id: COVER_COMPARISON_ID,
        url: coverUrl,
        kind: 'image',
        isCover: true,
      })
    }
    return list
  }, [coverUrl, images])

  const comparisonPairs = useMemo(
    () => findEditorCoverComparisonPairs(coverUrl, images, comparison),
    [coverUrl, images, comparison],
  )

  const setComparisonRole = useCallback(
    (itemId, role) => {
      if (!onComparisonChange || !activePair) return
      const nextPairs = pairs.map((pair, index) => {
        if (index !== activePairIndex) return pair
        const next = { ...pair }
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
        return next
      })
      onComparisonChange({ pairs: nextPairs })
    },
    [activePair, activePairIndex, onComparisonChange, pairs],
  )

  const clearComparison = useCallback(() => {
    onComparisonChange?.({ pairs: [{ beforeId: null, afterId: null }] })
    setActivePairIndex(0)
  }, [onComparisonChange])

  const addComparisonPair = useCallback(() => {
    onComparisonChange?.({
      pairs: [...pairs, { beforeId: null, afterId: null }],
    })
    setActivePairIndex(pairs.length)
  }, [onComparisonChange, pairs])

  const removeComparisonPair = useCallback(
    (index) => {
      if (pairs.length <= 1) {
        clearComparison()
        return
      }
      const nextPairs = pairs.filter((_, pairIndex) => pairIndex !== index)
      onComparisonChange?.({ pairs: nextPairs })
      setActivePairIndex((current) => Math.min(current, nextPairs.length - 1))
    },
    [clearComparison, onComparisonChange, pairs],
  )

  const hasComparison = comparisonPairs.length > 0
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
          <div className="media-comparison-editor__pairs">
            {pairs.map((pair, pairIndex) => (
              <div key={`cover-comparison-pair-${pairIndex}`} className="media-comparison-editor__pair-tab">
                <button
                  type="button"
                  className={`media-comparison-editor__pair-btn${activePairIndex === pairIndex ? ' is-active' : ''}`}
                  onClick={() => setActivePairIndex(pairIndex)}
                >
                  {t('editor.comparisonPair', { n: pairIndex + 1 })}
                </button>
                {pairs.length > 1 && (
                  <button
                    type="button"
                    className="media-comparison-editor__pair-remove"
                    onClick={() => removeComparisonPair(pairIndex)}
                    aria-label={t('editor.comparisonRemovePair', { n: pairIndex + 1 })}
                  >
                    <X size={14} strokeWidth={2} aria-hidden />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-ghost btn-sm media-comparison-editor__add-pair"
              onClick={addComparisonPair}
            >
              {t('editor.comparisonAddPair')}
            </button>
          </div>

          <ul className="media-comparison-editor__grid">
            {pickerImages.map((img, index) => {
              const isBefore = activePair?.beforeId === img.id
              const isAfter = activePair?.afterId === img.id
              const usedInOtherPair = pairs.some(
                (pair, pairIndex) => pairIndex !== activePairIndex
                  && (pair.beforeId === img.id || pair.afterId === img.id),
              )
              return (
                <li
                  key={img.id}
                  className={`media-comparison-editor__card${isBefore || isAfter ? ' is-selected' : ''}${usedInOtherPair ? ' is-used' : ''}`}
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
                      {t('editor.coverImageBadge')}
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
              {comparisonPairs.length > 1 ? (
                <ArticleComparisonCarousel pairs={comparisonPairs} />
              ) : (
                <ArticleImageComparison
                  before={comparisonPairs[0].before}
                  after={comparisonPairs[0].after}
                  showCaption
                />
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default memo(CoverComparisonEditor)
