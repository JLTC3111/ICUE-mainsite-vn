import { de, enUS, fr, ja, ko, vi } from '@daypicker/react/locale'

/** Map app language codes → DayPicker locale objects. */
export const DAY_PICKER_LOCALES = {
  vi,
  en: enUS,
  de,
  fr,
  ko,
  ja,
}

/** Map app language codes → BCP 47 tags for Intl formatting. */
export const INTL_LOCALES = {
  vi: 'vi-VN',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  ko: 'ko-KR',
  ja: 'ja-JP',
}

export function resolveLang(lang) {
  const code = String(lang || 'vi').split('-')[0]
  return DAY_PICKER_LOCALES[code] ? code : 'vi'
}

export function getDayPickerLocale(lang) {
  return DAY_PICKER_LOCALES[resolveLang(lang)]
}

export function getIntlLocale(lang) {
  return INTL_LOCALES[resolveLang(lang)]
}

/** Parse YYYY-MM-DD as a local calendar date (avoids UTC shift). */
export function parseISODate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function toISODate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDisplayDate(iso, lang) {
  const date = parseISODate(iso)
  if (!date) return ''
  try {
    return new Intl.DateTimeFormat(getIntlLocale(lang), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  } catch {
    return iso
  }
}

/** Parse HH:mm (24h) → { hours, minutes }. */
export function parseTimeValue(value) {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return null
  const [h, m] = value.split(':').map(Number)
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return { hours: h, minutes: m }
}

export function toTimeValue(hours, minutes) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function uses12HourClock(lang) {
  try {
    return Boolean(
      new Intl.DateTimeFormat(getIntlLocale(lang), { hour: 'numeric' })
        .resolvedOptions()
        .hour12,
    )
  } catch {
    return false
  }
}

export function formatDisplayTime(value, lang) {
  const parsed = parseTimeValue(value)
  if (!parsed) return ''
  const date = new Date()
  date.setHours(parsed.hours, parsed.minutes, 0, 0)
  try {
    return new Intl.DateTimeFormat(getIntlLocale(lang), {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  } catch {
    return value
  }
}
