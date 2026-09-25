import SiteChatbot from '../../shared/chatbot/SiteChatbot.jsx'
import AppRecovery from '../../shared/resilience/AppRecovery.jsx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { cleanSiteParams } from './lib/siteOrigin'
import i18n, { i18nReady } from './lib/i18n'
import './styles/theme.css'
import './styles/newsroomTheme.css'
import './styles/performance.css'
import './index.css'
import '@icue/styles/icue-base.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { NewsroomThemeProvider } from './context/NewsroomThemeProvider'
import { PerformanceProfileProvider } from './context/PerformanceProfileProvider'

// Strip entry hints after i18n + detectEntrySite have read them.
cleanSiteParams()

/*
 * reducedMotion="user" makes every motion/react animation in the tree honour
 * the visitor's OS setting. The vendored magicui / reactbits components never
 * checked it individually; this settles the JS half for all of them at once
 * (the CSS half lives in shared/styles/motion.css).
 */
function mountApp() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <AppRecovery>
        <MotionConfig reducedMotion="user">
          <PerformanceProfileProvider>
            <AuthProvider>
              <NewsroomThemeProvider>
                <App />
                <SiteChatbot i18n={i18n} />
              </NewsroomThemeProvider>
            </AuthProvider>
          </PerformanceProfileProvider>
        </MotionConfig>
      </AppRecovery>
    </StrictMode>,
  )
}

void i18nReady
  .then(mountApp)
  .catch(async () => {
    await i18n.changeLanguage('vi')
    mountApp()
  })
