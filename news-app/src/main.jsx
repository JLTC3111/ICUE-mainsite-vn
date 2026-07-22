import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { cleanSiteParams } from './lib/siteOrigin'
import { initSupabase } from './lib/supabase'
import './lib/i18n'
import './styles/theme.css'
import './styles/newsroomTheme.css'
import './styles/performance.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { NewsroomThemeProvider } from './context/NewsroomThemeContext'
import { PerformanceProfileProvider } from './context/PerformanceProfileContext'

// Strip entry hints after i18n + detectEntrySite have read them.
cleanSiteParams()

async function bootstrap() {
  await initSupabase()

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <PerformanceProfileProvider>
        <AuthProvider>
          <NewsroomThemeProvider>
            <App />
          </NewsroomThemeProvider>
        </AuthProvider>
      </PerformanceProfileProvider>
    </StrictMode>,
  )
}

bootstrap()
