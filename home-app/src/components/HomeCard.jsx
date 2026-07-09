import BorderGlow from '@icue/ui/BorderGlow/BorderGlow'
import PixelImage from './magicui/PixelImage'

export default function HomeCard({
  image,
  imageAlt,
  href,
  title,
  description,
  imageOnly = false,
  beamRef,
}) {
  return (
    <article className="home-card" ref={beamRef}>
      <BorderGlow
        className="home-card__glow"
        borderRadius={18}
        glowRadius={22}
        glowIntensity={0.9}
        edgeSensitivity={24}
        glowColor="195 90 68"
        backgroundColor="rgba(10, 16, 30, 0.92)"
        colors={['#1db7ff', '#c8ff00', '#368adf']}
        fillOpacity={0.28}
      >
        <div className="home-card__surface">
          {imageOnly ? (
            <PixelImage src={image} alt={imageAlt} customGrid={{ rows: 4, cols: 6 }} />
          ) : (
            <a href={href} aria-label={title} className="home-card__media">
              <PixelImage src={image} alt={imageAlt} customGrid={{ rows: 4, cols: 6 }} />
            </a>
          )}
          <a className="home-card__body" href={href} aria-label={title}>
            <h3>{title}</h3>
            <p>{description}</p>
          </a>
        </div>
      </BorderGlow>
    </article>
  )
}
