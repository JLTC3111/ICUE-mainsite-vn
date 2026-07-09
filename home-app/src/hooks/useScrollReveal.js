import { useEffect } from 'react'

const CARD_OPTIONS = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }

function observeElements(selector, inClass, outClass, options) {
  const elements = document.querySelectorAll(selector)
  if (!elements.length) return () => {}

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle(inClass, entry.isIntersecting)
      entry.target.classList.toggle(outClass, !entry.isIntersecting)
    })
  }, options)

  elements.forEach((el) => observer.observe(el))
  return () => observer.disconnect()
}

export function useHomeScrollReveal() {
  useEffect(() => {
    const cleanCards = observeElements(
      '.home-card',
      'animate-in-card',
      'animate-out-card',
      CARD_OPTIONS,
    )

    return () => {
      cleanCards()
    }
  }, [])
}
