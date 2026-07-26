const SLIDE_INTERVAL = 45_000
const STORAGE_KEY = 'aboutUs_bg_video_enabled'

const MESSAGES = [
  'Viện Nghiên cứu Kinh tế Xây dựng và Đô thị (sau đây gọi tắt là viện) <strong class="highlight-text-phrase"> được thành lập theo Quyết định số 29/QĐ/THXDVN ngày 16/4/2013 của Đoàn Chủ tịch Tổng hội Xây dựng Việt Nam</strong>',
  'Hơn 10 năm kinh nghiệm, <strong class="highlight-text-phrase">hơn 20 cán bộ, chuyên viên trẻ, xuất sắc và nhiều chuyên gia đầu nghành </strong>trong lĩnh vực quy hoạch, phát triển đô thị, kinh tế đô thị - chúng tôi đã thiết kế những thành phố thông minh - xanh thân thiện môi trường - cân bằng giữa chức năng - khả năng phục hồi và nhu cầu cộng đồng',
  'Nghiên cứu khoa học, nghiên cứu ứng dụng và phát triển công nghệ trong lĩnh vực xây dựng, tư vấn, lập quy hoạch phát triển đô thị, kinh tế đô thị, kinh tế xây dựng và bảo vệ môi trường. <strong class="highlight-text-phrase"></strong>',
  'Chuyển giao công nghệ khoa học, chuyển đổi xanh. Thực hiện các dịch vụ thông tin, tổ chức hội nghị, hội thảo trong nước và quốc tế. Hợp tác và liên kết với các tổ chức trong nước và quốc tế về các lĩnh vực quy hoạch, phát triển đô thị và bảo vệ môi trường <strong class="highlight-text-phrase"> hiệu quả </strong>, khả năng kết nối — xây dựng các thành phố <strong class="highlight-text-phrase"> sẵn sàng cho tương lai </strong>.',
  'Lãnh đạo sáng kiến ​​quy hoạch toàn thành phố Đà Nẵng cho thành phố loại 1 và loại 2 — một dự án chuyển đổi phản ánh sự tận tâm của chúng tôi đối với <strong class="highlight-text-phrase"> chiến lược toàn cảnh </strong> và <strong class="highlight-text-phrase"> kết quả thực tế. </strong>',
  'Nghiên cứu lập đề án, dự án quy hoạch, quy hoạch đô thị nông thôn; Chương trình phát triển nhà ở; Kinh tế đô thị, Môi trường đô thị; Đầu tư xây dựng; Thông tin thị trường bất động sản; Công tác đấu thầu... <strong class="highlight-text-phrase"></strong><strong class="highlight-text-phrase"></strong>',
]

let cleanupCurrent = null

function readEnabledPreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw == null || raw === '1' || raw === 'true' || raw === 'on'
  } catch {
    return true
  }
}

function writeEnabledPreference(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // Storage can be unavailable in privacy modes.
  }
}

