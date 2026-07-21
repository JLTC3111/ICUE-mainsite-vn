import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { normalizeDeep } from '@icue/text/normalizeUnicode'
import { detectEntrySite } from './siteOrigin'
import { detectInitialLanguage } from './referrerLang'

import { LOCALE_CODES } from './localeCodes'

import en from '../locales/en.json'
import vi from '../locales/vi.json'
import de from '../locales/de.json'
import fr from '../locales/fr.json'
import ko from '../locales/ko.json'
import ja from '../locales/ja.json'

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

i18n
  .use(normalizePostProcessor)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: normalizeDeep(en) },
      vi: { translation: normalizeDeep(vi) },
      de: { translation: normalizeDeep(de) },
      fr: { translation: normalizeDeep(fr) },
      ko: { translation: normalizeDeep(ko) },
      ja: { translation: normalizeDeep(ja) },
    },
    fallbackLng: 'vi',
    // Prefer main-site referrer / ?from= over a saved choice; otherwise localStorage
    // or Vietnamese. Browser language is ignored so Newsroom never opens in a
    // random locale on first visit.
    lng: detectInitialLanguage(),
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    postProcess: ['normalizeUnicode'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'icue_news_lang',
    },
  })

export default i18n
