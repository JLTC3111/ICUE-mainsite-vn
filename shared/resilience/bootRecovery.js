/**
 * Serialized into HTML by Vite. Keep this dependency-free: it must run even
 * when none of the application's modules can be downloaded.
 */
export function installBootRecovery(modulePaths = [], recoveryCss = '') {
  if (recoveryCss && !document.getElementById?.('icue-recovery-styles')) {
    const style = document.createElement('style')
    style.id = 'icue-recovery-styles'
    style.textContent = recoveryCss
    document.head.append(style)
  }
  const retryParam = '__icue_boot_retry'
  const maxRetries = 2
  const attempt = Math.min(maxRetries, Math.max(0, Number(new URLSearchParams(window.location.search).get(retryParam)) || 0))
  if (attempt && modulePaths.length) {
    // WebKit can retain a failed dynamic module even across a reload. Map
    // every non-entry module to a fresh URL consistently, so shared React
    // dependencies keep one identity and cyclic imports keep the real entry.
    const imports = {}
    for (const pathname of modulePaths) {
      const url = new URL(pathname, window.location.href)
      const original = url.href
      url.searchParams.set('__icue_module_retry', String(attempt))
      imports[original] = url.href
    }
    const map = document.createElement('script')
    map.type = 'importmap'
    map.textContent = JSON.stringify({ imports })
    document.head.append(map)
  }
  const failedStyles = new Map()
  const pendingRoutes = new Set()
  let mounted = false
  let ready = false
  let failed = false
  let retryable = false
  let retryTimer
  let notice
  let loadingNotice
  let loadingDelayElapsed = false
  const language = new URLSearchParams(window.location.search).get('lang') || document.documentElement.lang
  const loadingLabel = {
    vi: 'Đang tải…', en: 'Loading…', de: 'Wird geladen…',
    fr: 'Chargement…', ko: '불러오는 중…', ja: '読み込み中…',
  }[language?.split('-')[0]] || 'Loading…'
  const copy = {
    vi: ['Trang chưa tải xong. Vui lòng kiểm tra kết nối hoặc tải lại trang.', 'Tải lại trang'],
    en: ['The page could not finish loading. Check your connection or reload the page.', 'Reload page'],
    de: ['Die Seite konnte nicht vollständig geladen werden. Prüfen Sie die Verbindung oder laden Sie die Seite neu.', 'Seite neu laden'],
    fr: ['Le chargement de la page a échoué. Vérifiez votre connexion ou rechargez la page.', 'Recharger la page'],
    ko: ['페이지를 불러오지 못했습니다. 연결을 확인하거나 페이지를 새로고침하세요.', '페이지 새로고침'],
    ja: ['ページを読み込めませんでした。接続を確認するか、ページを再読み込みしてください。', 'ページを再読み込み'],
  }[language?.split('-')[0]] || ['The page could not be loaded.', 'Reload page']

  // This small CSS-only lattice is available before React or its stylesheet
  // arrives. React's localized loader takes over as soon as the app mounts.
  function clearLoading() {
    loadingNotice?.remove()
    loadingNotice = null
  }

  function showLoading() {
    if (mounted || failed || notice || loadingNotice || !document.body) return
    loadingNotice = document.createElement('aside')
    loadingNotice.id = 'icue-boot-loading'
    loadingNotice.className = 'icue-recovery icue-recovery--compact'
    loadingNotice.setAttribute('role', 'status')
    loadingNotice.style.cssText = 'position:fixed;z-index:2147483646;top:50%;left:50%;transform:translate(-50%,-50%);width:max-content;max-width:calc(100% - 32px);margin:0;padding:18px 24px;font:14px/1.5 system-ui'
    const row = document.createElement('span')
    row.className = 'lattice-loader'
    row.setAttribute('data-status', 'working')
    row.setAttribute('data-shape', 'round')
    if (document.hidden) row.setAttribute('data-paused', '')
    const grid = document.createElement('span')
    grid.className = 'lattice-loader__grid'
    grid.setAttribute('aria-hidden', 'true')
    const layer = document.createElement('span')
    layer.className = 'lattice-loader__layer lattice-loader__run'
    for (const delay of [0, 108, 216, 756, null, 324, 648, 540, 432]) {
      const cell = document.createElement('span')
      cell.className = 'lattice-loader__cell'
      if (delay == null) cell.setAttribute('data-hole', '')
      else cell.style.animationDelay = `${delay}ms`
      layer.append(cell)
    }
    grid.append(layer)
    const label = document.createElement('span')
    label.className = 'lattice-loader__label'
    label.textContent = loadingLabel
    row.append(grid, label)
    loadingNotice.append(row)
    document.body.append(loadingNotice)
  }

  const loadingTimer = window.setTimeout(() => {
    loadingDelayElapsed = true
    showLoading()
  }, 1500)

  function showNotice() {
    clearLoading()
    if (notice || !document.body) return
    notice = document.createElement('aside')
    notice.id = 'icue-boot-recovery'
    notice.className = 'icue-recovery icue-recovery--boot'
    notice.setAttribute('role', 'alert')
    notice.style.cssText = 'position:fixed;z-index:2147483647;bottom:16px;left:16px;right:16px;max-width:560px;max-height:calc(100dvh - 32px);overflow:auto;margin:auto;padding:20px;background:var(--recovery-surface,#f8fafc);color:var(--recovery-text,#17202a);border:1px solid var(--recovery-border,#64748b);border-radius:8px;font:16px/1.5 system-ui;box-shadow:0 4px 24px #0003'
    const text = document.createElement('p')
    text.textContent = copy[0]
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = copy[1]
    button.style.cssText = 'min-height:44px;padding:8px 16px;font:inherit;cursor:pointer'
    if (!recoveryCss) {
      // Keep the standalone installer readable even without the Vite-inlined CSS.
      button.style.cssText += ';background:#17202a;color:#fff;border:1px solid #17202a;box-shadow:none'
    }
    button.addEventListener('click', () => window.location.reload())
    const actions = document.createElement('div')
    actions.className = 'icue-recovery__actions'
    actions.append(button)
    notice.append(text, actions)
    document.body.append(notice)
  }

  function clearNotice() {
    if (ready && failedStyles.size === 0) {
      notice?.remove()
      notice = null
    }
  }

  function connected() {
    return !document.hidden && navigator.onLine !== false
  }

  function recover() {
    if (!connected()) return
    for (const [link, state] of failedStyles) {
      if (state.pending || state.attempts >= maxRetries) continue
      state.pending = true
      window.setTimeout(() => {
        state.pending = false
        if (!connected() || !failedStyles.has(link)) return
        state.pending = true
        state.attempts++
        const url = new URL(link.href)
        url.searchParams.set('__icue_asset_retry', String(state.attempts))
        link.href = url.href
      }, 1500)
    }
    if (ready || !failed || !retryable || retryTimer) return
    const url = new URL(window.location.href)
    const attempts = Math.max(0, Number(url.searchParams.get(retryParam)) || 0)
    if (attempts >= maxRetries) return
    retryTimer = window.setTimeout(() => {
      retryTimer = null
      if (ready || !connected()) return
      // A URL counter also bounds recovery when browser storage is blocked.
      // Keep the restored route, language, other query parameters and hash.
      url.searchParams.set(retryParam, String(attempts + 1))
      window.location.replace(url.href)
    }, 1500)
  }

  function failBoot(canRetry) {
    if (ready) return
    failed = true
    retryable ||= canRetry
    showNotice()
    recover()
  }

  window.addEventListener('error', event => {
    const target = event.target
    if (target?.tagName === 'LINK' && target.rel === 'stylesheet') {
      if (!failedStyles.has(target)) target.addEventListener('load', () => {
        failedStyles.delete(target)
        clearNotice()
      }, { once: true })
      const state = failedStyles.get(target) || { attempts: 0 }
      state.pending = false
      failedStyles.set(target, state)
      showNotice()
      recover()
    } else if (target?.tagName === 'SCRIPT' && target.type === 'module') {
      failBoot(true)
    } else if (target === window) {
      failBoot(false)
    }
  }, true)
  window.addEventListener('unhandledrejection', () => failBoot(false))
  window.addEventListener('online', recover)
  window.addEventListener('pageshow', recover)
  document.addEventListener('visibilitychange', () => {
    const row = loadingNotice?.children[0]
    if (document.hidden) row?.setAttribute('data-paused', '')
    else row?.removeAttribute?.('data-paused')
    recover()
  })
  document.addEventListener('resume', recover)
  document.addEventListener('DOMContentLoaded', () => {
    if (failed || failedStyles.size) showNotice()
    else if (loadingDelayElapsed) showLoading()
  }, { once: true })
  const deadline = window.setTimeout(() => failBoot(true), 20_000)

  function markReady() {
    if (!mounted || pendingRoutes.size) return
    ready = true
    failed = false
    retryable = false
    window.clearTimeout(deadline)
    window.clearTimeout(retryTimer)
    retryTimer = null
    clearNotice()
    const url = new URL(window.location.href)
    if (url.searchParams.has(retryParam)) {
      url.searchParams.delete(retryParam)
      window.history.replaceState(window.history.state, '', url.href)
    }
  }
  window.addEventListener('icue:app-ready', () => {
    mounted = true
    window.clearTimeout(loadingTimer)
    clearLoading()
    markReady()
  }, { once: true })
  // Only explicitly opted-in, read-only routes may recover with a document
  // reload. Other lazy boundaries retain their surrounding form/draft state.
  window.addEventListener('icue:route-loading', event => {
    pendingRoutes.add(event.detail)
    ready = false
  })
  window.addEventListener('icue:route-ready', event => {
    pendingRoutes.delete(event.detail)
    markReady()
  })
  window.addEventListener('icue:route-error', () => failBoot(true))
}