function createVideoManager() {
  let enabled = readEnabledPreference()
  let mediaQuery = null
  let onViewportChange = null
  let onVisibilityChange = null
  let idleId = null
  let startTimer = null

  const getVideo = () =>
    document.querySelector('.legacy-page .about-container video.video-bg')

  const canPlay = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    const connection =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection
    return !(
      connection?.saveData ||
      /(^|-)2g$/i.test(connection?.effectiveType || '')
    )
  }

  const shouldKeepStatic = () => !enabled || !canPlay()

  const syncRootState = () => {
    const video = getVideo()
    const keepStatic = shouldKeepStatic()
    if (keepStatic) {
      document.documentElement.setAttribute('data-aboutus-bg-video', 'off')
    } else {
      document.documentElement.removeAttribute('data-aboutus-bg-video')
    }
    if (video) video.style.display = keepStatic ? 'none' : ''
  }

  const getChosenSource = (video) => {
    const sources = [...(video?.querySelectorAll('source') || [])]
    const desktop = sources.find((source) => source.hasAttribute('media'))?.src
    const mobile = sources.find((source) => !source.hasAttribute('media'))?.src
    return window.matchMedia('(max-width: 767px)').matches
      ? mobile || desktop
      : desktop || mobile
  }

  const stopVideo = () => {
    const video = getVideo()
    if (!video) return
    video.pause()
    video.preload = 'none'
    video.removeAttribute('src')
    video.removeAttribute('data-active-src')
    video.load()
  }

  const startVideo = () => {
    const video = getVideo()
    if (!video || shouldKeepStatic()) return

    const src = getChosenSource(video)
    if (!src) return

    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.setAttribute('muted', '')
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')

    if (video.dataset.activeSrc !== src) {
      video.src = src
      video.dataset.activeSrc = src
      video.load()
    }

    void video.play().catch(() => {
      // Keep the static background when autoplay is blocked.
    })
  }

  const scheduleStart = () => {
    if (shouldKeepStatic()) return
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(startVideo, { timeout: 500 })
    } else {
      startTimer = window.setTimeout(startVideo, 100)
    }
  }

  const bindToggleUI = () => {
    const toggles = [
      document.getElementById('aboutUsVideoToggleDesktop'),
      document.getElementById('aboutUsVideoToggleMobile'),
    ].filter(Boolean)
    const playable = canPlay()
    toggles.forEach((toggle) => {
      toggle.checked = enabled
      toggle.disabled = !playable
    })
    syncRootState()
  }

  const destroy = () => {
    if (idleId != null) window.cancelIdleCallback(idleId)
    if (startTimer != null) window.clearTimeout(startTimer)
    idleId = null
    startTimer = null

    if (mediaQuery && onViewportChange) {
      mediaQuery.removeEventListener('change', onViewportChange)
    }
    if (onVisibilityChange) {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    mediaQuery = null
    onViewportChange = null
    onVisibilityChange = null
    stopVideo()
  }

  const init = () => {
    destroy()
    bindToggleUI()
    syncRootState()
    scheduleStart()

    mediaQuery = window.matchMedia('(max-width: 767px)')
    onViewportChange = () => {
      stopVideo()
      bindToggleUI()
      scheduleStart()
    }
    mediaQuery.addEventListener('change', onViewportChange)

    onVisibilityChange = () => {
      if (document.hidden) getVideo()?.pause()
      else scheduleStart()
    }
    document.addEventListener('visibilitychange', onVisibilityChange, {
      passive: true,
    })
  }

  const setEnabled = (nextEnabled) => {
    enabled = Boolean(nextEnabled)
    writeEnabledPreference(enabled)
    syncRootState()
    if (enabled) scheduleStart()
    else stopVideo()
    bindToggleUI()
    window.dispatchEvent(
      new CustomEvent('icue:aboutUsVideoEnabled', {
        detail: { enabled },
      }),
    )
  }

  return {
    init,
    destroy,
    bindToggleUI,
    setEnabled,
    isEnabled: () => enabled,
    canToggleVideos: canPlay,
  }
}

function buildTypingOperations(target, html) {
  const template = document.createElement('template')
  template.innerHTML = html
  const operations = []

  const cloneInto = (source, parent) => {
    if (source.nodeType === Node.TEXT_NODE) {
      const text = document.createTextNode('')
      parent.appendChild(text)
      for (const character of source.textContent || '') {
        operations.push(() => {
          text.data += character
        })
      }
      return
    }

    if (source.nodeType !== Node.ELEMENT_NODE) return
    const clone = source.cloneNode(false)
    parent.appendChild(clone)
    source.childNodes.forEach((child) => cloneInto(child, clone))
  }

  target.replaceChildren()
  template.content.childNodes.forEach((node) => cloneInto(node, target))
  return operations
}

