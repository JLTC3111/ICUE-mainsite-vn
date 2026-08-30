import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { gsap } from 'gsap'
import { ABOUT_US_SLIDES } from '../../data/aboutUsContent'

const SLIDE_INTERVAL = 45_000
/** Per-character typing delay, with a longer beat after sentence punctuation. */
const TYPE_DELAY = 18
const TYPE_DELAY_AFTER_PUNCTUATION = 70

/**
 * Lays `html` into `target` as fully-formed but empty nodes, plus a queue of
 * one-character appends. Typing then never re-parses HTML mid-flight: the
 * <strong class="highlight-text-phrase"> wrappers are in place from the first
 * keystroke and fill in character by character.
 */
function buildTypingOperations(target, html) {
  const template = document.createElement('template')
  template.innerHTML = html
  const operations = []

  const cloneInto = (source, parent) => {
    if (source.nodeType === Node.TEXT_NODE) {
      const text = document.createTextNode('')
      parent.appendChild(text)
      for (const character of source.textContent || '') {
        operations.push(() => {
          text.data += character
        })
      }
      return
    }

    if (source.nodeType !== Node.ELEMENT_NODE) return
    const clone = source.cloneNode(false)
    parent.appendChild(clone)
    source.childNodes.forEach((child) => cloneInto(child, clone))
  }

  target.replaceChildren()
  template.content.childNodes.forEach((node) => cloneInto(node, target))
  return operations
}

/**
 * The About hero's statement carousel: six sentences typed out one at a time,
 * with a progress dot per sentence whose fill animation runs the length of the
 * 45s dwell.
 *
 * `slide.tick` is what actually drives a re-render — advancing to the same
 * index (clicking the dot that is already active) still has to restart both the
 * typing and the dot's progress animation, which a bare index could not express.
 */
export default function AboutTextSlider() {
  const sliderRef = useRef(null)
  const textRef = useRef(null)
  const dotRefs = useRef([])
  const { t, i18n } = useTranslation()

  // `returnObjects` hands back the key string rather than the array when the
  // key is missing, so a locale that has fallen behind renders the Vietnamese
  // statements instead of the literal text "about.slides".
  const slides = useMemo(() => {
    const value = t('about.slides', { returnObjects: true })
    return Array.isArray(value) && value.length ? value : ABOUT_US_SLIDES
  }, [t, i18n.resolvedLanguage])

  const [slide, setSlide] = useState({ index: 0, reveal: false, tick: 0 })
  const [paused, setPaused] = useState(false)
  const typingRef = useRef(false)

  const goTo = useCallback(
    (nextIndex) => {
      setSlide((current) => ({
        index: (nextIndex + slides.length) % slides.length,
        reveal: false,
        tick: current.tick + 1,
      }))
    },
    [slides.length],
  )

  // Retype the statement the reader was on when they switch language, rather
  // than leaving the previous language's sentence on screen until the 45s dwell
  // runs out. The index is kept; only the language under it changes.
  useEffect(() => {
    setSlide((current) => ({ ...current, reveal: false, tick: current.tick + 1 }))
  }, [slides])

  // Restart the active dot's fill. Every dot has to be cleared, not just the
  // one taking over: `slide-progress` ends `forwards`, so a dot that kept its
  // inline animation from its own turn would stay stuck at the filled width.
  // And reassigning the same animation name is a no-op without a reflow between.
  useEffect(() => {
    dotRefs.current.forEach((dot, dotIndex) => {
      if (!dot) return
      dot.style.animation = 'none'
      void dot.offsetWidth
      if (dotIndex === slide.index) {
        dot.style.animation = `slide-progress ${SLIDE_INTERVAL / 1000}s linear forwards`
      }
    })
  }, [slide])

  useEffect(() => {
    const text = textRef.current
    if (!text) return undefined

    const message = slides[slide.index]

    if (slide.reveal) {
      typingRef.current = false
      text.innerHTML = message
      return undefined
    }

    let cancelled = false
    let timeoutId = null
    typingRef.current = true

    const operations = buildTypingOperations(text, message)
    let operationIndex = 0

    const typeNext = () => {
      if (cancelled) return
      const operation = operations[operationIndex]
      if (!operation) {
        typingRef.current = false
        return
      }
      operation()
      operationIndex += 1
      timeoutId = window.setTimeout(
        typeNext,
        /[.,!?]/.test(text.textContent?.slice(-1) || '')
          ? TYPE_DELAY_AFTER_PUNCTUATION
          : TYPE_DELAY,
      )
    }

    gsap.killTweensOf(text)
    gsap.fromTo(
      text,
      { opacity: 0, scale: 0.97, y: 8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: 'power2.out', onComplete: typeNext },
    )

    return () => {
      cancelled = true
      typingRef.current = false
      if (timeoutId != null) window.clearTimeout(timeoutId)
      gsap.killTweensOf(text)
    }
  }, [slide, slides])

  // Auto-advance. Keyed on `tick` so any manual move restarts the full dwell,
  // and on `paused` so hovering the slider holds the current statement.
  useEffect(() => {
    if (paused) return undefined
    const timerId = window.setTimeout(() => goTo(slide.index + 1), SLIDE_INTERVAL)
    return () => window.clearTimeout(timerId)
  }, [goTo, paused, slide])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }
      if (event.key === 'ArrowLeft') goTo(slide.index - 1)
      else if (event.key === 'ArrowRight') goTo(slide.index + 1)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [goTo, slide.index])

  // Clicking the slider mid-typing completes the sentence rather than moving
  // on; otherwise the half it was clicked on decides the direction.
  const handleSliderClick = (event) => {
    if (event.target.closest('.dot')) return

    if (typingRef.current) {
      setSlide((current) => ({ ...current, reveal: true, tick: current.tick + 1 }))
      return
    }

    const rect = sliderRef.current.getBoundingClientRect()
    goTo(slide.index + (event.clientX - rect.left < rect.width / 2 ? -1 : 1))
  }

  return (
    <div className="about-legacy-hero__slider">
      <div
        className="home-text-slider"
        id="homeTextSlider"
        ref={sliderRef}
        onClick={handleSliderClick}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="home-slider-text" id="homeSliderText">
          {/* Written to directly by the typing effect above — React must not
              own its children, or every keystroke would fight reconciliation. */}
          <span className="highlight-text" ref={textRef} />
        </div>
      </div>

      <div className="slider-dots" id="sliderDots">
        {slides.map((_, dotIndex) => (
          <span
            // eslint-disable-next-line react/no-array-index-key
            key={dotIndex}
            ref={(el) => {
              dotRefs.current[dotIndex] = el
            }}
            className={`dot progress-dot${dotIndex === slide.index ? ' active' : ''}`}
            data-index={dotIndex}
            onClick={() => goTo(dotIndex)}
          />
        ))}
      </div>
    </div>
  )
}
