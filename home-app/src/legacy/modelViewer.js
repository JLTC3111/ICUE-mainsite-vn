const PAGES_WITH_MODEL_VIEWER = new Set(['aboutUs', 'ourWork'])

let loadPromise = null

export function pageUsesModelViewer(pageName) {
  return PAGES_WITH_MODEL_VIEWER.has(pageName)
}

/** Load and register the <model-viewer> custom element (bundled, not CDN). */
export async function loadModelViewer() {
  if (typeof window !== 'undefined' && window.customElements?.get('model-viewer')) {
    return
  }

  if (!loadPromise) {
    loadPromise = import('@google/model-viewer')
      .then(() => {})
      .catch((err) => {
        loadPromise = null
        throw err
      })
  }

  await loadPromise
}

/** Upgrade <model-viewer> tags parsed from legacy HTML before the CE was defined. */
export function upgradeModelViewers(root) {
  if (!root || !window.customElements?.get('model-viewer')) return
  root.querySelectorAll('model-viewer').forEach((el) => {
    window.customElements.upgrade(el)
  })
}
