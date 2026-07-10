import Swiper from 'swiper'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import './pastProjectsSlider.css'

const STORAGE_KEY = 'projectsSliderIndex'
const MOBILE_QUERY = '(max-width: 1024px)'

const state = {
  swiper: null,
  swiperEl: null,
  grid: null,
  cards: [],
  mq: null,
  onMqChange: null,
  generation: 0,
}

function readInitialIndex(cardCount) {
  const raw = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
  if (Number.isNaN(raw)) return 0
  return Math.max(0, Math.min(cardCount - 1, raw))
}

function findGrid() {
  return (
    document.querySelector('.legacy-page main.grid') ||
    document.querySelector('main.grid')
  )
}

function enableSwiper() {
  if (state.swiper || !state.grid || !state.cards.length) return

  const swiperEl = document.createElement('div')
  swiperEl.className = 'swiper past-projects-swiper'

  const wrapper = document.createElement('div')
  wrapper.className = 'swiper-wrapper'

  state.cards.forEach((card) => {
    const slide = document.createElement('div')
    slide.className = 'swiper-slide'
    slide.appendChild(card)
    wrapper.appendChild(slide)
  })

  const pagination = document.createElement('div')
  pagination.className = 'swiper-pagination'

  swiperEl.appendChild(wrapper)
  swiperEl.appendChild(pagination)

  state.grid.replaceChildren(swiperEl)
  state.grid.classList.add('past-projects-swiper-active')
  state.swiperEl = swiperEl

  state.swiper = new Swiper(swiperEl, {
    modules: [Pagination],
    slidesPerView: 1,
    spaceBetween: 20,
    speed: 280,
    autoHeight: true,
    observer: true,
    observeParents: true,
    resistanceRatio: 0.55,
    threshold: 8,
    grabCursor: true,
    watchOverflow: true,
    initialSlide: readInitialIndex(state.cards.length),
    pagination: {
      el: pagination,
      clickable: true,
    },
    on: {
      slideChange(swiper) {
        localStorage.setItem(STORAGE_KEY, String(swiper.activeIndex))
      },
    },
  })
}

function disableSwiper() {
  if (!state.grid) return

  if (state.swiper) {
    state.swiper.destroy(true, true)
    state.swiper = null
  }

  state.grid.classList.remove('past-projects-swiper-active')
  state.grid.replaceChildren(...state.cards)
  state.swiperEl = null
}

function syncMode() {
  if (!state.mq) return
  if (state.mq.matches) enableSwiper()
  else disableSwiper()
}

/**
 * Replace the legacy custom touch slider with Swiper on mobile/tablet.
 * Desktop keeps the original CSS grid.
 */
export async function initPastProjectsSlider() {
  destroyPastProjectsSlider()
  const generation = ++state.generation

  const grid = findGrid()
  if (!grid || generation !== state.generation) return

  const cards = Array.from(grid.querySelectorAll('a.card.image-card'))
  if (!cards.length) return

  state.grid = grid
  state.cards = cards
  state.mq = window.matchMedia(MOBILE_QUERY)
  state.onMqChange = () => {
    if (generation === state.generation) syncMode()
  }

  if (generation !== state.generation) return

  syncMode()
  state.mq.addEventListener('change', state.onMqChange)
}

export function destroyPastProjectsSlider() {
  state.generation += 1

  if (state.mq && state.onMqChange) {
    state.mq.removeEventListener('change', state.onMqChange)
  }

  if (state.swiper) {
    state.swiper.destroy(true, true)
  }

  if (state.grid && state.cards.length) {
    state.grid.classList.remove('past-projects-swiper-active')
    // Only restore cards if they are not already direct children of the grid
    // (e.g. after destroy mid-swipe mode).
    const needsRestore = state.cards.some((card) => card.parentElement !== state.grid)
    if (needsRestore) {
      state.grid.replaceChildren(...state.cards)
    }
  }

  state.swiper = null
  state.swiperEl = null
  state.grid = null
  state.cards = []
  state.mq = null
  state.onMqChange = null
}
