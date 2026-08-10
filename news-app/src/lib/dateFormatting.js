const INTL_LOCALES = {
  vi: 'vi-VN',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  ko: 'ko-KR',
  ja: 'ja-JP',
}

export function resolveIntlLocale(locale = 'vi') {
  const normalized = String(locale).trim().toLowerCase().replace('_', '-')
  const language = normalized.split('-')[0]
  return INTL_LOCALES[language] || INTL_LOCALES.vi
}

export function formatDate(value, locale = 'vi') {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

/** Current-calendar display used by the newsroom masthead. */
export function formatCalendarDate(value, locale = 'vi') {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

export function formatDateTime(value, locale = 'vi') {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return ''
  }
}
