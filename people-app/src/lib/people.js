const LANG_KEY = 'icue_news_lang'
const FALLBACK_CHAIN = ['vi', 'en']

export function detectInitialLanguage() {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved) return saved

  const params = new URLSearchParams(window.location.search)
  if (params.get('lang') === 'en' || params.get('from') === 'en-news') {
    localStorage.setItem(LANG_KEY, 'en')
    return 'en'
  }

  return 'vi'
}

export function pickLocalized(map, lang) {
  if (!map || typeof map !== 'object') return ''
  for (const code of [lang, ...FALLBACK_CHAIN]) {
    if (map[code]) return map[code]
  }
  return Object.values(map)[0] || ''
}

export function localizePerson(person, lang) {
  const i18n = person.i18n || {}
  const chain = [lang, ...FALLBACK_CHAIN.filter((c) => c !== lang)]

  let fields = null
  for (const code of chain) {
    if (i18n[code]) {
      fields = i18n[code]
      break
    }
  }

  if (!fields) {
    return {
      id: person.id,
      photo: person.photo,
      name: person.name || '',
      honorific: person.honorific || '',
      title: person.title || '',
      bio: person.bio || '',
      highlights: person.highlights || [],
      links: (person.links || []).map((link) => ({
        url: link.url,
        label: typeof link.label === 'string' ? link.label : pickLocalized(link.label, lang),
      })),
    }
  }

  return {
    id: person.id,
    photo: person.photo,
    name: fields.name || '',
    honorific: fields.honorific || '',
    title: fields.title || '',
    bio: fields.bio || '',
    highlights: fields.highlights || [],
    links: (person.links || []).map((link) => ({
      url: link.url,
      label: pickLocalized(link.label, lang) || pickLocalized(link.label, 'vi'),
    })),
  }
}

export function localizePeople(people, lang) {
  return people.map((person) => localizePerson(person, lang))
}
