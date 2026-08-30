import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { normalizeDeep } from '@icue/text/normalizeUnicode'
import { detectEntrySite } from './siteOrigin'
import { detectInitialLanguage } from './referrerLang'

import { LOCALE_CODES } from './localeCodes'

import en from '../locales/en.json'
import vi from '../locales/vi.json'

// Capture entry site while ?from= / ?lang= / ?site= are still on the URL,
// before language init (and before main cleans those params).
detectEntrySite()

// Add more languages by dropping a JSON file in src/locales and registering it here.
// `code` must also be listed in localeCodes.js — used for UI + machine translation.
export const SUPPORTED_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
].filter(({ code }) => LOCALE_CODES.includes(code))

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
      done(new Error(`Unsupported newsroom locale: ${language}`), false)
      return
    }

    load()
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
      en: { translation: normalizeDeep(en) },
      vi: { translation: normalizeDeep(vi) },
    },
    partialBundledLanguages: true,
    fallbackLng: 'vi',
    // Prefer main-site referrer / ?from= over a saved choice; otherwise localStorage
    // or Vietnamese. Browser language is ignored so Newsroom never opens in a
    // random locale on first visit.
    lng: detectInitialLanguage(),
    load: 'languageOnly',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
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
