let cleanupCurrent = null

function revealDeferredImage(img) {
  if (!(img instanceof HTMLImageElement)) return
  const src = img.dataset.src
  if (!src) return
  img.src = src
  delete img.dataset.src
}

export function destroyOurWorkCarousel() {
  cleanupCurrent?.()
  cleanupCurrent = null
}

export function initOurWorkCarousel() {
  destroyOurWorkCarousel()

  const carousel = document.querySelector('.work-carousel')
  const nextButton = document.getElementById('work-next')
  const prevButton = document.getElementById('work-prev')
  const slider = carousel?.querySelector('.work-list')
  const thumbnails = carousel?.querySelector('.work-thumbnail')
  const timeBar = carousel?.querySelector('.work-time')

  if (!carousel || !nextButton || !prevButton || !slider || !thumbnails || !timeBar) {
    console.warn('Our Work carousel initialization skipped: incomplete markup.')
    return
  }

  let autoAdvanceTimeout = null
  let transitionTimeout = null
  let countdownTimeout = null
  let idleId = null
  let idleTimer = null

  const deferredImages = () => carousel.querySelectorAll('img[data-src]')
  const hydrateDeferredImages = () => deferredImages().forEach(revealDeferredImage)

  const scheduleDeferredImages = () => {
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(hydrateDeferredImages, { timeout: 700 })
    } else {
      idleTimer = window.setTimeout(hydrateDeferredImages, 160)
    }
  }

  const resetAutoAdvance = () => {
    if (autoAdvanceTimeout != null) window.clearTimeout(autoAdvanceTimeout)
    autoAdvanceTimeout = window.setTimeout(() => nextButton.click(), 11000)
  }

  const beginTransition = (direction) => {
    carousel.classList.remove('work-next', 'work-prev', 'work-jump')
    carousel.classList.add(direction, 'work-transitioning')

    if (transitionTimeout != null) window.clearTimeout(transitionTimeout)
    transitionTimeout = window.setTimeout(() => {
      carousel.classList.remove('work-transitioning')
    }, 650)

    if (countdownTimeout != null) window.clearTimeout(countdownTimeout)
    countdownTimeout = window.setTimeout(() => {
      carousel.classList.remove('work-next', 'work-prev', 'work-jump')
    }, 10000)
  }

  const showSlide = (direction) => {
    hydrateDeferredImages()
    const items = slider.querySelectorAll('.work-item')
    const thumbs = thumbnails.querySelectorAll('.work-item')
    if (!items.length || !thumbs.length) return

    if (direction === 'work-next') {
      slider.appendChild(items[0])
      thumbnails.appendChild(thumbs[0])
    } else {
      slider.prepend(items[items.length - 1])
      thumbnails.prepend(thumbs[thumbs.length - 1])
    }

    beginTransition(direction)
    resetAutoAdvance()
  }

  const goToSlide = (targetIndex) => {
    hydrateDeferredImages()
    const currentSlide = slider.querySelector('.work-item')
    const currentIndex = Number.parseInt(currentSlide?.dataset.index ?? '', 10)
    const totalItems = slider.querySelectorAll('.work-item').length
    if (!Number.isFinite(currentIndex) || !totalItems || targetIndex === currentIndex) return

    let steps = targetIndex - currentIndex
    if (steps < 0) steps += totalItems

    for (let index = 0; index < steps; index += 1) {
      slider.appendChild(slider.firstElementChild)
      thumbnails.appendChild(thumbnails.firstElementChild)
    }

    beginTransition('work-jump')
    resetAutoAdvance()
  }

  const thumbItems = [...thumbnails.querySelectorAll('.work-item')]
  thumbItems.forEach((thumb) => {
    thumb.onclick = () => goToSlide(Number.parseInt(thumb.dataset.index ?? '', 10))
  })
  nextButton.onclick = () => showSlide('work-next')
  prevButton.onclick = () => showSlide('work-prev')

  carousel.dataset.loaded = 'true'
  scheduleDeferredImages()
  resetAutoAdvance()

  cleanupCurrent = () => {
    if (autoAdvanceTimeout != null) window.clearTimeout(autoAdvanceTimeout)
    if (transitionTimeout != null) window.clearTimeout(transitionTimeout)
    if (countdownTimeout != null) window.clearTimeout(countdownTimeout)
    if (idleId != null) window.cancelIdleCallback(idleId)
    if (idleTimer != null) window.clearTimeout(idleTimer)
    nextButton.onclick = null
    prevButton.onclick = null
    thumbItems.forEach((thumb) => {
      thumb.onclick = null
    })
    carousel.classList.remove('work-next', 'work-prev', 'work-jump', 'work-transitioning')
    delete carousel.dataset.loaded
  }
}
