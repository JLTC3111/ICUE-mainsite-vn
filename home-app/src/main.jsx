import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import App from './App.jsx'

gsap.registerPlugin(ScrollTrigger)
import { installGlobalDebugHandlers } from './lib/debugLog'
import { normalizeUiLocale } from '../../shared/site-routes/mainSitePaths.js'
import './lib/i18n'
import '../../styles.css'
import './styles/footer-theme.css'

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
