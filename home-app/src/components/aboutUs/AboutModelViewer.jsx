import { useEffect, useRef } from 'react'
import { loadModelViewer, upgradeModelViewers } from '../../legacy/modelViewer'

/**
 * The grand piano in the hero. `<model-viewer>` is a custom element, so the tag
 * renders inert until the bundled definition registers — which is why the
 * import is deferred to idle time: the 3D runtime is decorative and must not
 * hold up the page's first paint.
 *
 * `auto-rotate=""` / `camera-controls=""` are written as empty strings so React
 * emits the valueless attributes the element expects.
 */
export default function AboutModelViewer({ alt }) {
  const hostRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let idleId = null
    let timerId = null

    const load = () => {
      void loadModelViewer()
        .then(() => {
          if (!cancelled) upgradeModelViewers(hostRef.current?.parentNode)
        })
        .catch((err) => {
          if (!cancelled) console.warn('Deferred model viewer failed to load:', err)
        })
    }

    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(load, { timeout: 1200 })
    } else {
      timerId = window.setTimeout(load, 180)
    }

    return () => {
      cancelled = true
      if (idleId != null) window.cancelIdleCallback(idleId)
      if (timerId != null) window.clearTimeout(timerId)
    }
  }, [])

  return (
    <model-viewer
      ref={hostRef}
      className="model-home"
      src="/models/grand_piano.glb"
      alt={alt}
      auto-rotate=""
      camera-orbit="45deg 45deg 45deg 10m"
      loading="lazy"
      reveal="auto"
      camera-controls=""
    />
  )
}
