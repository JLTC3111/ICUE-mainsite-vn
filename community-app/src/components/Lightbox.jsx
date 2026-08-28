import { useCallback, useEffect, useRef } from 'react'
import { dimensions, src, srcSet } from '../data/photos'

/**
 * The enlarged photograph.
 *
 * A real `<dialog>`, opened with `showModal()`, which gets focus trapping, the
 * top layer, an inert background and Escape-to-close from the platform. The
 * legacy version (src/script.js:3621-3874) built all of that by hand out of
 * `document.createElement` and inline styles, leaked two permanent `keydown`
 * listeners on every open, compared `modal.style.display === 'flex'` to decide
 * whether it was showing, and hid its own close button on mobile.
 */
export default function Lightbox({ photos, index, labels, onClose, onStep }) {
  const ref = useRef(null)
  const open = index !== null
  const current = open ? photos[index] : null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Escape and the backdrop both reach `close`; keep React's state in step.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return undefined
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); onStep(1) }
      if (event.key === 'ArrowLeft') { event.preventDefault(); onStep(-1) }
    },
    [onStep],
  )

  const { width, height } = current ? dimensions(current.id) : { width: 1600, height: 1067 }

  return (
    <dialog
      ref={ref}
      className="cm-lightbox"
      aria-label={labels.lightbox}
      onKeyDown={onKeyDown}
      /* Clicking the backdrop — that is, the dialog element itself rather than
         anything inside it — closes. */
      onClick={(event) => { if (event.target === ref.current) onClose() }}
    >
      {current && (
        <div className="cm-lightbox__inner">
          <p className="cm-lightbox__counter" aria-live="polite">
            {labels.counter.replace('{{current}}', index + 1).replace('{{total}}', photos.length)}
          </p>

          <img
            className="cm-lightbox__img"
            src={src(current.id)}
            srcSet={srcSet(current.id)}
            sizes="(max-width: 900px) 96vw, 90vw"
            width={width}
            height={height}
            alt={current.caption}
          />

          <p className="cm-lightbox__caption">{current.caption}</p>

          <div className="cm-lightbox__controls">
            <button type="button" onClick={() => onStep(-1)} aria-label={labels.previous}>‹</button>
            <button type="button" onClick={onClose} aria-label={labels.close}>×</button>
            <button type="button" onClick={() => onStep(1)} aria-label={labels.next}>›</button>
          </div>
        </div>
      )}
    </dialog>
  )
}
