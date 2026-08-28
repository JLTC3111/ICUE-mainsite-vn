import { dimensions, src, srcSet } from '../data/photos'

/**
 * One photograph with its caption.
 *
 * The caption is the authored string from programmes.js and is used for both
 * the visible `<figcaption>` and the image's `alt`. On the legacy page every
 * one of these carried `alt=""`, while the real descriptions sat unused in
 * script.js saying things like "Networking session" — text that described none
 * of these photographs.
 *
 * `sizes` is what keeps the page light: it tells the browser the figure is at
 * most ~560px wide in the grid, so it fetches the 800px rendition rather than
 * the 1600px one. Combined with `loading="lazy"` below the fold, a visit
 * transfers a fraction of what the 9.9 MB collage did.
 */
export default function PhotoFigure({ id, caption, priority = false, onOpen, openLabel }) {
  const { width, height } = dimensions(id)

  const image = (
    <img
      className="cm-figure__img"
      src={src(id)}
      srcSet={srcSet(id)}
      /* The real slot: one column below 640px, two up to ~1000px, then three
         in a 1200px container — about 370px each. Overstating this is how a
         gallery ends up shipping 800px files for 370px frames. */
      sizes="(max-width: 640px) 92vw, (max-width: 1000px) 45vw, 370px"
      width={width}
      height={height}
      alt={caption}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
    />
  )

  return (
    <figure className="cm-figure">
      {onOpen ? (
        <button type="button" className="cm-figure__button" onClick={onOpen} aria-label={openLabel}>
          {image}
        </button>
      ) : (
        image
      )}
      <figcaption className="cm-figure__caption">{caption}</figcaption>
    </figure>
  )
}
