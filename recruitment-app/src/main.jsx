import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { detectEntrySite, cleanSiteParams } from './lib/siteOrigin'
import i18n, { i18nReady } from './lib/i18n'
import './styles/theme.css'
import '@icue/styles/icue-base.css'
import '@icue/styles/radius-reset.css'
import App from './App.jsx'

detectEntrySite()
cleanSiteParams()

function mountApp() {
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
}

void i18nReady
  .then(mountApp)
  .catch(async () => {
    // A locale chunk can fail independently on a flaky connection. English is
    // bundled with the entry, so the page still renders.
    await i18n.changeLanguage('en')
    mountApp()
  })
