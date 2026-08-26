import { Fragment, useMemo } from 'react'

/**
 * Wraps every case-insensitive occurrence of `term` in a <mark>.
 *
 * The legacy version built this with a regex replace into `innerHTML`
 * (src/script.js:3200-3205), which meant the search box was a path from typed
 * text to injected markup. Splitting the string and returning real elements
 * gets the same highlight with none of that.
 */
export default function Highlight({ text, term }) {
  const parts = useMemo(() => split(text, term), [text, term])

  if (parts.length === 1) return parts[0]

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      // eslint-disable-next-line react/no-array-index-key
      <mark className="rc-mark" key={index}>
        {part}
      </mark>
    ) : (
      // eslint-disable-next-line react/no-array-index-key
      <Fragment key={index}>{part}</Fragment>
    ),
  )
}

/** Odd indices are matches; even indices are the text between them. */
function split(text, term) {
  const value = String(text ?? '')
  const needle = String(term ?? '').trim()
  if (!needle) return [value]

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return value.split(new RegExp(`(${escaped})`, 'gi'))
}
