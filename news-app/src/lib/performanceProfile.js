export const PERF_TIER_STORAGE_KEY = 'icue:perf-tier:v3'
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
 * - DevTools device emulation (coarse pointer) → full, see MOBILE_LOW_MEMORY_GB
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

/**
 * Phones and tablets report 4–8 logical cores by design, so the desktop
 * thresholds below flag every one of them as low-end and switch off motion the
 * hardware handles fine (Embla's parallax is a composited translate3d). Touch
 * devices are judged on the signals that still mean something there: a software
 * renderer, or a genuinely memory-starved budget device.
 */
const MOBILE_LOW_MEMORY_GB = 2

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

export function classifyPerformanceTier({ cores = 8, memory, renderer = '', mobile = false } = {}) {
  const normalizedRenderer = String(renderer).toLowerCase()
  if (matchesPattern(normalizedRenderer, LOW_END_GPU_PATTERNS)) return 'minimal'

  if (mobile) {
    if (memory != null && memory <= MOBILE_LOW_MEMORY_GB) return 'minimal'
    return 'full'
  }

  if (cores <= 4) return 'minimal'
  if (memory != null && memory <= 4) return 'minimal'

  if (cores <= 8) return 'reduced'
  if (memory != null && memory <= 8) return 'reduced'
  if (matchesPattern(normalizedRenderer, INTEGRATED_GPU_PATTERNS)) return 'reduced'

  return 'full'
}

/** Phone/tablet check by input capability rather than user-agent sniffing. */
export function isTouchPrimaryDevice() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(pointer: coarse) and (hover: none)').matches
}

/** Detect the hardware tier once per session (before sessionStorage cache). */
export function detectPerformanceTier() {
  if (typeof window === 'undefined') return 'full'

  return classifyPerformanceTier({
    cores: navigator.hardwareConcurrency || 8,
    memory: navigator.deviceMemory,
    renderer: getWebGLRenderer(),
    mobile: isTouchPrimaryDevice(),
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
