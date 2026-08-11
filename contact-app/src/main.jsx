import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { detectEntrySite, cleanSiteParams } from './lib/siteOrigin'
import i18n, { i18nReady } from './lib/i18n'
import './styles/theme.css'
import App from './App.jsx'

detectEntrySite()
cleanSiteParams()

function mountApp() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void i18nReady
  .then(mountApp)
  .catch(async () => {
    // A locale chunk can fail independently on a flaky connection. English is
    // bundled with the entry, so the contact form should still remain usable.
    await i18n.changeLanguage('en')
    mountApp()
  })
