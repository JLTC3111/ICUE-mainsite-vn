import { normalizeUiLocale, SITES, withLocale } from '../site-routes/mainSitePaths.js'

const copy = {
  vi: { label: 'Nhân viên', title: 'Đăng nhập nhân viên', link: 'Đăng nhập nhân viên và quản lý trò chuyện', description: 'Đăng nhập để quản lý và trả lời các cuộc trò chuyện với khách trên website.' },
  en: { label: 'Staff', title: 'Staff sign-in', link: 'Staff login and chat management', description: 'Sign in to manage and reply to visitor conversations in the ICUE support inbox.' },
  de: { label: 'Team', title: 'Mitarbeiter-Anmeldung', link: 'Mitarbeiter-Anmeldung und Chatverwaltung', description: 'Melden Sie sich an, um Besuchergespräche im ICUE-Support-Postfach zu verwalten und zu beantworten.' },
  fr: { label: 'Équipe', title: 'Connexion du personnel', link: 'Connexion du personnel et gestion des conversations', description: 'Connectez-vous pour gérer les conversations des visiteurs et y répondre dans la messagerie ICUE.' },
  ko: { label: '직원', title: '직원 로그인', link: '직원 로그인 및 채팅 관리', description: '로그인하여 ICUE 지원 받은편지함에서 방문자와의 대화를 관리하고 답변하세요.' },
  ja: { label: 'スタッフ', title: 'スタッフログイン', link: 'スタッフログインとチャット管理', description: 'ログインして、ICUEサポート受信箱で訪問者との会話を管理し、返信できます。' },
}

export function staffPortalCopy(locale = 'vi') {
  return copy[normalizeUiLocale(locale, 'vi')]
}

/** The English home is on a separate host; staff use the main site's portal. */
export function staffPortalUrl(locale = 'vi', hostname = typeof window === 'undefined' ? '' : window.location.hostname) {
  const host = String(hostname || '').toLowerCase()
  const origin = host === 'en.icue.vn' || host.endsWith('.en.icue.vn') ? SITES.vi : ''
  return withLocale(`${origin}/newsroom/portal?mode=staff`, normalizeUiLocale(locale, 'vi'))
}
