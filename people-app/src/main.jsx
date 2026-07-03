import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { detectEntrySite, cleanSiteParams } from './lib/siteOrigin'
import './lib/i18n'
import './styles/theme.css'
import './index.css'
import App from './App.jsx'

detectEntrySite()
cleanSiteParams()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
