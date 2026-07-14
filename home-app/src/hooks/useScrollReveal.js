import { useEffect } from 'react'

function getCardObserverOptions() {
  const isMobile = window.matchMedia('(max-width: 768px)').matches
  return isMobile
    ? { threshold: 0, rootMargin: '0px 0px 10% 0px' }
    : { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
}

function revealCard(el) {
  el.classList.add('animate-in-card')
  el.classList.remove('animate-out-card')
}

function isRoughlyInViewport(el) {
  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight || document.documentElement.clientHeight
  return rect.top < vh * 0.92 && rect.bottom > vh * 0.08
}

function observeCards() {
  if (typeof window === 'undefined') return () => {}

  const cards = document.querySelectorAll('.home-card')
  if (!cards.length) return () => {}

  const useOnce = window.matchMedia('(max-width: 768px)').matches
    || window.matchMedia('(pointer: coarse)').matches
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!('IntersectionObserver' in window)) {
    cards.forEach(revealCard)
    return () => {}
  }

  const options = getCardObserverOptions()
  const observed = new WeakSet()

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        revealCard(entry.target)
        if (useOnce) observer.unobserve(entry.target)
        return
      }

      if (!useOnce) {
        entry.target.classList.remove('animate-in-card')
        entry.target.classList.add('animate-out-card')
      }
    })
  }, options)

  cards.forEach((el) => {
    if (observed.has(el)) return
    observed.add(el)
    observer.observe(el)
    if (isRoughlyInViewport(el)) revealCard(el)
  })

  return () => observer.disconnect()
}

export function useHomeScrollReveal() {
  useEffect(() => {
    let disconnectObserver = observeCards()

    const root = document.querySelector('.home-page')
    const mutationObserver = root
      ? new MutationObserver(() => {
          disconnectObserver()
          disconnectObserver = observeCards()
        })
      : null

    mutationObserver?.observe(root, { childList: true, subtree: true })

    const fallbackTimer = window.setTimeout(() => {
      document.querySelectorAll('.home-card:not(.animate-in-card)').forEach(revealCard)
    }, 2500)

    return () => {
      mutationObserver?.disconnect()
      disconnectObserver()
      window.clearTimeout(fallbackTimer)
    }
  }, [])
}
