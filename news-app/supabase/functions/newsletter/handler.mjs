const locales = ['vi', 'en', 'fr', 'de', 'ja', 'ko']
const tokenPattern = /^[a-f0-9]{64}$/
const escapeHtml = value => String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const copy = {
  en: { confirm: 'Confirm your newsletter subscription', intro: 'Receive an email when ICUE publishes a new article.', action: 'Confirm subscription', ignore: 'If you did not request this, you can ignore this email. This link expires in 24 hours.', article: 'New from ICUE Newsroom', read: 'Read the article', unsubscribe: 'Unsubscribe', reason: 'You receive this because you subscribed to the ICUE newsletter.', done: 'Your subscription is confirmed. We will email you when a new article is published.', removed: 'You have unsubscribed. You will no longer receive new article emails.', invalid: 'This link is invalid or has expired. Please subscribe again from the newsroom.', leave: 'Unsubscribe from the ICUE newsletter?', back: 'Visit the newsroom', failed: 'We could not complete your request. Please try again.' },
  vi: { confirm: 'Xác nhận đăng ký bản tin', intro: 'Nhận email khi ICUE đăng bài viết mới.', action: 'Xác nhận đăng ký', ignore: 'Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này. Liên kết có hiệu lực trong 24 giờ.', article: 'Bài viết mới từ ICUE', read: 'Đọc bài viết', unsubscribe: 'Hủy đăng ký', reason: 'Bạn nhận được email này vì đã đăng ký bản tin ICUE.', done: 'Đã xác nhận đăng ký. Chúng tôi sẽ gửi email khi có bài viết mới.', removed: 'Đã hủy đăng ký. Bạn sẽ không nhận email thông báo bài viết mới nữa.', invalid: 'Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng đăng ký lại tại trang tin tức.', leave: 'Hủy đăng ký bản tin ICUE?', back: 'Đến trang tin tức', failed: 'Chưa thể xử lý yêu cầu. Vui lòng thử lại.' },
  fr: { confirm: 'Confirmez votre inscription à la newsletter', intro: 'Recevez un email lorsque ICUE publie un nouvel article.', action: 'Confirmer mon inscription', ignore: 'Si vous n’avez pas demandé cette inscription, ignorez cet email. Ce lien expire dans 24 heures.', article: 'Nouvel article ICUE', read: 'Lire l’article', unsubscribe: 'Se désinscrire', reason: 'Vous recevez cet email car vous êtes abonné à la newsletter ICUE.', done: 'Votre inscription est confirmée. Vous recevrez un email à chaque nouvel article.', removed: 'Vous êtes désinscrit et ne recevrez plus ces emails.', invalid: 'Ce lien est invalide ou a expiré. Inscrivez-vous à nouveau depuis la page des actualités.', leave: 'Vous désinscrire de la newsletter ICUE ?', back: 'Voir les actualités', failed: 'Votre demande n’a pas pu être traitée. Réessayez.' },
  de: { confirm: 'Newsletter-Anmeldung bestätigen', intro: 'Erhalten Sie eine E-Mail, wenn ICUE einen neuen Artikel veröffentlicht.', action: 'Anmeldung bestätigen', ignore: 'Falls Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail. Dieser Link ist 24 Stunden gültig.', article: 'Neuer Artikel von ICUE', read: 'Artikel lesen', unsubscribe: 'Abmelden', reason: 'Sie erhalten diese E-Mail, weil Sie den ICUE-Newsletter abonniert haben.', done: 'Ihre Anmeldung ist bestätigt. Wir informieren Sie per E-Mail über neue Artikel.', removed: 'Sie sind abgemeldet und erhalten keine weiteren Artikel-E-Mails.', invalid: 'Dieser Link ist ungültig oder abgelaufen. Melden Sie sich auf der Nachrichtenseite erneut an.', leave: 'Vom ICUE-Newsletter abmelden?', back: 'Zu den Nachrichten', failed: 'Ihre Anfrage konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.' },
  ja: { confirm: 'ニュースレターの登録を確認', intro: 'ICUEが新しい記事を公開した際にメールでお知らせします。', action: '登録を確認する', ignore: '登録を申し込んでいない場合は、このメールを無視してください。リンクの有効期限は24時間です。', article: 'ICUEの新着記事', read: '記事を読む', unsubscribe: '配信を停止する', reason: 'ICUEニュースレターにご登録いただいた方にお送りしています。', done: '登録が完了しました。新しい記事を公開した際にメールでお知らせします。', removed: '配信を停止しました。新着記事のお知らせメールは届かなくなります。', invalid: 'リンクが無効か、有効期限が切れています。ニュースページから再度登録してください。', leave: 'ICUEニュースレターの配信を停止しますか？', back: 'ニュースを見る', failed: '処理できませんでした。もう一度お試しください。' },
  ko: { confirm: '뉴스레터 구독 확인', intro: 'ICUE가 새 기사를 게시하면 이메일로 알려드립니다.', action: '구독 확인', ignore: '구독을 신청하지 않으셨다면 이 이메일을 무시하세요. 이 링크는 24시간 동안 유효합니다.', article: 'ICUE 새 기사', read: '기사 읽기', unsubscribe: '구독 취소', reason: 'ICUE 뉴스레터를 구독하셨기에 이 이메일을 받으셨습니다.', done: '구독이 확인되었습니다. 새 기사가 게시되면 이메일로 알려드립니다.', removed: '구독이 취소되었습니다. 더 이상 새 기사 알림 이메일을 받지 않습니다.', invalid: '유효하지 않거나 만료된 링크입니다. 뉴스 페이지에서 다시 구독해 주세요.', leave: 'ICUE 뉴스레터 구독을 취소하시겠습니까?', back: '뉴스 보기', failed: '요청을 처리하지 못했습니다. 다시 시도해 주세요.' },
}
const words = locale => copy[locale] || copy.en
const normalizedLocale = value => locales.includes(value) ? value : 'en'

