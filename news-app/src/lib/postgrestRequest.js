/**
 * Match postgrest-js' select() serialization: formatting whitespace is removed
 * before the value is sent to PostgREST, while quoted identifiers keep theirs.
 */
export function cleanPostgrestSelect(columns = '*') {
  let quoted = false

  return String(columns ?? '*')
    .split('')
    .map((character) => {
      if (/\s/.test(character) && !quoted) return ''
      if (character === '"') quoted = !quoted
      return character
    })
    .join('')
}

export function buildPostgrestUrl(baseUrl, table, query) {
  const url = new URL(`/rest/v1/${encodeURIComponent(table)}`, baseUrl)

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    const serialized = key === 'select'
      ? cleanPostgrestSelect(value)
      : String(value)
    url.searchParams.set(key, serialized)
  }

  return url
}
