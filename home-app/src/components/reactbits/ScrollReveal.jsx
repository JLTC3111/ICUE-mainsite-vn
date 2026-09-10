import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import './ScrollReveal.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * React Bits "Scroll Reveal" — words fade/unblur as their block scrolls
 * through the viewport.
 * @see https://reactbits.dev/text-animations/scroll-reveal
 *
 * Vendored as CSS (no Tailwind). Adapted for sanitized HTML article bodies:
 *  - Renders a `<section>` / `<div>`, not the upstream `<h2>`.
 *  - Walks `p, h2, h3, li, blockquote` and wraps words after paint.
 *  - One ScrollTrigger per block so long articles reveal as you read.
 *  - No container-level rotate (it shears the archive cream card).
 *  - `gsap.context` cleanup — never `ScrollTrigger.getAll().kill()`.
 *  - `prefers-reduced-motion` leaves the HTML visible and untweened.
 */

const WORD_BLOCKS = 'p, h2, h3, li, blockquote'

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function wrapWordsIn(root) {
  const blocks = root.querySelectorAll(WORD_BLOCKS)
  blocks.forEach((block) => {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode(text) {
        if (!text.nodeValue || !text.nodeValue.trim()) return NodeFilter.FILTER_REJECT
        const parent = text.parentElement
        if (parent?.closest('code, pre, script, style')) return NodeFilter.FILTER_REJECT
        if (parent?.classList.contains('word')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })

    const nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)

    nodes.forEach((textNode) => {
      const fragment = document.createDocumentFragment()
      String(textNode.nodeValue).split(/(\s+)/).forEach((part) => {
        if (!part) return
        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part))
          return
        }
        const word = document.createElement('span')
        word.className = 'word'
        word.textContent = part
        fragment.appendChild(word)
      })
      textNode.parentNode?.replaceChild(fragment, textNode)
    })
  })
}

export default function ScrollReveal({
  html = '',
  enableBlur = false,
  baseOpacity = 0.1,
  blurStrength = 4,
  containerClassName = '',
  wordAnimationEnd = 'bottom bottom',
}) {
  const containerRef = useRef(null)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    el.innerHTML = html || ''
    if (!html || prefersReducedMotion()) return undefined

    wrapWordsIn(el)

    const ctx = gsap.context(() => {
      el.querySelectorAll(WORD_BLOCKS).forEach((block) => {
        const words = block.querySelectorAll('.word')
        if (!words.length) return

        const trigger = {
          trigger: block,
          start: 'top bottom-=20%',
          end: wordAnimationEnd,
          scrub: true,
        }

        gsap.fromTo(
          words,
          { opacity: baseOpacity, willChange: 'opacity' },
          {
            ease: 'none',
            opacity: 1,
            stagger: 0.05,
            scrollTrigger: trigger,
          },
        )

        if (enableBlur) {
          gsap.fromTo(
            words,
            { filter: `blur(${blurStrength}px)` },
            {
              ease: 'none',
              filter: 'blur(0px)',
              stagger: 0.05,
              scrollTrigger: { ...trigger },
            },
          )
        }
      })
    }, el)

    ScrollTrigger.refresh()

    return () => ctx.revert()
  }, [html, enableBlur, baseOpacity, blurStrength, wordAnimationEnd])

  const className = ['scroll-reveal', containerClassName].filter(Boolean).join(' ')

  return <section ref={containerRef} className={className} />
}
