import viCopy from '../data/newsArchive/copy/vi.js'
import enCopy from '../data/newsArchive/copy/en.js'
import deCopy from '../data/newsArchive/copy/de.js'
import frCopy from '../data/newsArchive/copy/fr.js'
import jaCopy from '../data/newsArchive/copy/ja.js'
import koCopy from '../data/newsArchive/copy/ko.js'
import { normalizeArchiveLang } from '../data/newsArchive/lang.js'

/** Archive pages are already a lazy route, so all six packs can load with them. */
const ARCHIVE_COPY = {
  vi: { ...viCopy, lang: 'vi' },
  en: { ...enCopy, lang: 'en' },
  de: { ...deCopy, lang: 'de' },
  fr: { ...frCopy, lang: 'fr' },
  ja: { ...jaCopy, lang: 'ja' },
  ko: { ...koCopy, lang: 'ko' },
}

export function getArchiveCopy(lang) {
  return ARCHIVE_COPY[normalizeArchiveLang(lang)]
}

export function useArchiveCopy(lang) {
  return getArchiveCopy(lang)
}
