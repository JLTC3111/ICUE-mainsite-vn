import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import App from './App.jsx'

gsap.registerPlugin(ScrollTrigger)
import { installGlobalDebugHandlers } from './lib/debugLog'
import { normalizeUiLocale } from '../../shared/site-routes/mainSitePaths.js'
import './lib/i18n'
import '../../styles.css'
import './styles/footer-theme.css'
import '@icue/styles/icue-base.css'

window.gsap = gsap
installGlobalDebugHandlers()

// `?lang=` is an app-to-app transfer hint. i18n has consumed and persisted it
// by this point, so remove it without disturbing unrelated query parameters.
const entryParams = new URLSearchParams(window.location.search)
if (normalizeUiLocale(entryParams.get('lang'))) {
  entryParams.delete('lang')
  const search = entryParams.toString()
  window.history.replaceState(
    {},
    '',
    `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
  )
}

/*
 * reducedMotion="user" makes every motion/react animation in the tree honour
 * the visitor's OS setting. The vendored magicui / reactbits components never
 * checked it individually; this settles the JS half for all of them at once
 * (the CSS half lives in shared/styles/motion.css).
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
