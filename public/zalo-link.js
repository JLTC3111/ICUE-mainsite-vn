(function () {
  var ICUE_ZALO_PHONE = '84768748391'

  function zaloWebUrl(phone) {
    return 'https://zalo.me/' + phone
  }

  function zaloDeepLink(phone) {
    return 'zalo://conversation?phone=' + phone
  }

  function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  }

  function openZaloChat(phone, event) {
    if (event) event.preventDefault()
    if (isMobileDevice()) {
      window.open(zaloWebUrl(phone), '_blank', 'noopener,noreferrer')
      return
    }
    window.location.href = zaloDeepLink(phone)
  }

  function bindZaloLinks(root) {
    root = root || document
    root.querySelectorAll('a[href^="https://zalo.me/"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var match = link.href.match(/zalo\.me\/(\d{8,12})/)
        openZaloChat(match && match[1] ? match[1] : ICUE_ZALO_PHONE, event)
      })
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { bindZaloLinks() })
  } else {
    bindZaloLinks()
  }
})()
