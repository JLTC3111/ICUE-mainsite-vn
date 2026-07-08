import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

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

  return (
    <>
      <input
        type="search"
        className="search-bar"
        placeholder={t('documents.searchPlaceholder')}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label={t('documents.searchAria')}
      />
      <div className="documents-section">
        {filtered.map((category) => (
          <div key={category.id} className="document-category">
            <h3>{category.title}</h3>
            <ul className="document-list">
              {category.documents.map((doc) => (
                <li key={doc.path}>
                  <button
                    type="button"
                    className="document-link"
                    onClick={() => onDownload(doc.path)}
                  >
                    <DocIcon />
                    <span>{doc.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="documents-empty">{t('documents.empty')}</p>
        )}
      </div>
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
