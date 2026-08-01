export const PERF_TIER_STORAGE_KEY = 'icue:perf-tier:v2'
export const PERF_OVERRIDE_STORAGE_KEY = 'icue:perf-override:v1'

export const PERF_TIERS = ['full', 'reduced', 'minimal']
export const PERF_OVERRIDES = ['on', 'off']

/**
 * Auto performance tiers for low-end Windows PCs and similar hardware.
 * Detection runs once per session (sessionStorage cache).
 *
 * Manual verification:
 * - Chrome DevTools → Performance, 4× CPU throttle on NewsGrid
 * - Chrome --use-gl=swiftshader (software WebGL → minimal tier)
 * - ≤4 logical cores or ≤4 GB deviceMemory → minimal
 */

const LOW_END_GPU_PATTERNS = [
  'swiftshader',
  'llvmpipe',
  'microsoft basic render',
  'basic render driver',
  'intel hd graphics',
  'intel(r) hd graphics',
  'mesa offscreen',
]

const INTEGRATED_GPU_PATTERNS = [
  'intel',
  'uhd graphics',
  'iris',
  'radeon vega',
  'amd radeon(tm) graphics',
]

let cachedRenderer = null

export function getWebGLRenderer() {
  if (cachedRenderer !== null) return cachedRenderer
  if (typeof document === 'undefined') {
    cachedRenderer = ''
    return cachedRenderer
  }

  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      cachedRenderer = ''
      return cachedRenderer
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) {
      cachedRenderer = ''
      return cachedRenderer
    }
    cachedRenderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '').toLowerCase()
  } catch {
    cachedRenderer = ''
  }

  return cachedRenderer
}

function matchesPattern(value, patterns) {
  if (!value) return false
  return patterns.some((pattern) => value.includes(pattern))
}

export function classifyPerformanceTier({ cores = 8, memory, renderer = '' } = {}) {
  const normalizedRenderer = String(renderer).toLowerCase()
  if (cores <= 4) return 'minimal'
  if (memory != null && memory <= 4) return 'minimal'
  if (matchesPattern(normalizedRenderer, LOW_END_GPU_PATTERNS)) return 'minimal'

  if (cores <= 8) return 'reduced'
  if (memory != null && memory <= 8) return 'reduced'
  if (matchesPattern(normalizedRenderer, INTEGRATED_GPU_PATTERNS)) return 'reduced'

  return 'full'
}

/** Detect the hardware tier once per session (before sessionStorage cache). */
export function detectPerformanceTier() {
  if (typeof window === 'undefined') return 'full'

  return classifyPerformanceTier({
    cores: navigator.hardwareConcurrency || 8,
    memory: navigator.deviceMemory,
    renderer: getWebGLRenderer(),
  })
}

export function readStoredPerformanceTier() {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const stored = sessionStorage.getItem(PERF_TIER_STORAGE_KEY)
    return PERF_TIERS.includes(stored) ? stored : null
  } catch {
    return null
  }
}

export function storePerformanceTier(tier) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(PERF_TIER_STORAGE_KEY, tier)
  } catch {
    // ignore storage errors
  }
}

export function resolvePerformanceTier() {
  return readStoredPerformanceTier() || detectPerformanceTier()
}

export function readPerformanceOverride() {
  if (typeof localStorage === 'undefined') return null
  try {
    const stored = localStorage.getItem(PERF_OVERRIDE_STORAGE_KEY)
    return PERF_OVERRIDES.includes(stored) ? stored : null
  } catch {
    return null
  }
}

export function storePerformanceOverride(value) {
  if (typeof localStorage === 'undefined') return
  try {
    if (PERF_OVERRIDES.includes(value)) {
      localStorage.setItem(PERF_OVERRIDE_STORAGE_KEY, value)
    } else {
      localStorage.removeItem(PERF_OVERRIDE_STORAGE_KEY)
    }
  } catch {
    // ignore storage errors
  }
}

export function resolveEffectiveTier({ autoTier, override }) {
  if (override === 'off') return 'minimal'
  if (override === 'on') return 'full'
  return PERF_TIERS.includes(autoTier) ? autoTier : 'full'
}

export function isPerformanceOptimized(tier) {
  return tier === 'minimal' || tier === 'reduced'
}

/** Map tier to feature flags consumed by UI components. */
export function tierToProfile(tier) {
  const safeTier = PERF_TIERS.includes(tier) ? tier : 'full'
  const isMinimal = safeTier === 'minimal'
  const isReduced = safeTier === 'reduced' || isMinimal
  const isFull = safeTier === 'full'

  return {
    tier: safeTier,
    reduceMotion: isReduced,
    disableParallax: isReduced,
    disableBorderBeam: isReduced,
    disableLens: !isFull,
    reduceBlur: isMinimal,
    // Motion-aware components consume reduceMotion; minimal also pauses the grid.
    simplifyHero: false,
    pauseRetroGrid: isMinimal,
    showScrollProgress: isFull || isMinimal,
    hyperTextScramble: isFull,
    // Market quote polling cadence (VN scroll uses vnTickerHoverToPlay).
    pauseTickers: isMinimal,
    // Full: VN ticker paused until hover. Lite: runs, pauses on hover.
    vnTickerHoverToPlay: isFull,
  }
}
