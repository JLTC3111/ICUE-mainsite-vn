import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import MagicBento from './MagicBento/MagicBento'

const CARD_COLORS = ['#0b1220', '#101a2e', '#0d1830', '#122038']

export default function LegalDocuments({
  categories,
  searchTerm,
  onSearchChange,
  onDownload,
}) {
  const { t } = useTranslation()

  const localized = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        title: t(`documents.categories.${category.id}`),
        documents: category.documents.map((doc) => ({
          ...doc,
          label: t(`documents.items.${doc.id}`),
        })),
      })),
    [categories, t],
  )

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return localized
    return localized
      .map((category) => ({
        ...category,
        documents: category.documents.filter((doc) =>
          doc.label.toLowerCase().includes(q),
        ),
      }))
      .filter((category) => category.documents.length > 0)
  }, [localized, searchTerm])

  const cards = useMemo(
    () =>
      filtered.map((category, index) => ({
        id: category.id,
        color: CARD_COLORS[index % CARD_COLORS.length],
        content: (
          <div className="magic-bento-body">
            <div className="magic-bento-card__content">
              <h3 className="magic-bento-card__title">{category.title}</h3>
            </div>
            <ul className="magic-bento-doc-list">
              {category.documents.map((doc) => (
                <li key={doc.path}>
                  <button
                    type="button"
                    className="magic-bento-doc-link"
                    onClick={() => onDownload(doc.path)}
                  >
                    <DocIcon />
                    <span>{doc.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ),
      })),
    [filtered, onDownload],
  )

  return (
    <>
      <input
        type="search"
        className="search-bar search-bar--on-dark"
        placeholder={t('documents.searchPlaceholder')}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label={t('documents.searchAria')}
      />
      {cards.length > 0 ? (
        <MagicBento
          cards={cards}
          className="card-grid--documents"
          textAutoHide={false}
          enableStars
          enableSpotlight
          enableBorderGlow
          enableTilt={false}
          enableMagnetism
          clickEffect
          glowColor="54, 138, 223"
          particleCount={10}
          spotlightRadius={320}
        />
      ) : (
        <p className="documents-empty documents-empty--on-dark">
          {t('documents.empty')}
        </p>
      )}
    </>
  )
}

function DocIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
