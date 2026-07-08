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
          <img src={image} alt={imageAlt} decoding="async" />
        ) : (
          <a href={href} aria-label={title}>
            <img src={image} alt={imageAlt} decoding="async" />
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
