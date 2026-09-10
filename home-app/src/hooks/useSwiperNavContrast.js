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

  NAV_SELECTORS.forEach((selector) => {
    const button = root.querySelector(selector)
    if (!(button instanceof HTMLElement)) return
    const color = pickBarColor(readElementBackdropRgb(button))
    button.style.color = color
    button.style.setProperty('--swiper-navigation-color', color)
  })
}

/**
 * Recolour Swiper prev/next from the photograph under each arrow, using the
 * same white/navy contrast picker as the contact-sidebar music bars.
 */
export function useSwiperNavContrast(swiper) {
  useEffect(() => {
    const root = swiper?.el
    if (!root) return undefined

    let timer = null
    let lastAt = 0

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

    run()

    swiper.on('slideChange', schedule)
    swiper.on('slideChangeTransitionEnd', schedule)
    swiper.on('imagesReady', schedule)

    const onVisibility = () => {
      if (document.hidden) {
        if (timer !== null) window.clearTimeout(timer)
        timer = null
      } else {
        schedule()
      }
    }

    window.addEventListener('resize', schedule)
    window.addEventListener('icue:aboutUsTheme', schedule)
    document.addEventListener('visibilitychange', onVisibility)

    const images = root.querySelectorAll('img')
    images.forEach((img) => img.addEventListener('load', schedule))

    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) schedule()
    }, { threshold: 0.2 })
    io.observe(root)

    return () => {
      if (timer !== null) window.clearTimeout(timer)
      swiper.off('slideChange', schedule)
      swiper.off('slideChangeTransitionEnd', schedule)
      swiper.off('imagesReady', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('icue:aboutUsTheme', schedule)
      document.removeEventListener('visibilitychange', onVisibility)
      images.forEach((img) => img.removeEventListener('load', schedule))
      io.disconnect()
    }
  }, [swiper])
}
