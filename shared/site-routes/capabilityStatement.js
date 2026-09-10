import { normalizeUiLocale } from './mainSitePaths.js'

/**
 * Site-root path, not an app asset: the PDF is ~88 MB and lives once in
 * public/docs/. `_redirects` maps /docs/* → /public/docs/:splat.
 */
export const CAPABILITY_STATEMENT_URL = '/docs/capability_statement.pdf'

/**
 * Suggested Save As names for the shared capability statement. The file on
 * disk does not change — browsers that honor the HTML `download` attribute
 * use this as the local filename. Korean/Japanese stay ASCII plus a locale
 * suffix so the name is safe on filesystems that mishandle Hangul/Kanji.
 */
const CAPABILITY_STATEMENT_FILENAMES = {
  vi: 'ICUE-ho-so-nang-luc.pdf',
  en: 'ICUE-capability-statement.pdf',
  de: 'ICUE-Leistungsprofil.pdf',
  fr: 'ICUE-dossier-de-references.pdf',
  ko: 'ICUE-capability-statement-ko.pdf',
  ja: 'ICUE-capability-statement-ja.pdf',
}

export function capabilityStatementFilename(lang) {
  const locale = normalizeUiLocale(lang, 'en')
  return CAPABILITY_STATEMENT_FILENAMES[locale] || CAPABILITY_STATEMENT_FILENAMES.en
}
