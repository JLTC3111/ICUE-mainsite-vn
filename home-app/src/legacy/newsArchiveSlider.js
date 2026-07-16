import Swiper from 'swiper'
import { Autoplay, EffectCoverflow, Keyboard, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-coverflow'
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
  wrapEl: null,
  infoEl: null,
  grid: null,
  cards: [],
  mode: null,
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

function cardTitleText(card) {
  const h3 = card.querySelector('.card-info h3')
  if (!h3) return ''
  const clone = h3.cloneNode(true)
  clone.querySelectorAll('svg').forEach((el) => el.remove())
  return clone.textContent.trim()
}

function readLabel() {
  return cardsState.grid?.dataset?.readLabel || 'Read article →'
}

function buildRankBadge(index) {
  const rank = document.createElement('span')
  rank.className = 'news-coverflow-rank'
  rank.textContent = String(index + 1)
  rank.setAttribute('aria-hidden', 'true')
  return rank
}

function updateCoverflowInfo(swiper) {
  if (!cardsState.infoEl) return

  const index = typeof swiper.realIndex === 'number' ? swiper.realIndex : swiper.activeIndex
  const card = cardsState.cards[index]
  if (!card) return

  const dateEl = card.querySelector('.card-info .date')
  const locationEl = card.querySelector('.card-info .location')
  const infoTitle = cardsState.infoEl.querySelector('.news-coverflow-info__title')
  const infoMeta = cardsState.infoEl.querySelector('.news-coverflow-info__meta')
  const infoBtn = cardsState.infoEl.querySelector('.news-coverflow-info__btn')

  if (infoTitle) infoTitle.textContent = cardTitleText(card)

  if (infoMeta) {
    const parts = [dateEl?.textContent?.trim(), locationEl?.textContent?.trim()].filter(Boolean)
    infoMeta.textContent = parts.join('  ·  ')
  }

  if (infoBtn) {
    infoBtn.href = card.href || '#'
    infoBtn.textContent = readLabel()
  }
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

function enableMobileCardsSwiper() {
  if (cardsState.mode === 'mobile') return
  if (cardsState.mode === 'desktop') disableDesktopCoverflow()
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
    modules: [Pagination, Keyboard],
    slidesPerView: 1,
    spaceBetween: 20,
    speed: 280,
    resistanceRatio: 0.55,
    threshold: 8,
    grabCursor: true,
    watchOverflow: true,
    initialSlide: readInitialIndex(cardsState.cards.length),
    keyboard: {
      enabled: true,
      onlyInViewport: true,
      pageUpDown: false,
    },
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

  cardsState.mode = 'mobile'
}

function disableMobileCardsSwiper() {
  if (cardsState.mode !== 'mobile') return

  if (cardsState.swiper) {
    cardsState.swiper.destroy(true, true)
    cardsState.swiper = null
  }

  if (cardsState.grid && cardsState.cards.length) {
    cardsState.grid.classList.remove('news-cards-swiper-active')
    cardsState.grid.replaceChildren(...cardsState.cards)
  }

  cardsState.swiperEl = null
  cardsState.mode = null
}

function enableDesktopCoverflow() {
  if (cardsState.mode === 'desktop') return
  if (cardsState.mode === 'mobile') disableMobileCardsSwiper()
  if (cardsState.swiper || !cardsState.grid || !cardsState.cards.length) return

  const wrap = document.createElement('div')
  wrap.className = 'news-coverflow-wrap'

  const swiperEl = document.createElement('div')
  swiperEl.className = 'swiper news-coverflow-swiper'

  const wrapper = document.createElement('div')
  wrapper.className = 'swiper-wrapper'

  cardsState.cards.forEach((card, index) => {
    const slide = document.createElement('div')
    slide.className = 'swiper-slide'
    slide.appendChild(card)
    slide.appendChild(buildRankBadge(index))
    wrapper.appendChild(slide)
  })

  const pagination = document.createElement('div')
  pagination.className = 'swiper-pagination'

  swiperEl.appendChild(wrapper)
  swiperEl.appendChild(pagination)

  const info = document.createElement('div')
  info.className = 'news-coverflow-info'
  info.setAttribute('aria-live', 'polite')
  info.innerHTML = `
    <div class="news-coverflow-info__text">
      <h2 class="news-coverflow-info__title"></h2>
      <p class="news-coverflow-info__meta"></p>
    </div>
    <a class="news-coverflow-info__btn" href="#"></a>
  `

  wrap.appendChild(swiperEl)
  wrap.appendChild(info)

  cardsState.grid.replaceChildren(wrap)
  cardsState.grid.classList.add('news-coverflow-active')
  cardsState.wrapEl = wrap
  cardsState.swiperEl = swiperEl
  cardsState.infoEl = info

  const slideCount = cardsState.cards.length
  const initialIndex = readInitialIndex(slideCount)
  const useLoop = slideCount > 2

  cardsState.swiper = new Swiper(swiperEl, {
    modules: [EffectCoverflow, Pagination, Keyboard],
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: 'auto',
    speed: 520,
    loop: useLoop,
    loopAdditionalSlides: 3,
    watchSlidesProgress: true,
    initialSlide: useLoop ? 0 : initialIndex,
    keyboard: {
      enabled: true,
      onlyInViewport: true,
      pageUpDown: false,
    },
    coverflowEffect: {
      rotate: 42,
      stretch: -22,
      depth: 170,
      modifier: 1.08,
      slideShadows: false,
    },
    pagination: {
      el: pagination,
      clickable: true,
    },
    on: {
      init(swiper) {
        if (useLoop && initialIndex > 0) {
          swiper.slideToLoop(initialIndex, 0, false)
        }
        swiper.loopFix()
        updateCoverflowInfo(swiper)
      },
      slideChange(swiper) {
        const index = typeof swiper.realIndex === 'number' ? swiper.realIndex : swiper.activeIndex
        localStorage.setItem(STORAGE_KEY, String(index))
        updateCoverflowInfo(swiper)
      },
      slideChangeTransitionEnd(swiper) {
        swiper.loopFix()
      },
    },
  })

  cardsState.mode = 'desktop'
}

function disableDesktopCoverflow() {
  if (cardsState.mode !== 'desktop') return

  if (cardsState.swiper) {
    cardsState.swiper.destroy(true, true)
    cardsState.swiper = null
  }

  if (cardsState.grid && cardsState.cards.length) {
    cardsState.grid.classList.remove('news-coverflow-active')
    cardsState.grid.replaceChildren(...cardsState.cards)
  }

  cardsState.wrapEl = null
  cardsState.swiperEl = null
  cardsState.infoEl = null
  cardsState.mode = null
}

function syncCardsMode() {
  if (!cardsState.mq) return
  if (cardsState.mq.matches) enableMobileCardsSwiper()
  else enableDesktopCoverflow()
}

/**
 * Logo strip + article cards (mobile swiper / desktop coverflow) for legacy news.
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

  disableMobileCardsSwiper()
  disableDesktopCoverflow()

  cardsState.grid = null
  cardsState.cards = []
  cardsState.mq = null
  cardsState.onMqChange = null
}
