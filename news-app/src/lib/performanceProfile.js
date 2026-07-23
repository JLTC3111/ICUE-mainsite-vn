export const PERF_TIER_STORAGE_KEY = 'icue:perf-tier:v1'
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
  'angle (',
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

/** Detect hardware tier once per session (before sessionStorage cache). */
export function detectPerformanceTier() {
  if (typeof window === 'undefined') return 'full'

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'minimal'
  }

  const cores = navigator.hardwareConcurrency || 8
  const memory = navigator.deviceMemory
  const renderer = getWebGLRenderer()

  if (cores <= 4) return 'minimal'
  if (memory != null && memory <= 4) return 'minimal'
  if (matchesPattern(renderer, LOW_END_GPU_PATTERNS)) return 'minimal'

  if (cores <= 8) return 'reduced'
  if (memory != null && memory <= 8) return 'reduced'
  if (matchesPattern(renderer, INTEGRATED_GPU_PATTERNS)) return 'reduced'

  return 'full'
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
  if (override === 'on' || override == null) return 'full'
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

  return {
    tier: safeTier,
    reduceMotion: isMinimal,
    disableGlobe: false,
    freezeGlobe: isMinimal,
    disableParallax: isReduced,
    disableBorderBeam: isReduced,
    disableLens: safeTier !== 'full',
    reduceBlur: isMinimal,
    simplifyHero: isMinimal,
    globeQuality: isMinimal ? 'low' : isReduced ? 'low' : 'full',
    showScrollProgress: safeTier === 'full',
    hyperTextScramble: safeTier === 'full',
    pauseTickers: isMinimal,
  }
}

export function applyGlobeQuality(config, quality = 'full') {
  if (!config || quality === 'full') return config
  return {
    ...config,
    devicePixelRatio: 1,
    mapSamples: 6000,
  }
}
