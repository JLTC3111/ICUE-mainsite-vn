import { Fragment, useMemo } from 'react'
import { highlightSegments } from '../lib/highlightMatches'
import './HighlightedText.css'

/**
 * Marks the live-search terms inside a piece of card copy.
 *
 * Returns the bare string when there is nothing to mark, so a card rendered
 * with no query in play carries no extra elements at all — the grid is long and
 * this sits on every headline, subtitle and byline in it.
 */
export default function HighlightedText({ text, query }) {
  const segments = useMemo(() => highlightSegments(text, query), [text, query])

  if (segments.length === 1) return segments[0].text

  return segments.map((segment, index) => (segment.match ? (
    <mark key={index} className="news-mark">{segment.text}</mark>
  ) : (
    <Fragment key={index}>{segment.text}</Fragment>
  )))
}
