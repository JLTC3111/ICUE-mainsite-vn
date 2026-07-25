let runtimePromise = null
let pastProjectsSliderApi = null
let pastProjectsSliderPromise = null
let newsArchiveSliderApi = null
let newsArchiveSliderPromise = null
let ourWorkCarouselApi = null
let ourWorkCarouselPromise = null

function getPastProjectsSlider() {
  if (!pastProjectsSliderPromise) {
    pastProjectsSliderPromise = import('./pastProjectsSlider').then((api) => {
      pastProjectsSliderApi = api
      return api
    })
  }
  return pastProjectsSliderPromise
}

let pastProjectsAosApi = null
let pastProjectsAosPromise = null

function getPastProjectsAos() {
  if (!pastProjectsAosPromise) {
    pastProjectsAosPromise = import('./pastProjectsAos').then((api) => {
      pastProjectsAosApi = api
      return api
    })
  }
  return pastProjectsAosPromise
}

function getNewsArchiveSlider() {
  if (!newsArchiveSliderPromise) {
    newsArchiveSliderPromise = import('./newsArchiveSlider').then((api) => {
      newsArchiveSliderApi = api
      return api
    })
  }
  return newsArchiveSliderPromise
}

function getOurWorkCarousel() {
  if (!ourWorkCarouselPromise) {
    ourWorkCarouselPromise = import('./ourWorkCarousel').then((api) => {
      ourWorkCarouselApi = api
      return api
    })
  }
  return ourWorkCarouselPromise
}

function loadLegacyRuntime() {
  if (window.__icueLegacyRuntimeLoaded) {
    return Promise.resolve()
  }

  if (!runtimePromise) {
    window.__ICUE_SKIP_HASH_ROUTER__ = true
    runtimePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = '/legacy/script.js'
      script.async = true
      script.onload = () => {
        window.__icueLegacyRuntimeLoaded = true
        resolve()
      }
      script.onerror = () => reject(new Error('Failed to load legacy page runtime'))
      document.head.appendChild(script)
    })
  }

  return runtimePromise
}

const PAGE_INIT = {
  Contact: async () => {
    window.initPostMethod?.()
  },
  aboutUs: async () => {
    window.initHomeTextSlider?.()
    window.AboutUsBackgroundVideoManager?.bindToggleUI?.()
    window.AboutUsBackgroundVideoManager?.init?.()
  },
  ourWork: async () => {
    const carousel = await getOurWorkCarousel()
    carousel.initOurWorkCarousel()
  },
  pastProjects: async () => {
    // Skip the sluggish custom touch slider in legacy/script.js —
    // Swiper is initialized from LegacyHtmlPage after HTML is painted.
    const slider = await getPastProjectsSlider()
    await slider.initPastProjectsSlider()
    const aos = await getPastProjectsAos()
    aos.initPastProjectsAos()
  },
  newsArchive: async () => {
    // Skip legacy/script.js logo + mobile card sliders — use Swiper modules.
    const api = await getNewsArchiveSlider()
    await api.initNewsArchiveSlider()
  },
  recruitment: async () => {
    window.JobBoard?.init?.()
  },
  FAQs: async () => {
    window.initFrequentlyAskedQuestions?.()
  },
  donations: async () => {
    window.DonationForm?.init?.()
  },
  notableAwards: async () => {
    window.AwardsPage?.init?.()
  },
  communityActivities: async () => {
    window.CommunityPage?.init?.()
  },
}

const PAGE_CLEANUP = {
  aboutUs: () => {
    window.AboutUsBackgroundVideoManager?.destroy?.()
  },
  ourWork: () => {
    ourWorkCarouselApi?.destroyOurWorkCarousel()
  },
  pastProjects: () => {
    pastProjectsAosApi?.destroyPastProjectsAos?.()
    if (!pastProjectsAosApi) {
      void getPastProjectsAos().then((api) => api.destroyPastProjectsAos())
    }
    // Prefer sync destroy if module already loaded; otherwise load then destroy
    // so a mid-flight dynamic import cannot leave a dangling Swiper.
    if (pastProjectsSliderApi) {
      pastProjectsSliderApi.destroyPastProjectsSlider()
      return
    }
    void getPastProjectsSlider().then((api) => api.destroyPastProjectsSlider())
  },
  newsArchive: () => {
    if (newsArchiveSliderApi) {
      newsArchiveSliderApi.destroyNewsArchiveSlider()
      return
    }
    void getNewsArchiveSlider().then((api) => api.destroyNewsArchiveSlider())
  },
}

export async function initLegacyPage(pageName) {
  window.currentPage = pageName
  window.__mainSiteNav?.setPage?.(pageName)

  // Our Work has a small route-specific initializer and does not need the
  // 291 KB all-pages legacy runtime.
  if (pageName !== 'ourWork') {
    await loadLegacyRuntime()
  }

  const init = PAGE_INIT[pageName]
  if (init) await init()
}

export function cleanupLegacyPage(pageName) {
  PAGE_CLEANUP[pageName]?.()
}
