import { withDeadline } from '../../../shared/resilience/requests.js'
import { installLocaleRecovery } from '../../../shared/resilience/localeRecovery.js'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { normalizeDeep } from '@icue/text/normalizeUnicode'
import { detectInitialLanguage } from './detectLanguage'

import vi from '../locales/vi.json'
import en from '../locales/en.json'

/**
 * English is a resource here for every subpage, while Home retains its
 * dedicated English deployment at en.icue.vn.
 *
 * Two guards keep those apart, and neither lives in this file:
 *   - detectLanguage accepts `en` on every non-home route.
 *   - SiteLanguageMenu crosses to en.icue.vn only from Home and otherwise
 *     changes language in place.
 *
 * The disc lists all six languages in the order every other ICUE app uses.
 */
export const CROSS_SITE_LANGUAGE = { code: 'en', label: 'English' }

export const SUPPORTED_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  CROSS_SITE_LANGUAGE,
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
]

/**
 * All six now have translations to render. Whether a given route is *allowed*
 * to render English is a separate question, answered by detectLanguage.
 */
export const UI_LANGUAGES = SUPPORTED_LANGUAGES

const normalizePostProcessor = {
  type: 'postProcessor',
  name: 'normalizeUnicode',
  process: (value) => normalizeDeep(value),
}

const localeLoaders = {
  de: () => import('../locales/de.json'),
  fr: () => import('../locales/fr.json'),
  ko: () => import('../locales/ko.json'),
  ja: () => import('../locales/ja.json'),
}

const lazyLocaleBackend = {
  type: 'backend',
  init() {},
  read(language, _namespace, done) {
    const load = localeLoaders[language]
    if (!load) {
      done(new Error(`Unsupported home locale: ${language}`), false)
      return
    }

    withDeadline(load)
      .then((module) => done(null, normalizeDeep(module.default)))
      .catch((error) => done(error, false))
  },
}

export const i18nReady = i18n
  .use(normalizePostProcessor)
  .use(lazyLocaleBackend)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: normalizeDeep(vi) },
      en: { translation: normalizeDeep(en) },
    },
    partialBundledLanguages: true,
    fallbackLng: 'vi',
    lng: detectInitialLanguage(),
    load: 'languageOnly',
    supportedLngs: UI_LANGUAGES.map((lang) => lang.code),
    postProcess: ['normalizeUnicode'],
    interpolation: { escapeValue: false },
  })

i18n.on('languageChanged', (language) => {
  try {
    localStorage.setItem('icue_news_lang', language)
  } catch {
    // Storage may be unavailable in privacy-restricted browsing contexts.
  }
})

export default i18n

const stopLocaleRecovery = installLocaleRecovery(i18n, localeLoaders, normalizeDeep)
if (import.meta.hot) import.meta.hot.dispose(stopLocaleRecovery)
