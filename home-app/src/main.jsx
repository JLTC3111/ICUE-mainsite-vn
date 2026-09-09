import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import App from './App.jsx'

import { installGlobalDebugHandlers } from './lib/debugLog'
import { normalizeUiLocale } from '../../shared/site-routes/mainSitePaths.js'
import { NOTABLE_AWARDS_REDIRECTS } from '../../shared/site-routes/notableAwardsRedirects.js'
import i18n, { i18nReady } from './lib/i18n'
import '../../styles.css'
import './styles/footer-theme.css'
import '@icue/styles/icue-base.css'
// Last on purpose. As an injected legacy page this stylesheet sat in the body,
// after every bundled sheet, so it won ties against styles.css on equal
// specificity — see the header comment in AboutUsPage.css. Importing it from the
// page component instead would pull it in ahead of styles.css and quietly change
// the About page's layout.
import './pages/AboutUsPage.css'

installGlobalDebugHandlers()

// `?lang=` and `?site=` are app-to-app transfer hints — the second is what
// en.icue.vn's _redirects uses when it forwards /about-us here. i18n has
// consumed and persisted whichever arrived by this point, so remove them
// without disturbing unrelated query parameters.
const entryParams = new URLSearchParams(window.location.search)
const hasLocaleHint = normalizeUiLocale(entryParams.get('lang') || entryParams.get('site'))
const hasAwardsHash = window.location.hash === '#/notableAwards'
const awardsEntryPath = hasAwardsHash ? '/notable-awards' : NOTABLE_AWARDS_REDIRECTS[window.location.pathname]
if (hasLocaleHint) {
  entryParams.delete('lang')
  entryParams.delete('site')
}
// Fragments never reach the server. Normalize the old awards bookmark before
// BrowserRouter mounts, preserving unrelated query parameters and anchors.
if (hasLocaleHint || awardsEntryPath) {
  const search = entryParams.toString()
  window.history.replaceState(
    {},
    '',
    `${awardsEntryPath || window.location.pathname}${search ? `?${search}` : ''}${hasAwardsHash ? '' : window.location.hash}`,
  )
}

/*
 * reducedMotion="user" makes every motion/react animation in the tree honour
 * the visitor's OS setting. The vendored magicui / reactbits components never
 * checked it individually; this settles the JS half for all of them at once
 * (the CSS half lives in shared/styles/motion.css).
 */
function mountApp() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </StrictMode>,
  )
}

void i18nReady
  .then(mountApp)
  .catch(async () => {
    await i18n.changeLanguage('vi')
    mountApp()
  })
