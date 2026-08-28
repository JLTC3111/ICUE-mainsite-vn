import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { normalizeDeep } from '@icue/text/normalizeUnicode'
import { detectInitialLanguage, LANGUAGE_STORAGE_KEY } from './detectLanguage'

import vi from '../locales/vi.json'
import en from '../locales/en.json'

/**
 * The same six the newsroom, Our Work, Contact and the legal centre carry, in
 * the same order, so the flag menu reads identically wherever a reader meets
 * it. Every string is written rather than machine-translated.
 *
 * SCOPE — this file covers the page *chrome*: nav and footer labels, section
 * headings and aria text. The programmes themselves — their names, places and
 * photo captions — live in src/data/programmes.js, which carries all six
 * locales per entry so an author sees every language of a programme at once.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'ko', label: '한국어' },
  { code: 'ja', label: '日本語' },
]

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
      done(new Error(`Unsupported community locale: ${language}`), false)
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
