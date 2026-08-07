import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { detectEntrySite, cleanSiteParams } from './lib/siteOrigin'
import { assertOurWorkShape } from './data/ourWorkScopes'
import './lib/i18n'
import './styles/theme.css'
import App from './App.jsx'

detectEntrySite()
cleanSiteParams()

if (import.meta.env.DEV) {
  assertOurWorkShape()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
