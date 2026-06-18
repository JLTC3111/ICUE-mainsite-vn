import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from '../locales/en.json'
import vi from '../locales/vi.json'

// Add more languages by dropping a JSON file in src/locales and registering it here.
export const SUPPORTED_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    fallbackLng: 'vi',
    // Default to Vietnamese on first load. We only read a previously saved
    // choice from localStorage — without one we fall through to fallbackLng (vi),
    // ignoring the browser language so the Newsroom always opens in VI by default.
    lng: localStorage.getItem('icue_news_lang') || 'vi',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'icue_news_lang',
    },
  })

export default i18n
