let runtimePromise = null
let pastProjectsSliderApi = null

async function getPastProjectsSlider() {
  if (!pastProjectsSliderApi) {
    pastProjectsSliderApi = await import('./pastProjectsSlider')
  }
  return pastProjectsSliderApi
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
    const { initPastProjectsSlider } = await getPastProjectsSlider()
    await initPastProjectsSlider()
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
    pastProjectsSliderApi?.destroyPastProjectsSlider?.()
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
