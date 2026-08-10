import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatCalendarDate,
  formatDate,
  formatDateTime,
  resolveIntlLocale,
} from './dateFormatting.js'

const SUPPORTED_INTL_LOCALES = {
  vi: 'vi-VN',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  ko: 'ko-KR',
  ja: 'ja-JP',
}

const DATE = new Date(2026, 7, 10, 14, 30)

test('resolves every supported newsroom language to its regional locale', () => {
  for (const [language, locale] of Object.entries(SUPPORTED_INTL_LOCALES)) {
    assert.equal(resolveIntlLocale(language), locale)
  }
})

test('formats the calendar date in every supported locale', () => {
  const formatted = Object.entries(SUPPORTED_INTL_LOCALES).map(([language, locale]) => {
    const expected = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(DATE)

    assert.equal(formatCalendarDate(DATE, language), expected)
    assert.ok(formatDate(DATE, language))
    assert.ok(formatDateTime(DATE, language))
    return expected
  })

  assert.equal(new Set(formatted).size, Object.keys(SUPPORTED_INTL_LOCALES).length)
})
