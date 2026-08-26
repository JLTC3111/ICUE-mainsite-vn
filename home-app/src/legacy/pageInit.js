let runtimePromise = null
let pastProjectsSliderApi = null
let pastProjectsSliderPromise = null
let newsArchiveSliderApi = null
let newsArchiveSliderPromise = null
let aboutUsPageApi = null
let aboutUsPagePromise = null

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

function getAboutUsPage() {
  if (!aboutUsPagePromise) {
    aboutUsPagePromise = import('./aboutUsPage').then((api) => {
      aboutUsPageApi = api
      return api
    })
  }
  return aboutUsPagePromise
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
  aboutUs: async () => {
    const aboutUsPage = await getAboutUsPage()
    aboutUsPage.initAboutUsPage()
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
  notableAwards: async () => {
    window.AwardsPage?.init?.()
  },
  communityActivities: async () => {
    window.CommunityPage?.init?.()
  },
}

const PAGE_CLEANUP = {
  aboutUs: () => {
    aboutUsPageApi?.destroyAboutUsPage()
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

  // These pages have route-specific initializers and do not need the 291 KB
  // all-pages legacy runtime.
  if (!['aboutUs', 'pastProjects', 'newsArchive'].includes(pageName)) {
    await loadLegacyRuntime()
  }

  window.enableCursorGradientTrail?.()

  const init = PAGE_INIT[pageName]
  if (init) await init()
}

export function cleanupLegacyPage(pageName) {
  window.disableCursorGradientTrail?.()
  PAGE_CLEANUP[pageName]?.()
}
