import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import './TextReveal.css'

// Tags kept as opaque HTML (not word-split). Must not include void tags —
// those cannot receive children or dangerouslySetInnerHTML (React error #137).
const STATIC_HTML_TAGS = new Set([
  'TABLE',
  'IFRAME',
  'VIDEO',
  'PICTURE',
  'SVG',
  'FIGURE',
])

const VOID_TAGS = new Set(['AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT', 'LINK', 'META', 'SOURCE', 'TRACK', 'WBR'])

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function countWords(node, counter) {
  if (!node) return

  if (node.nodeType === Node.TEXT_NODE) {
    const words = (node.textContent ?? '').split(/\s+/).filter(Boolean)
    counter.total += words.length
    return
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return

  const tag = node.tagName
  if (VOID_TAGS.has(tag) || STATIC_HTML_TAGS.has(tag)) return
  if (node.classList?.contains('video-embed') || node.classList?.contains('table-wrap')) return

  node.childNodes.forEach((child) => countWords(child, counter))
}

const ATTR_RENAMES = {
  class: 'className',
  for: 'htmlFor',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  allowfullscreen: 'allowFullScreen',
  frameborder: 'frameBorder',
}

function cssTextToStyle(cssText) {
  if (!cssText) return undefined

  const style = {}
  for (const declaration of cssText.split(';')) {
    const trimmed = declaration.trim()
    if (!trimmed) continue
    const colon = trimmed.indexOf(':')
    if (colon === -1) continue

    const property = trimmed.slice(0, colon).trim()
    const value = trimmed.slice(colon + 1).trim()
    if (!property || !value) continue

    const camel = property.replace(/-([a-z])/gi, (_, char) => char.toUpperCase())
    style[camel] = value
  }

  return Object.keys(style).length ? style : undefined
}

function attrsFromNode(node) {
  const props = {}

  for (const attr of node.attributes) {
    const name = attr.name.toLowerCase()

    // React rejects string styles; convert CSS text → object, or omit.
    if (name === 'style') {
      const style = cssTextToStyle(attr.value)
      if (style) props.style = style
      continue
    }

    // Skip attrs React cannot apply as DOM props, and event/handler junk from CMS HTML.
    if (name === 'xmlns' || name.startsWith('on') || name.startsWith('data-pm-')) {
      continue
    }

    const propName = ATTR_RENAMES[name] || attr.name
    props[propName] = attr.value === '' ? true : attr.value
  }

  return props
}

function wordRange(index, total, finishBy) {
  // Compress reveals into the first `finishBy` of scroll progress so more text
  // is readable earlier while scrolling through the article.
  const start = (index / total) * finishBy
  const end = ((index + 1) / total) * finishBy
  return [start, Math.min(end, 1)]
}

function textToWords(text, progress, counter, key, finishBy) {
  const parts = text.split(/(\s+)/)

  return parts.map((part, index) => {
    if (!part || /^\s+$/.test(part)) return part

    const range = wordRange(counter.i, counter.total, finishBy)
    counter.i += 1

    return (
      <RevealWord key={`${key}-${index}`} progress={progress} range={range}>
        {part}
      </RevealWord>
    )
  })
}

function nodeToReact(node, progress, counter, key, finishBy) {
  if (!node) return null

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    if (!text) return null
    return textToWords(text, progress, counter, key, finishBy)
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null

  const tag = node.tagName

  // Void elements first — never pass children / innerHTML.
  if (VOID_TAGS.has(tag)) {
    return createElement(tag.toLowerCase(), { key, ...attrsFromNode(node) })
  }

  if (
    STATIC_HTML_TAGS.has(tag)
    || node.classList?.contains('video-embed')
    || node.classList?.contains('table-wrap')
  ) {
    const html = node.innerHTML
    return createElement(tag.toLowerCase(), {
      key,
      ...attrsFromNode(node),
      ...(html ? { dangerouslySetInnerHTML: { __html: html } } : {}),
    })
  }

  const children = [...node.childNodes]
    .map((child, index) => nodeToReact(child, progress, counter, `${key}-${index}`, finishBy))
    .filter(Boolean)

  return createElement(tag.toLowerCase(), { key, ...attrsFromNode(node) }, ...children)
}

function buildRevealTree(html, progress, finishBy) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html')
  const counter = { i: 0, total: 0 }

  countWords(doc.body, counter)
  if (counter.total === 0) return null

  counter.i = 0

  return [...doc.body.childNodes]
    .map((node, index) => nodeToReact(node, progress, counter, `root-${index}`, finishBy))
    .filter(Boolean)
}

function RevealWord({ children, progress, range }) {
  // Single layer: dim → full. Avoids Magic UI’s stacked ghost/visible which
  // litters serif + Vietnamese diacritics with a readable “shadow”.
  const opacity = useTransform(progress, range, [0.28, 1])

  return (
    <motion.span className="text-reveal__word" style={{ opacity }}>
      {children}
    </motion.span>
  )
}

export function TextReveal({ children, className, finishBy = 0.55 }) {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.9', 'end 0.55'],
  })

  const words = useMemo(() => String(children).split(/\s+/).filter(Boolean), [children])
  const total = words.length

  return (
    <div ref={sectionRef} className={cn('text-reveal', className)}>
      <div className="text-reveal__sticky">
        <p className="text-reveal__copy">
          {words.map((word, index) => (
            <RevealWord
              key={`${word}-${index}`}
              progress={scrollYProgress}
              range={wordRange(index, total, finishBy)}
            >
              {word}
            </RevealWord>
          ))}
        </p>
      </div>
    </div>
  )
}

export default function ArticleTextReveal({
  html,
  className,
  /** Fraction of content scroll by which the last word is fully revealed (lower = reveals more, sooner). */
  finishBy = 0.5,
}) {
  const sectionRef = useRef(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    // Finish reveal while more of the article is still on-screen.
    offset: ['start 0.9', 'end 0.55'],
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const content = useMemo(() => {
    if (reduceMotion || !html) return null
    return buildRevealTree(html, scrollYProgress, finishBy)
  }, [html, reduceMotion, scrollYProgress, finishBy])

  if (reduceMotion || !html) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: html || '' }}
      />
    )
  }

  if (!content) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: html || '' }}
      />
    )
  }

  return (
    <div ref={sectionRef} className={cn('text-reveal-content', className)}>
      {content}
    </div>
  )
}
