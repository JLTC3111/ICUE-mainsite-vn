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
// Last on purpose. As an injected legacy page this stylesheet sat in the body,
// after every bundled sheet, so it won ties against styles.css on equal
// specificity — see the header comment in AboutUsPage.css. Importing it from the
// page component instead would pull it in ahead of styles.css and quietly change
// the About page's layout.
import './pages/AboutUsPage.css'

window.gsap = gsap
installGlobalDebugHandlers()

// `?lang=` and `?site=` are app-to-app transfer hints — the second is what
// en.icue.vn's _redirects uses when it forwards /about-us here. i18n has
// consumed and persisted whichever arrived by this point, so remove them
// without disturbing unrelated query parameters.
const entryParams = new URLSearchParams(window.location.search)
if (normalizeUiLocale(entryParams.get('lang') || entryParams.get('site'))) {
  entryParams.delete('lang')
  entryParams.delete('site')
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
