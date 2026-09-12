import { useEffect } from 'react'
import { readElementBackdropRgb } from '@icue/contact-sidebar/backgroundSampling.js'
import { pickBarColor } from '@icue/contact-sidebar/useMusicBarColor.js'

const THROTTLE_MS = 120
const NAV_SELECTORS = ['.swiper-button-prev', '.swiper-button-next']

function galleryIsOnScreen(root) {
  const rect = root.getBoundingClientRect()
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0
}

function colourNavButtons(root) {
  if (document.hidden || !galleryIsOnScreen(root)) return

  const activeImg = root.querySelector('.swiper-slide-active img')
    || root.querySelector('.swiper-slide-duplicate-active img')
    || root.querySelector('img')
  const imgRect = activeImg instanceof HTMLElement ? activeImg.getBoundingClientRect() : null

  NAV_SELECTORS.forEach((selector) => {
    const button = root.querySelector(selector)
    if (!(button instanceof HTMLElement)) return
    button.style.left = ''
    button.style.right = ''
    button.style.top = ''
    button.style.marginTop = ''
    button.style.transform = ''

    const rect = button.getBoundingClientRect()
    const x = rect.left + rect.width * 0.5
    const y = rect.top + rect.height * 0.5
    const overPhoto = Boolean(
      imgRect
      && x >= imgRect.left
      && x <= imgRect.right
      && y >= imgRect.top
      && y <= imgRect.bottom,
    )

    if (!overPhoto) {
      // Sit in the themed gutter: let `--pp-swiper-nav` follow light/dark.
      button.style.color = ''
      button.style.removeProperty('--swiper-navigation-color')
      return
    }

    const color = pickBarColor(readElementBackdropRgb(button))
    button.style.color = color
    button.style.setProperty('--swiper-navigation-color', color)
  })
}

/**
 * Recolour Swiper prev/next from the pixels under each arrow.
 * `paletteKey` should change when the page theme class updates so we resample
 * after `--pp-gallery-bg` (and friends) have actually been applied.
 */
export function useSwiperNavContrast(swiper, paletteKey) {
  useEffect(() => {
    const root = swiper?.el
    if (!root) return undefined

    let timer = null
    let lastAt = 0
    let paintFrame = 0

    const run = () => {
      lastAt = performance.now()
      colourNavButtons(root)
    }

    const schedule = () => {
      if (document.hidden) return
      const elapsed = performance.now() - lastAt
      if (elapsed >= THROTTLE_MS) {
        if (timer !== null) {
          window.clearTimeout(timer)
          timer = null
        }
        run()
        return
      }
      if (timer !== null) return
      timer = window.setTimeout(() => {
        timer = null
        run()
      }, THROTTLE_MS - elapsed)
    }

    const scheduleAfterPaint = () => {
      if (paintFrame) cancelAnimationFrame(paintFrame)
      paintFrame = requestAnimationFrame(() => {
        paintFrame = requestAnimationFrame(() => {
          paintFrame = 0
          lastAt = 0
          run()
        })
      })
    }

    run()

    swiper.on('slideChange', schedule)
    swiper.on('slideChangeTransitionEnd', schedule)
    swiper.on('imagesReady', schedule)

    const onVisibility = () => {
      if (document.hidden) {
        if (timer !== null) window.clearTimeout(timer)
        timer = null
      } else {
        scheduleAfterPaint()
      }
    }

    window.addEventListener('resize', schedule)
    window.addEventListener('icue:aboutUsTheme', scheduleAfterPaint)
    window.addEventListener('icue:aboutUsThemeManagerReady', scheduleAfterPaint)
    document.addEventListener('visibilitychange', onVisibility)

    const images = root.querySelectorAll('img')
    images.forEach((img) => img.addEventListener('load', schedule))

    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) schedule()
    }, { threshold: 0.2 })
    io.observe(root)

    const themedPage = root.closest(
      '.past-projects-page, .news-archive-page, .notable-awards-page, .about-us-page',
    )
    const classObserver = themedPage
      ? new MutationObserver(scheduleAfterPaint)
      : null
    classObserver?.observe(themedPage, { attributes: true, attributeFilter: ['class'] })

    const themeObserver = new MutationObserver(scheduleAfterPaint)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-about-theme'],
    })

    return () => {
      if (timer !== null) window.clearTimeout(timer)
      if (paintFrame) cancelAnimationFrame(paintFrame)
      swiper.off('slideChange', schedule)
      swiper.off('slideChangeTransitionEnd', schedule)
      swiper.off('imagesReady', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('icue:aboutUsTheme', scheduleAfterPaint)
      window.removeEventListener('icue:aboutUsThemeManagerReady', scheduleAfterPaint)
      document.removeEventListener('visibilitychange', onVisibility)
      images.forEach((img) => img.removeEventListener('load', schedule))
      io.disconnect()
      classObserver?.disconnect()
      themeObserver.disconnect()
    }
  }, [swiper, paletteKey])
}
