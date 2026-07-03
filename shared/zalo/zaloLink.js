/** ICUE Zalo account (country code + number, no + prefix). */
export const ICUE_ZALO_PHONE = '904540661'

export function zaloWebUrl(phone = ICUE_ZALO_PHONE) {
  return `https://zalo.me/${phone}`
}

export function zaloDeepLink(phone = ICUE_ZALO_PHONE) {
  return `zalo://conversation?phone=${phone}`
}

export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * Open a chat with the ICUE Zalo account.
 * Desktop browsers redirect zalo.me to a login page; use the app deep link instead.
 */
export function openZaloChat(phone = ICUE_ZALO_PHONE, event) {
  event?.preventDefault()

  if (isMobileDevice()) {
    window.open(zaloWebUrl(phone), '_blank', 'noopener,noreferrer')
    return
  }

  window.location.href = zaloDeepLink(phone)
}

/** Wire up static <a href="https://zalo.me/..."> links (main site HTML). */
export function bindZaloLinks(root = document) {
  root.querySelectorAll('a[href^="https://zalo.me/"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const match = link.href.match(/zalo\.me\/(\d{8,12})/)
      openZaloChat(match?.[1] || ICUE_ZALO_PHONE, event)
    })
  })
}
