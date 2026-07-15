/**
 * Lightweight desktop-only entrance for past-projects cards.
 * Avoids the AOS library (flip/blur) — opacity + translateY only,
 * IntersectionObserver, and skips on mobile / reduced-motion / low-power.
 */

const DESKTOP_QUERY = '(min-width: 1025px)'
const MOTION_OK_QUERY = '(prefers-reduced-motion: no-preference)'

const state = {
  cards: [],
  observer: null,
  desktopMq: null,
  motionMq: null,
  onChange: null,
  generation: 0,
}

function prefersLightweight() {
  try {
    if (navigator.connection?.saveData) return true
    // Very low core counts struggle with many simultaneous transitions (esp. Windows iGPU).
    if ((navigator.hardwareConcurrency || 4) <= 2) return true
    // Coarse pointer alone is not enough — tablets at desktop widths still get anim.
  } catch {
    /* ignore */
  }
  return false
}

function shouldAnimate() {
  return (
    !!state.desktopMq?.matches &&
    !!state.motionMq?.matches &&
    !prefersLightweight()
  )
}

function revealAll() {
  state.cards.forEach((card) => card.classList.add('aos-animate'))
}

function hideForAnimation() {
  state.cards.forEach((card) => card.classList.remove('aos-animate'))
}

function disconnectObserver() {
  if (state.observer) {
    state.observer.disconnect()
    state.observer = null
  }
}

function startObserver(generation) {
  disconnectObserver()
  if (!state.cards.length || generation !== state.generation) return

  hideForAnimation()

  state.observer = new IntersectionObserver(
    (entries) => {
      if (generation !== state.generation) return
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target
        el.classList.add('aos-animate')
        state.observer?.unobserve(el)
      }
    },
    {
      root: null,
      // Start a bit before the card is fully on-screen
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12,
    },
  )

  // Stagger via CSS custom property so we don't thrash timers
  state.cards.forEach((card, index) => {
    card.style.setProperty('--pp-aos-delay', `${Math.min(index * 45, 270)}ms`)
    state.observer.observe(card)
  })
}

function syncMode() {
  const generation = state.generation
  if (!shouldAnimate()) {
    disconnectObserver()
    revealAll()
    return
  }
  startObserver(generation)
}

/**
 * Call after past-projects HTML (and optional Swiper) is in the DOM.
 */
export function initPastProjectsAos() {
  destroyPastProjectsAos()
  const generation = ++state.generation

  const root =
    document.querySelector('.legacy-page main.grid') ||
    document.querySelector('main.grid')
  if (!root) return

  const cards = Array.from(root.querySelectorAll('a.card.image-card'))
  if (!cards.length) return

  state.cards = cards
  state.desktopMq = window.matchMedia(DESKTOP_QUERY)
  state.motionMq = window.matchMedia(MOTION_OK_QUERY)
  state.onChange = () => {
    if (generation === state.generation) syncMode()
  }

  syncMode()
  state.desktopMq.addEventListener('change', state.onChange)
  state.motionMq.addEventListener('change', state.onChange)
}

export function destroyPastProjectsAos() {
  state.generation += 1
  disconnectObserver()

  if (state.desktopMq && state.onChange) {
    state.desktopMq.removeEventListener('change', state.onChange)
  }
  if (state.motionMq && state.onChange) {
    state.motionMq.removeEventListener('change', state.onChange)
  }

  // Leave cards visible if navigating away mid-animation
  state.cards.forEach((card) => {
    card.classList.add('aos-animate')
    card.style.removeProperty('--pp-aos-delay')
  })

  state.cards = []
  state.desktopMq = null
  state.motionMq = null
  state.onChange = null
}
