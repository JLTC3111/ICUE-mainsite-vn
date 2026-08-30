import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { normalizeDeep } from '@icue/text/normalizeUnicode'
import { detectInitialLanguage } from './detectLanguage'

import en from '../locales/en.json'
import vi from '../locales/vi.json'
import de from '../locales/de.json'
import fr from '../locales/fr.json'
import ko from '../locales/ko.json'
import ja from '../locales/ja.json'

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

i18n
  .use(normalizePostProcessor)
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
    fallbackLng: ['en', 'vi'],
    lng: detectInitialLanguage(),
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
