import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { normalizeDeep } from '@icue/text/normalizeUnicode'
import { detectInitialLanguage } from './detectLanguage'

import vi from '../locales/vi.json'
import en from '../locales/en.json'
import de from '../locales/de.json'
import fr from '../locales/fr.json'
import ko from '../locales/ko.json'
import ja from '../locales/ja.json'

/**
 * English is a resource here now, but it is still not this site's language.
 *
 * icue.vn *is* the Vietnamese site; the English build is a separate deploy at
 * en.icue.vn, and the flag has always crossed to it. What changed is that the
 * About page moved: there is one About page for both hosts, it lives here, and
 * en.icue.vn/about-us redirects to it. That route therefore has to answer in
 * English — hence `en.json` — while every other route on this host stays
 * Vietnamese and keeps sending English readers across.
 *
 * Two guards keep those apart, and neither lives in this file:
 *   - detectLanguage only accepts `en` on a SHARED_LOCALE_PATHS route, so no
 *     stored or `?lang=`-requested English can turn the home page English.
 *   - SiteLanguageMenu still navigates to en.icue.vn everywhere except those
 *     routes, where it changes language in place instead.
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

i18n
  .use(normalizePostProcessor)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: normalizeDeep(vi) },
      en: { translation: normalizeDeep(en) },
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
