import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { cleanSiteParams } from './lib/siteOrigin'
import { initSupabase } from './lib/supabase'
import './lib/i18n'
import './styles/theme.css'
import './styles/newsroomTheme.css'
import './styles/performance.css'
import './index.css'
import '@icue/styles/icue-base.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { NewsroomThemeProvider } from './context/NewsroomThemeContext'
import { PerformanceProfileProvider } from './context/PerformanceProfileContext'

// Strip entry hints after i18n + detectEntrySite have read them.
cleanSiteParams()

async function bootstrap() {
  await initSupabase()

  /*
 * reducedMotion="user" makes every motion/react animation in the tree honour
 * the visitor's OS setting. The vendored magicui / reactbits components never
 * checked it individually; this settles the JS half for all of them at once
 * (the CSS half lives in shared/styles/motion.css).
 */
createRoot(document.getElementById('root')).render(
    <StrictMode>
    <MotionConfig reducedMotion="user">
        <PerformanceProfileProvider>
          <AuthProvider>
            <NewsroomThemeProvider>
              <App />
            </NewsroomThemeProvider>
          </AuthProvider>
        </PerformanceProfileProvider>
    </MotionConfig>
    </StrictMode>,
  )
}

bootstrap()
