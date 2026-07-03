const LANG_KEY = 'icue_news_lang'

/** Profile bios only exist in vi + en; other UI langs should fall back to English. */
function profileLangChain(lang) {
  if (lang === 'vi') return ['vi', 'en']
  if (lang === 'en') return ['en', 'vi']
  return [lang, 'en']
}

function isEnReferrer() {
  try {
    const ref = document.referrer
    if (!ref) return false
    const host = new URL(ref).hostname.toLowerCase()
    return host === 'en.icue.vn' || host.endsWith('.en.icue.vn')
  } catch {
    return false
  }
}

export function detectInitialLanguage() {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved) return saved

  const params = new URLSearchParams(window.location.search)
  if (
    params.get('lang') === 'en'
    || params.get('from') === 'en-news'
    || params.get('site') === 'en'
    || isEnReferrer()
  ) {
    localStorage.setItem(LANG_KEY, 'en')
    return 'en'
  }

  return 'vi'
}

export function resolveAssetUrl(assetPath) {
  if (!assetPath) return ''
  if (/^https?:\/\//.test(assetPath)) return assetPath
  const normalized = assetPath.replace(/^\//, '')
  return `${import.meta.env.BASE_URL}${normalized}`
}

export function pickLocalized(map, lang) {
  if (!map || typeof map !== 'object') return ''
  for (const code of profileLangChain(lang)) {
    if (map[code]) return map[code]
  }
  return Object.values(map)[0] || ''
}

export function localizePerson(person, lang) {
  const i18n = person.i18n || {}
  const chain = profileLangChain(lang)

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
      photo: resolveAssetUrl(person.photo),
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
    photo: resolveAssetUrl(person.photo),
    name: fields.name || '',
    honorific: fields.honorific || '',
    title: fields.title || '',
    bio: fields.bio || '',
    highlights: fields.highlights || [],
    links: (person.links || []).map((link) => ({
      url: link.url,
      label: pickLocalized(link.label, lang) || pickLocalized(link.label, 'en'),
    })),
  }
}

export function localizePeople(people, lang) {
  return people.map((person) => localizePerson(person, lang))
}