function initTextSlider(signal, registerTimeout) {
  const slider = document.getElementById('homeTextSlider')
  const text = document.querySelector('#homeSliderText .highlight-text')
  const dots = [...document.querySelectorAll('#sliderDots .dot')]
  if (!slider || !text || !dots.length) return () => {}

  let index = 0
  let intervalId = null
  let typingGeneration = 0
  let typing = false

  const syncDots = () => {
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('active', dotIndex === index)
      dot.style.animation = 'none'
      void dot.offsetWidth
      if (dotIndex === index) {
        dot.style.animation = `slide-progress ${SLIDE_INTERVAL / 1000}s linear forwards`
      }
    })
  }

  const showFullMessage = () => {
    typingGeneration += 1
    typing = false
    text.innerHTML = MESSAGES[index]
  }

  const render = (nextIndex) => {
    index = (nextIndex + MESSAGES.length) % MESSAGES.length
    typingGeneration += 1
    const generation = typingGeneration
    typing = true
    syncDots()

    const operations = buildTypingOperations(text, MESSAGES[index])
    let operationIndex = 0

    const typeNext = () => {
      if (generation !== typingGeneration || signal.aborted) return
      const operation = operations[operationIndex]
      if (!operation) {
        typing = false
        return
      }
      operation()
      operationIndex += 1
      registerTimeout(typeNext, /[.,!?]/.test(text.textContent?.slice(-1)) ? 70 : 18)
    }

    const gsap = window.gsap
    if (gsap) {
      gsap.killTweensOf(text)
      gsap.fromTo(
        text,
        { opacity: 0, scale: 0.97, y: 8 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.2,
          ease: 'power2.out',
          onComplete: typeNext,
        },
      )
    } else {
      typeNext()
    }
  }

  const restart = () => {
    if (intervalId != null) window.clearInterval(intervalId)
    intervalId = window.setInterval(() => render(index + 1), SLIDE_INTERVAL)
  }

  dots.forEach((dot, dotIndex) => {
    dot.addEventListener(
      'click',
      () => {
        render(dotIndex)
        restart()
      },
      { signal },
    )
  })

  slider.addEventListener(
    'mouseenter',
    () => {
      if (intervalId != null) window.clearInterval(intervalId)
    },
    { signal },
  )
  slider.addEventListener('mouseleave', restart, { signal })
  slider.addEventListener(
    'click',
    (event) => {
      if (event.target.closest('.dot')) return
      if (typing) {
        showFullMessage()
        return
      }
      const rect = slider.getBoundingClientRect()
      render(index + (event.clientX - rect.left < rect.width / 2 ? -1 : 1))
      restart()
    },
    { signal },
  )

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }
      if (event.key === 'ArrowLeft') render(index - 1)
      else if (event.key === 'ArrowRight') render(index + 1)
      else return
      restart()
    },
    { signal },
  )

  render(0)
  restart()

  return () => {
    typingGeneration += 1
    if (intervalId != null) window.clearInterval(intervalId)
    window.gsap?.killTweensOf(text)
  }
}

function createBalloons() {
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeead', '#d4a5a5', '#9b5de5']
  for (let index = 0; index < 15; index += 1) {
    const balloon = document.createElement('div')
    balloon.className = 'balloon about-us-balloon'
    balloon.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
    balloon.style.left = `${Math.random() * 80 + 10}%`
    balloon.style.animationDelay = `${index * 0.2}s`
    document.body.appendChild(balloon)
    balloon.addEventListener('animationend', () => balloon.remove(), { once: true })
  }
}

export function destroyAboutUsPage() {
  cleanupCurrent?.()
  cleanupCurrent = null
}

export function initAboutUsPage() {
  destroyAboutUsPage()

  const abortController = new AbortController()
  const timeoutIds = new Set()
  const registerTimeout = (callback, delay) => {
    const id = window.setTimeout(() => {
      timeoutIds.delete(id)
      callback()
    }, delay)
    timeoutIds.add(id)
  }

  const videoManager = createVideoManager()
  window.AboutUsBackgroundVideoManager = videoManager
  const cleanupSlider = initTextSlider(abortController.signal, registerTimeout)

  const balloonButton = document.getElementById('balloonButton')
  balloonButton?.addEventListener('click', createBalloons, {
    signal: abortController.signal,
  })

  videoManager.init()

  cleanupCurrent = () => {
    abortController.abort()
    timeoutIds.forEach((id) => window.clearTimeout(id))
    timeoutIds.clear()
    cleanupSlider()
    videoManager.destroy()
    document.documentElement.removeAttribute('data-aboutus-bg-video')
    document.querySelectorAll('.about-us-balloon').forEach((balloon) => balloon.remove())
    if (window.AboutUsBackgroundVideoManager === videoManager) {
      delete window.AboutUsBackgroundVideoManager
    }
  }
}
