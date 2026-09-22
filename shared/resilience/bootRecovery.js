/**
 * Serialized into HTML by Vite. Keep this dependency-free: it must run even
 * when none of the application's modules can be downloaded.
 */
export function installBootRecovery(modulePaths = []) {
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
  const language = new URLSearchParams(window.location.search).get('lang') || document.documentElement.lang
  const copy = {
    vi: ['Trang chưa tải xong. Vui lòng kiểm tra kết nối hoặc tải lại trang.', 'Tải lại trang'],
    en: ['The page could not finish loading. Check your connection or reload the page.', 'Reload page'],
    de: ['Die Seite konnte nicht vollständig geladen werden. Prüfen Sie die Verbindung oder laden Sie die Seite neu.', 'Seite neu laden'],
    fr: ['Le chargement de la page a échoué. Vérifiez votre connexion ou rechargez la page.', 'Recharger la page'],
    ko: ['페이지를 불러오지 못했습니다. 연결을 확인하거나 페이지를 새로고침하세요.', '페이지 새로고침'],
    ja: ['ページを読み込めませんでした。接続を確認するか、ページを再読み込みしてください。', 'ページを再読み込み'],
  }[language?.split('-')[0]] || ['The page could not be loaded.', 'Reload page']

  function showNotice() {
    if (notice || !document.body) return
    notice = document.createElement('aside')
    notice.id = 'icue-boot-recovery'
    notice.setAttribute('role', 'alert')
    notice.style.cssText = 'position:fixed;z-index:2147483647;bottom:16px;left:16px;right:16px;max-width:560px;margin:auto;padding:20px;background:#fff;color:#151515;border:1px solid #888;border-radius:8px;font:16px/1.5 system-ui;box-shadow:0 4px 24px #0003'
    const text = document.createElement('p')
    text.textContent = copy[0]
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = copy[1]
    button.style.cssText = 'min-height:44px;padding:8px 16px;font:inherit;cursor:pointer'
    button.addEventListener('click', () => window.location.reload())
    notice.append(text, button)
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
  document.addEventListener('visibilitychange', recover)
  document.addEventListener('resume', recover)
  document.addEventListener('DOMContentLoaded', () => { if (failed || failedStyles.size) showNotice() }, { once: true })
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
