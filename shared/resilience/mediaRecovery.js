import { subscribeToPageResume } from './pageResume.js'

/** Retry failed images only; do not reload healthy media or autoplay user videos. */
export function installMediaRecovery(root = document) {
  const failed = new Map()
  const attempts = new WeakMap()
  const onError = (event) => {
    const image = event.target
    if (image?.tagName === 'IMG') failed.set(image, image.currentSrc || image.src)
  }
  const onLoad = (event) => { failed.delete(event.target); attempts.delete(event.target) }
  for (const image of root.querySelectorAll('img')) {
    if (image.complete && image.naturalWidth === 0 && image.src) onError({ target: image })
  }
  root.addEventListener('error', onError, true)
  root.addEventListener('load', onLoad, true)
  const unsubscribe = subscribeToPageResume(() => {
    for (const [image, url] of failed) {
      failed.delete(image)
      if (!image.isConnected || (image.currentSrc || image.src) !== url) continue
      const previous = attempts.get(image)
      const count = previous?.url === url ? previous.count : 0
      if (count >= 2) continue
      attempts.set(image, { url, count: count + 1 })
      // Reassign the existing attributes. Never modify signed URLs or remove
      // responsive source selection, and never undo an onError fallback.
      if (image.srcset) image.srcset = image.srcset
      image.src = image.src
    }
  }, { minHiddenMs: 0 })
  return () => {
    unsubscribe()
    root.removeEventListener('error', onError, true)
    root.removeEventListener('load', onLoad, true)
    failed.clear()
  }
}
