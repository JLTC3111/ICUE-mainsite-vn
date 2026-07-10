let runtimePromise = null
let pastProjectsSliderApi = null
let pastProjectsSliderPromise = null

function getPastProjectsSlider() {
  if (!pastProjectsSliderPromise) {
    pastProjectsSliderPromise = import('./pastProjectsSlider').then((api) => {
      pastProjectsSliderApi = api
      return api
    })
  }
  return pastProjectsSliderPromise
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
    window.initializeCarousel?.()
  },
  pastProjects: async () => {
    // Skip the sluggish custom touch slider in legacy/script.js —
    // Swiper is initialized from LegacyHtmlPage after HTML is painted.
    const api = await getPastProjectsSlider()
    await api.initPastProjectsSlider()
  },
  recruitment: async () => {
    window.JobBoard?.init?.()
  },
}

const PAGE_CLEANUP = {
  aboutUs: () => {
    window.AboutUsBackgroundVideoManager?.destroy?.()
  },
  pastProjects: () => {
    // Prefer sync destroy if module already loaded; otherwise load then destroy
    // so a mid-flight dynamic import cannot leave a dangling Swiper.
    if (pastProjectsSliderApi) {
      pastProjectsSliderApi.destroyPastProjectsSlider()
      return
    }
    void getPastProjectsSlider().then((api) => api.destroyPastProjectsSlider())
  },
}

export async function initLegacyPage(pageName) {
  await loadLegacyRuntime()
  window.currentPage = pageName
  window.__mainSiteNav?.setPage?.(pageName)
  const init = PAGE_INIT[pageName]
  if (init) await init()
}

export function cleanupLegacyPage(pageName) {
  PAGE_CLEANUP[pageName]?.()
}
