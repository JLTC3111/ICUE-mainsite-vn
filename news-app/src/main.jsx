import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { cleanSiteParams } from './lib/siteOrigin'
import { initSupabase } from './lib/supabase'
import './lib/i18n'
import './styles/theme.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'

// Strip entry hints after i18n + detectEntrySite have read them.
cleanSiteParams()

async function bootstrap() {
  await initSupabase()

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  )
}

bootstrap()
