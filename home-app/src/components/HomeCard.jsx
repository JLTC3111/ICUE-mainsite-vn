import PixelImage from './magicui/PixelImage'

export default function HomeCard({
  image,
  imageAlt,
  href,
  title,
  description,
  imageOnly = false,
}) {
  return (
    <article className="home-card">
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
    </article>
  )
}
