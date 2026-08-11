import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { normalizeDeep } from '@icue/text/normalizeUnicode'
import { detectInitialLanguage } from './detectLanguage'

import vi from '../locales/vi.json'
import de from '../locales/de.json'
import fr from '../locales/fr.json'
import ko from '../locales/ko.json'
import ja from '../locales/ja.json'

/**
 * English is in the menu but not in the resources on purpose. This site *is*
 * the Vietnamese one; the English home page is a whole separate build at
 * en.icue.vn, and the flag has always crossed to it. Translating an `en.json`
 * here would put a second, worse English home page on icue.vn.
 *
 * So the disc lists all six languages in the order every other ICUE app uses,
 * and picking English navigates instead of re-rendering — see SiteLanguageMenu.
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

/** The five this build can actually render. */
export const UI_LANGUAGES = SUPPORTED_LANGUAGES.filter(
  (lang) => lang.code !== CROSS_SITE_LANGUAGE.code,
)

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
      vi: { translation: normalizeDeep(vi) },
      de: { translation: normalizeDeep(de) },
      fr: { translation: normalizeDeep(fr) },
      ko: { translation: normalizeDeep(ko) },
      ja: { translation: normalizeDeep(ja) },
    },
    fallbackLng: 'vi',
    lng: detectInitialLanguage(),
    supportedLngs: UI_LANGUAGES.map((lang) => lang.code),
    postProcess: ['normalizeUnicode'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'icue_news_lang',
    },
  })

export default i18n
