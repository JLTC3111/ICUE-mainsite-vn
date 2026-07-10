import Swiper from 'swiper'
import { Autoplay, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import './newsArchiveSlider.css'

const STORAGE_KEY = 'newsSliderIndex'
const MOBILE_QUERY = '(max-width: 1024px)'

const logoState = {
  swiper: null,
  generation: 0,
}

const cardsState = {
  swiper: null,
  swiperEl: null,
  grid: null,
  cards: [],
  mq: null,
  onMqChange: null,
  generation: 0,
}

function findLogoEl() {
  return (
    document.querySelector('.legacy-page #newsLogoSwiper') ||
    document.getElementById('newsLogoSwiper')
  )
}

function findGrid() {
  return (
    document.querySelector('.legacy-page main.grid') ||
    document.querySelector('main.grid')
  )
}

function readInitialIndex(cardCount) {
  const raw = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
  if (Number.isNaN(raw)) return 0
  return Math.max(0, Math.min(cardCount - 1, raw))
}

function initLogoSwiper(generation) {
  const el = findLogoEl()
  if (!el || generation !== logoState.generation) return

  if (logoState.swiper) {
    logoState.swiper.destroy(true, true)
    logoState.swiper = null
  }

  logoState.swiper = new Swiper(el, {
    modules: [Autoplay, Pagination],
    slidesPerView: 'auto',
    spaceBetween: 28,
    speed: 600,
    loop: true,
    autoHeight: true,
    grabCursor: true,
    watchOverflow: true,
    autoplay: {
      delay: 2200,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    pagination: {
      el: el.querySelector('.swiper-pagination'),
      clickable: true,
    },
    breakpoints: {
      0: { spaceBetween: 16 },
      551: { spaceBetween: 22 },
      1025: { spaceBetween: 36 },
    },
  })
}

function enableCardsSwiper() {
  if (cardsState.swiper || !cardsState.grid || !cardsState.cards.length) return

  const swiperEl = document.createElement('div')
  swiperEl.className = 'swiper news-cards-swiper'

  const wrapper = document.createElement('div')
  wrapper.className = 'swiper-wrapper'

  cardsState.cards.forEach((card) => {
    const slide = document.createElement('div')
    slide.className = 'swiper-slide'
    slide.appendChild(card)
    wrapper.appendChild(slide)
  })

  const pagination = document.createElement('div')
  pagination.className = 'swiper-pagination'

  swiperEl.appendChild(wrapper)
  swiperEl.appendChild(pagination)

  cardsState.grid.replaceChildren(swiperEl)
  cardsState.grid.classList.add('news-cards-swiper-active')
  cardsState.swiperEl = swiperEl

  cardsState.swiper = new Swiper(swiperEl, {
    modules: [Pagination],
    slidesPerView: 1,
    spaceBetween: 20,
    speed: 280,
    resistanceRatio: 0.55,
    threshold: 8,
    grabCursor: true,
    watchOverflow: true,
    initialSlide: readInitialIndex(cardsState.cards.length),
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

function disableCardsSwiper() {
  if (!cardsState.grid) return

  if (cardsState.swiper) {
    cardsState.swiper.destroy(true, true)
    cardsState.swiper = null
  }

  cardsState.grid.classList.remove('news-cards-swiper-active')
  cardsState.grid.replaceChildren(...cardsState.cards)
  cardsState.swiperEl = null
}

function syncCardsMode() {
  if (!cardsState.mq) return
  if (cardsState.mq.matches) enableCardsSwiper()
  else disableCardsSwiper()
}

/**
 * Logo strip + mobile article-card Swiper for the legacy news archive page.
 */
export async function initNewsArchiveSlider() {
  destroyNewsArchiveSlider()
  const logoGen = ++logoState.generation
  const cardsGen = ++cardsState.generation

  initLogoSwiper(logoGen)
  if (logoGen !== logoState.generation) return

  const grid = findGrid()
  if (!grid || cardsGen !== cardsState.generation) return

  const cards = Array.from(grid.querySelectorAll('a.card.image-card'))
  if (!cards.length) return

  cardsState.grid = grid
  cardsState.cards = cards
  cardsState.mq = window.matchMedia(MOBILE_QUERY)
  cardsState.onMqChange = () => {
    if (cardsGen === cardsState.generation) syncCardsMode()
  }

  if (cardsGen !== cardsState.generation) return

  syncCardsMode()
  cardsState.mq.addEventListener('change', cardsState.onMqChange)
}

export function destroyNewsArchiveSlider() {
  logoState.generation += 1
  cardsState.generation += 1

  if (logoState.swiper) {
    logoState.swiper.destroy(true, true)
    logoState.swiper = null
  }

  if (cardsState.mq && cardsState.onMqChange) {
    cardsState.mq.removeEventListener('change', cardsState.onMqChange)
  }

  if (cardsState.swiper) {
    cardsState.swiper.destroy(true, true)
  }

  if (cardsState.grid && cardsState.cards.length) {
    cardsState.grid.classList.remove('news-cards-swiper-active')
    const needsRestore = cardsState.cards.some((card) => card.parentElement !== cardsState.grid)
    if (needsRestore) {
      cardsState.grid.replaceChildren(...cardsState.cards)
    }
  }

  cardsState.swiper = null
  cardsState.swiperEl = null
  cardsState.grid = null
  cardsState.cards = []
  cardsState.mq = null
  cardsState.onMqChange = null
}
