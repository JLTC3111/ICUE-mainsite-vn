import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CircularGallery from './CircularGallery'
import './ArticleCircularGallery.css'

const PLACEHOLDER_COVER = `${import.meta.env.BASE_URL}favicon.svg`

export default function ArticleCircularGallery({ articles }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const slugsRef = useRef([])

  const items = useMemo(() => {
    const mapped = articles.map((article) => ({
      image: article.cover_image_url || PLACEHOLDER_COVER,
    }))
    slugsRef.current = articles.map((article) => article.slug)
    return mapped
  }, [articles])

  const handleItemClick = (index) => {
    const slug = slugsRef.current[index]
    if (slug) navigate(`/article/${slug}`)
  }

  if (!items.length) return null

  return (
    <section className="news-circular-gallery" aria-label={t('gallery.ariaLabel')}>
      <CircularGallery
        items={items}
        bend={2}
        borderRadius={0.06}
        scrollSpeed={2}
        loop={false}
        onItemClick={handleItemClick}
        ariaLabel={t('gallery.ariaLabel')}
      />
    </section>
  )
}
