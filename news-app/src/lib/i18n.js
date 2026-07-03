import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { normalizeUnicode } from '@icue/text/normalizeUnicode'
import { detectInitialLanguage } from './referrerLang'

import en from '../locales/en.json'
import vi from '../locales/vi.json'
import de from '../locales/de.json'
import fr from '../locales/fr.json'
import ko from '../locales/ko.json'
import ja from '../locales/ja.json'

// Add more languages by dropping a JSON file in src/locales and registering it here.
// `code` is the BCP-47 / ISO-639 code used for both the UI and machine translation.
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
  process: normalizeUnicode,
}

i18n
  .use(normalizePostProcessor)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
      de: { translation: de },
      fr: { translation: fr },
      ko: { translation: ko },
      ja: { translation: ja },
    },
    fallbackLng: 'vi',
    // Default to Vietnamese on first load. We only read a previously saved
    // choice from localStorage — without one we fall through to fallbackLng (vi),
    // ignoring the browser language so the Newsroom always opens in VI by default.
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
