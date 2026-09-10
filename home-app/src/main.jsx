import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import App from './App.jsx'

import { installGlobalDebugHandlers } from './lib/debugLog'
import { normalizeUiLocale, withLocale } from '../../shared/site-routes/mainSitePaths.js'
import { NOTABLE_AWARDS_REDIRECTS } from '../../shared/site-routes/notableAwardsRedirects.js'
import { resolvePastProjectRedirect } from '../../shared/site-routes/pastProjectsRedirects.js'
import { HOME_APP_HASH_PATHS, servesAllLocales } from './lib/routes'
import i18n, { i18nReady } from './lib/i18n'
import '../../styles.css'
import './styles/footer-theme.css'
import '@icue/styles/icue-base.css'

installGlobalDebugHandlers()

// `?lang=` is the canonical app-to-app transfer hint. `?site=` and
// `?from=en-news` remain readable for old bookmarks, then drop out of newly
// rewritten URLs. Keep `lang` on subpages (and on Home for non-English UI)
// so the address bar stays shareable after i18n has consumed it.
const entryParams = new URLSearchParams(window.location.search)
const hasLocaleHint = normalizeUiLocale(entryParams.get('lang') || entryParams.get('site'))
  || (entryParams.get('from') === 'en-news' ? 'en' : null)
let storedLang = null
try {
  storedLang = normalizeUiLocale(localStorage.getItem('icue_news_lang'))
} catch {
  storedLang = null
}
const hasAwardsHash = window.location.hash === '#/notableAwards'
const awardsEntryPath = hasAwardsHash ? '/notable-awards' : NOTABLE_AWARDS_REDIRECTS[window.location.pathname]
const homeAppHashPath = HOME_APP_HASH_PATHS[window.location.hash]
const externalHashPath = {
  '#/Contact': '/contact',
  '#/ourWork': '/our-work',
  '#/orgStructure': '/structure/',
  '#/meetOurExperts': '/people/experts',
  '#/coreTeam': '/people/core-team',
  '#/FAQs': '/faqs',
  '#/faqs': '/faqs',
  '#/recruitment': '/recruitment',
  '#/communityActivities': '/community-activities',
  '#/privacy': '/legal/privacy',
  '#/terms': '/legal/terms',
  '#/gdpr': '/legal/gdpr',
  '#/cookies': '/legal/cookies',
}[window.location.hash]
const pastProjectsEntryPath = resolvePastProjectRedirect(
  window.location.pathname,
  window.location.search,
  window.location.hash,
)
if (entryParams.has('site')) entryParams.delete('site')
if (entryParams.get('from') === 'en-news') entryParams.delete('from')
if (!servesAllLocales() && normalizeUiLocale(entryParams.get('lang')) === 'en') {
  entryParams.delete('lang')
}
if (pastProjectsEntryPath) {
  entryParams.delete('id')
}
// Fragments never reach the server. Normalize old awards / past-project
// bookmarks before BrowserRouter mounts.
if (externalHashPath) {
  window.location.replace(
    withLocale(`https://icue.vn${externalHashPath}`, hasLocaleHint || storedLang || 'vi'),
  )
} else {
  const nextPath = awardsEntryPath || pastProjectsEntryPath || homeAppHashPath || window.location.pathname
  if (servesAllLocales(nextPath) && !entryParams.get('lang') && (hasLocaleHint || storedLang)) {
    entryParams.set('lang', hasLocaleHint || storedLang)
  }
  const search = entryParams.toString()
  const keepHash = !hasAwardsHash && window.location.hash !== '#/pastProjects' && !homeAppHashPath
  const nextHref = `${nextPath}${search ? `?${search}` : ''}${keepHash ? window.location.hash : ''}`
  const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (nextHref !== currentHref) {
    window.history.replaceState({}, '', nextHref)
  }
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

if (!externalHashPath) {
  void i18nReady
    .then(mountApp)
    .catch(async () => {
      await i18n.changeLanguage('vi')
      mountApp()
    })
}