// The canonical site and function URLs come from server configuration, never
// a request's Host/Origin or an article's authored HTML.
export function newsletterEmail(row, { siteUrl, functionUrl }) {
  const t = words(row.locale)
  const link = new URL(`${siteUrl}/newsroom/newsletter`)
  link.searchParams.set('action', row.kind === 'confirmation' ? 'confirm' : 'unsubscribe')
  link.searchParams.set('token', row.token)
  link.searchParams.set('locale', normalizedLocale(row.locale))
  const oneClickLink = new URL(functionUrl)
  oneClickLink.search = link.search
  const confirmation = row.kind === 'confirmation'
  const articleUrl = `${siteUrl}/newsroom/article/${encodeURIComponent(row.article_slug || '')}`
  const title = confirmation ? t.confirm : String(row.article_title || t.article).replace(/[\r\n]/g, ' ').slice(0, 300)
  const actionUrl = confirmation ? link.href : articleUrl
  const actionLabel = confirmation ? t.action : t.read
  const detail = confirmation ? t.intro : t.article
  const note = confirmation ? t.ignore : t.reason
  return {
    to: { address: row.email },
    subject: confirmation ? `ICUE — ${t.confirm}` : `ICUE — ${title}`,
    messageId: `<newsletter.${row.id}@icue.vn>`,
    text: [title, '', detail, '', `${actionLabel}: ${actionUrl}`, '', note, ...(!confirmation ? [`${t.unsubscribe}: ${link.href}`] : [])].join('\n'),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#19231d;line-height:1.7"><p style="color:#176b36;font-weight:bold">ICUE · NEWSROOM</p><h1 style="font-size:26px">${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p><p><a style="color:#176b36;font-weight:bold" href="${escapeHtml(actionUrl)}">${escapeHtml(actionLabel)}</a></p><hr><p style="font-size:13px">${escapeHtml(note)}</p>${!confirmation ? `<p><a href="${escapeHtml(link.href)}">${escapeHtml(t.unsubscribe)}</a></p>` : ''}</div>`,
    ...(!confirmation ? { headers: { 'List-Unsubscribe': `<${oneClickLink.href}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
  }
}

export async function deliverNewsletter(admin, sendEmail, urls, subscriberId = null) {
  const claimed = await admin.rpc('newsletter_claim', { p_limit: subscriberId ? 1 : 5, p_subscriber_id: subscriberId })
  if (claimed.error) throw new Error('queue_unavailable')
  let sent = 0
  for (const row of claimed.data || []) {
    let error = null
    try { await sendEmail(newsletterEmail(row, urls)) } catch { error = 'smtp_delivery_failed' }
    const finished = await admin.rpc('newsletter_finish', { p_id: row.id, p_claim_token: row.claim_token, p_error: error })
    if (finished.error) throw new Error('acknowledgement_unavailable')
    if (!error && finished.data) sent++
  }
  return sent
}

async function readBody(request) {
  if (Number(request.headers.get('content-length')) > 4096) throw new Error('body_too_large')
  const reader = request.body?.getReader()
  if (!reader) return ''
  let size = 0
  const chunks = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 4096) { await reader.cancel(); throw new Error('body_too_large') }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return new TextDecoder().decode(bytes)
}

export function createNewsletterHandler({ admin, sendEmail, verifyEmail, siteUrl = 'https://vi.icue.vn', functionUrl, ipSalt }) {
  const urls = { siteUrl: new URL(siteUrl).origin, functionUrl }
  const allowedOrigin = origin => {
    if (!origin) return true
    try {
      const url = new URL(origin)
      return url.origin === new URL(functionUrl).origin || (url.protocol === 'https:' && (url.hostname === 'icue.vn' || url.hostname.endsWith('.icue.vn'))) || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
    } catch { return false }
  }
  return async request => {
    const origin = request.headers.get('origin')
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', Vary: 'Origin', ...(origin && allowedOrigin(origin) ? { 'Access-Control-Allow-Origin': origin } : {}), 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info' }
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json', ...(status === 429 ? { 'Retry-After': '3600' } : {}) } })
    if (!allowedOrigin(origin)) return json({ code: 'forbidden' }, 403)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (!['GET', 'POST'].includes(request.method)) return json({ code: 'method_not_allowed' }, 405)
    const url = new URL(request.url)
    const action = url.searchParams.get('action') || 'subscribe'
    const locale = normalizedLocale(url.searchParams.get('locale'))
    try {
      if (['confirm', 'unsubscribe'].includes(action)) {
        const token = url.searchParams.get('token') || ''
        if (!tokenPattern.test(token)) return json({ code: 'invalid_token' }, 400)
        // Supabase serves HTML as plain text. The website owns the review page;
        // neither this GET nor that page's initial load changes consent.
        if (request.method === 'GET') {
          const reviewUrl = new URL(`${urls.siteUrl}/newsroom/newsletter`)
          for (const [key, value] of [['action', action], ['token', token], ['locale', locale]]) reviewUrl.searchParams.set(key, value)
          return new Response(null, { status: 303, headers: { ...headers, Location: reviewUrl.href } })
        }
        await readBody(request)
        const result = await admin.rpc(action === 'confirm' ? 'newsletter_confirm' : 'newsletter_unsubscribe', { p_token: token })
        if (result.error) return json({ code: 'unavailable' }, 503)
        return result.data ? json({ ok: true }) : json({ code: 'invalid_token' }, 400)
      }
      if (request.method !== 'POST') return json({ code: 'method_not_allowed' }, 405)
      if (action === 'dispatch') {
        const key = request.headers.get('x-newsletter-key') || ''
        if (!tokenPattern.test(key)) return json({ code: 'forbidden' }, 403)
        const valid = await admin.rpc('newsletter_dispatch_key_valid', { p_key: key })
        if (valid.error || valid.data !== true) return json({ code: 'forbidden' }, 403)
        // Operator-only SMTP handshake test: verifies sender credentials without
        // creating a subscription, claiming a delivery, or sending any email.
        if (url.searchParams.get('check') === 'smtp') {
          if (!verifyEmail) return json({ code: 'unavailable' }, 503)
          await verifyEmail()
          return json({ ok: true })
        }
        return json({ sent: await deliverNewsletter(admin, sendEmail, urls) })
      }
      if (action !== 'subscribe') return json({ code: 'invalid_request' }, 400)
      let body
      try { body = JSON.parse(await readBody(request)) } catch { return json({ code: 'invalid_request' }, 400) }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ code: 'invalid_request' }, 400)
      if (body.website) return json({ ok: true })
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
      const local = email.split('@')[0]
      const longDomainLabel = email.split('@')[1]?.split('.').some(label => label.length > 63)
      if (email.length > 254 || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..') || longDomainLabel || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email)) return json({ code: 'invalid_email' }, 422)
      const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ipSalt}:${ip}`))
      const ipHash = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('')
      const saved = await admin.rpc('newsletter_subscribe', { p_email: email, p_locale: normalizedLocale(body.locale), p_ip_hash: ipHash })
      if (saved.error) return json({ code: saved.error.message?.includes('NEWSLETTER_RATE_LIMIT') ? 'rate_limited' : 'unavailable' }, saved.error.message?.includes('NEWSLETTER_RATE_LIMIT') ? 429 : 503)
      // A durable receipt is the success boundary. The scheduled worker retries
      // SMTP failures even if the visitor closes this page immediately.
      if (saved.data?.queued) {
        try { await deliverNewsletter(admin, sendEmail, urls, saved.data.id) } catch { /* lease expires for scheduler retry */ }
      }
      return json({ ok: true })
    } catch { return json({ code: 'unavailable' }, 503) }
  }
}
