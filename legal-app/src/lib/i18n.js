import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { normalizeDeep } from '@icue/text/normalizeUnicode'
import { detectInitialLanguage, LANGUAGE_STORAGE_KEY } from './detectLanguage'

import vi from '../locales/vi.json'
import en from '../locales/en.json'

/**
 * The same six the newsroom, Our Work and Contact carry, in the same order, so
 * the flag menu reads identically wherever a reader meets it. Every string is
 * written rather than machine-translated.
 *
 * SCOPE — read this before adding keys. What is translated here is the page
 * *chrome*: tab labels, headings, the table of contents, the cookie console and
 * the contact card. The body of each legal document is not, and must not be,
 * machine-translated: it is the text ICUE is bound by. Those sections stay in
 * the authored Vietnamese and the page says so (see `notice.*`) whenever the
 * reader is on another locale. Dropping a reviewed translation in later is a
 * matter of adding `sections` to the locale file — see legalDocuments.js.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
]

/** The locale the legal text itself is authored and legally binding in. */
export const AUTHORITATIVE_LANGUAGE = 'vi'

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

/**
 * Vietnamese and English cover the normal entry paths and stay in the first
 * bundle. The other four are fetched only when a reader arrives with that
 * preference or picks it from the flag menu.
 */
const lazyLocaleBackend = {
  type: 'backend',
  init() {},
  read(language, _namespace, done) {
    const load = localeLoaders[language]
    if (!load) {
      done(new Error(`Unsupported legal locale: ${language}`), false)
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
      vi: { translation: normalizeDeep(vi) },
      en: { translation: normalizeDeep(en) },
    },
    partialBundledLanguages: true,
    fallbackLng: ['en', 'vi'],
    lng: detectInitialLanguage(),
    load: 'languageOnly',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    postProcess: ['normalizeUnicode'],
    interpolation: { escapeValue: false },
  })

i18n.on('languageChanged', (language) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Storage may be unavailable in privacy-restricted browsing contexts.
  }
})

export default i18n
