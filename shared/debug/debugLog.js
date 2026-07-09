const DEBUG_SESSION = '41eb27'
const DEBUG_ENDPOINT = 'http://127.0.0.1:7334/ingest/252f3540-649c-4676-b61f-d6baa3996828'
const STORAGE_KEY = 'icue_debug_41eb27'

function isDebugOverlayEnabled() {
  try {
    return new URLSearchParams(window.location.search).has('icue_debug')
  } catch {
    return false
  }
}

function isLocalDevHost() {
  try {
    const host = window.location.hostname
    return host === 'localhost' || host === '127.0.0.1'
  } catch {
    return false
  }
}

function shouldSendToIngest() {
  return isDebugOverlayEnabled() && isLocalDevHost()
}

function pushToBuffer(entry) {
  try {
    const buffer = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]')
    buffer.push(entry)
    if (buffer.length > 80) buffer.shift()
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(buffer))
  } catch {
    // ignore storage failures
  }
}

function renderDebugOverlay(entry) {
  if (!isDebugOverlayEnabled()) return
  let panel = document.getElementById('icue-debug-panel')
  if (!panel) {
    panel = document.createElement('pre')
    panel.id = 'icue-debug-panel'
    panel.style.cssText = [
      'position:fixed',
      'left:0',
      'right:0',
      'bottom:0',
      'max-height:38vh',
      'overflow:auto',
      'margin:0',
      'padding:8px',
      'font:11px/1.35 monospace',
      'color:#d7ffe0',
      'background:rgba(0,0,0,0.82)',
      'z-index:99999',
      'pointer-events:none',
    ].join(';')
    document.body.appendChild(panel)
  }
  panel.textContent = `${entry.hypothesisId || '-'} ${entry.location}: ${entry.message}\n${JSON.stringify(entry.data || {})}\n\n${panel.textContent}`.slice(0, 4000)
}

export function debugLog(location, message, data = {}, hypothesisId = '') {
  if (!isDebugOverlayEnabled()) return

  const entry = {
    sessionId: DEBUG_SESSION,
    runId: data.runId || 'pre-fix',
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  }

  pushToBuffer(entry)
  renderDebugOverlay(entry)

  if (shouldSendToIngest()) {
  // #region agent log
    fetch(DEBUG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': DEBUG_SESSION,
      },
      body: JSON.stringify(entry),
    }).catch(() => {})
  // #endregion
  }
}

export function installGlobalDebugHandlers() {
  if (!isDebugOverlayEnabled()) return
  if (window.__ICUE_DEBUG_INSTALLED__) return
  window.__ICUE_DEBUG_INSTALLED__ = true

  window.addEventListener('error', (event) => {
    debugLog('main.jsx:error', 'window.error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }, 'A')
  })

  window.addEventListener('unhandledrejection', (event) => {
    debugLog('main.jsx:rejection', 'unhandledrejection', {
      reason: String(event.reason),
    }, 'A')
  })

  debugLog('main.jsx:bootstrap', 'app bootstrap', {
    ua: navigator.userAgent,
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio,
    coarse: window.matchMedia('(pointer: coarse)').matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    webgl2: !!document.createElement('canvas').getContext('webgl2'),
  }, 'B')
}
