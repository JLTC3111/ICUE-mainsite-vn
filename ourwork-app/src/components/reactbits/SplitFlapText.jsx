import './SplitFlapText.css'

const DEFAULT_PHRASES = ['LAUNCH READY', 'SYNC ONLINE', 'SIGNAL LIVE']

const toCssUnit = (value) => (typeof value === 'number' ? `${value}px` : value)

function lastNonEmptyPhrase(phrases) {
  if (!Array.isArray(phrases)) return String(phrases ?? '')

  let result = ''
  phrases.forEach((phrase) => {
    if (String(phrase ?? '').trim()) result = String(phrase)
  })
  return result
}

function splitIntoWords(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
}

/**
 * A lightweight arrival-board treatment with one physical tile per word.
 *
 * `words` remains as a compatibility fallback for the original React Bits
 * API, but this component deliberately renders its final phrase only. Cycling
 * and character scrambling made the heading harder to read and kept a JS
 * animation loop alive for an effect CSS can handle on the compositor.
 */
export default function SplitFlapText({
  text,
  words = DEFAULT_PHRASES,
  flipDuration = 0.48,
  stagger = 0.085,
  initialDelay = 160,
  tileColor = '#111827',
  textColor = '#f8fafc',
  tileRadius = 6,
  gap,
  fontSize = 52,
  className = '',
  style = {},
  // Retired character-animation props are consumed so older call sites do not
  // leak them as invalid attributes onto the DOM element.
  charset: _charset,
  flipsPerChar: _flipsPerChar,
  cycleDelay: _cycleDelay,
  loop: _loop,
  padTo: _padTo,
  ...props
}) {
  const resolvedText = typeof text === 'string' ? text : lastNonEmptyPhrase(words)
  const normalizedText = String(resolvedText ?? '').normalize('NFC')
  const wordTokens = splitIntoWords(normalizedText)
  const safeDuration = Math.max(0.12, Number(flipDuration) || 0.48)
  const safeStagger = Math.max(0, Number(stagger) || 0)
  const safeInitialDelay = Math.max(0, Number(initialDelay) || 0)

  const componentStyle = {
    '--split-flap-tile-color': tileColor,
    '--split-flap-text-color': textColor,
    '--split-flap-radius': toCssUnit(tileRadius),
    '--split-flap-font-size': toCssUnit(fontSize),
    '--split-flap-flip-duration': `${safeDuration}s`,
    ...(gap == null ? {} : { '--split-flap-gap': toCssUnit(gap) }),
    ...style,
  }

  return (
    <span
      className={`split-flap-text${className ? ` ${className}` : ''}`}
      style={componentStyle}
      aria-label={normalizedText || undefined}
      {...props}
    >
      {wordTokens.map((word, index) => (
        <span
          className="split-flap-text__tile"
          aria-hidden="true"
          key={`${word}-${index}`}
          style={{
            '--split-flap-delay': `${safeInitialDelay + index * safeStagger * 1000}ms`,
          }}
        >
          <span className="split-flap-text__measure">{word}</span>
          <span className="split-flap-text__half split-flap-text__half--top">
            <span className="split-flap-text__word">{word}</span>
          </span>
          <span className="split-flap-text__half split-flap-text__half--bottom">
            <span className="split-flap-text__word">{word}</span>
          </span>
        </span>
      ))}
    </span>
  )
}

export function SplitFlapHeadline({ text, className = '' }) {
  const normalizedText = String(text ?? '').normalize('NFC')

  return (
    <h1
      className={`ow-hero-flap${className ? ` ${className}` : ''}`}
      aria-label={normalizedText}
    >
      <span className="ow-hero-flap__visual" aria-hidden="true">
        <SplitFlapText
          className="ow-hero-flap__board"
          text={normalizedText}
          flipDuration={0.46}
          stagger={0.075}
          initialDelay={180}
          tileColor="#111827"
          textColor="#f8fafc"
          tileRadius={3}
          gap="clamp(7px, 0.8vw, 11px)"
          fontSize="clamp(24px, 2.35vw, 32px)"
        />
      </span>
    </h1>
  )
}
