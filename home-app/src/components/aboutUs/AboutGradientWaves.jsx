import { useEffect, useState } from 'react'
import GradientWaves from '../reactbits/GradientWaves'
import './AboutGradientWaves.css'

/**
 * The About page's backdrop, in place of the background video this page used to
 * carry.
 *
 * The layer paints a flat CSS gradient of its own and hangs the shader canvas
 * over it. That ordering is what makes every degraded path look deliberate
 * rather than broken: no WebGL2, a data-saver connection, a 2G link — the
 * gradient is already there, and the canvas simply never arrives. It is also
 * why the page no longer needs the `[data-aboutus-bg-video="off"] #content`
 * rule that used to supply a static backdrop; this element carries its own.
 *
 * `position: fixed` with a negative z-index reproduces exactly what
 * `.about-container > .video-bg` did, so the page's stacking is unchanged.
 *
 * Cost control, in order of how much it saves:
 *
 *  - `renderScale` draws at roughly a third (desktop) or a fifth (mobile) of
 *    the pixels and lets CSS stretch the result. This is a haze of soft
 *    gradients; there is no detail for the upscale to destroy.
 *  - `detail="low"` caps the raymarcher at 40 steps instead of 70.
 *  - `mouseInteraction={false}` drops two rotation matrices per fragment. The
 *    layer is `pointer-events: none` anyway, so it could never have received
 *    the pointer events that drive it.
 *  - `grain={false}` drops a hash per fragment per frame.
 *
 * The remaining prop that matters is `speed`, which is free — it only scales
 * the time uniform — and is set low because a fixed backdrop that moves quickly
 * behind a page of text is hard to read against.
 */

/**
 * `fogDepth` is per-theme rather than shared because it decides how much of the
 * wave body survives the haze. The dark palette has contrast to spare and reads
 * well with the waves pushed back; the light one is three pale tints and
 * disappears entirely unless the body is brought closer.
 */
const PALETTES = {
  light: {
    horizonColor: '#f2e9d8',
    waveColor: '#7cc3ba',
    crestColor: '#ffeab8',
    fogDepth: 24,
    brightness: 1,
    opacity: 0.92,
  },
  dark: {
    horizonColor: '#0b1020',
    waveColor: '#263f74',
    crestColor: '#7fb3d5',
    fogDepth: 17,
    brightness: 0.95,
    opacity: 1,
  },
}

/** Mirrors the check the background video manager used before it. */
function connectionIsFrugal() {
  const connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection
  return Boolean(
    connection?.saveData || /(^|-)2g$/i.test(connection?.effectiveType || ''),
  )
}

export default function AboutGradientWaves({ theme = 'light' }) {
  const [shaderAllowed, setShaderAllowed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (connectionIsFrugal()) return undefined

    const query = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(query.matches)
    sync()
    query.addEventListener('change', sync)

    // Deferred to idle for the same reason the video was: the backdrop is
    // decorative and must not compete with the page's first paint. Compiling
    // the shader is the expensive part and it happens on mount.
    let idleId = null
    let timerId = null
    const allow = () => setShaderAllowed(true)
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(allow, { timeout: 1200 })
    } else {
      timerId = window.setTimeout(allow, 200)
    }

    return () => {
      query.removeEventListener('change', sync)
      if (idleId != null) window.cancelIdleCallback(idleId)
      if (timerId != null) window.clearTimeout(timerId)
    }
  }, [])

  const palette = PALETTES[theme] || PALETTES.light

  return (
    <div className="about-waves-bg" aria-hidden="true">
      {shaderAllowed && (
        <GradientWaves
          {...palette}
          speed={0.22}
          amplitude={2.2}
          waveScale={0.55}
          tilt={1.14}
          detail="low"
          renderScale={isMobile ? 0.45 : 0.6}
          maxDpr={1.25}
          mouseInteraction={false}
          grain={false}
          onUnsupported={() => setShaderAllowed(false)}
        />
      )}
    </div>
  )
}
