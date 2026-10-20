const DARK_ACCENTS = {
  privacy: { accent: '#93c5fd', accentSoft: '#182e45' },
  terms: { accent: '#c4b5fd', accentSoft: '#30234a' },
  gdpr: { accent: '#86efac', accentSoft: '#17382d' },
  cookies: { accent: '#fde68a', accentSoft: '#40321c' },
}

export function themeLegalDocument(document, isDark) {
  return isDark ? { ...document, ...DARK_ACCENTS[document.slug] } : document
}
