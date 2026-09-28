import { normalizeForSearch } from './matching.js'

// Exact, short follow-ups only. Explicit new questions still go through retrieval.
export const FOLLOW_UPS = {
  vi: {
    documents: ['cần giấy tờ gì', 'cần hồ sơ gì', 'cần chuẩn bị gì', 'còn hồ sơ thì sao'],
    timeline: ['mất bao lâu', 'bao lâu thì xong', 'còn thời gian thì sao'],
    pricing: ['chi phí bao nhiêu', 'giá bao nhiêu', 'còn chi phí thì sao'],
    process: ['bắt đầu thế nào', 'bước tiếp theo là gì'],
    location: ['ở đâu', 'địa điểm ở đâu'],
    scale: ['quy mô bao nhiêu', 'diện tích bao nhiêu'],
    requirements: ['yêu cầu là gì', 'cần kỹ năng gì'],
  },
  en: {
    documents: ['what documents', 'which documents', 'what documents do I need', 'what should I prepare', 'and the paperwork'],
    timeline: ['how long', 'how long does it take', 'and the timeline', 'what about the timeline'],
    pricing: ['how much', 'how much does it cost', 'and the cost', 'what about the cost'],
    process: ['how do we start', 'what is the next step', 'what next'],
    location: ['where is it', 'where is it located', 'where'],
    scale: ['how big is it', 'what is its area', 'what is the scale'],
    requirements: ['what are the requirements', 'what skills do I need'],
  },
  de: {
    documents: ['welche Unterlagen', 'welche Dokumente brauche ich', 'was soll ich vorbereiten'],
    timeline: ['wie lange', 'wie lange dauert es', 'und die Dauer'],
    pricing: ['wie viel kostet es', 'und die Kosten', 'was kostet das'],
    process: ['wie fangen wir an', 'was ist der nächste Schritt'],
    location: ['wo ist das', 'wo befindet es sich'],
    scale: ['wie groß ist es', 'wie groß ist die Fläche'],
    requirements: ['welche Anforderungen gibt es', 'welche Fähigkeiten brauche ich'],
  },
  fr: {
    documents: ['quels documents', 'quels documents faut-il', 'que dois-je préparer'],
    timeline: ['combien de temps', 'combien de temps cela prend', 'et le délai'],
    pricing: ['combien ça coûte', 'et le coût', 'quel est le prix'],
    process: ['comment commencer', 'quelle est la prochaine étape'],
    location: ['où est-ce', 'où se trouve le projet'],
    scale: ['quelle superficie', 'quelle est la taille'],
    requirements: ['quelles sont les exigences', 'quelles compétences faut-il'],
  },
  ko: {
    documents: ['어떤 서류가 필요한가요', '무엇을 준비해야 하나요'],
    timeline: ['얼마나 걸리나요', '기간은요'],
    pricing: ['비용은요', '얼마인가요'],
    process: ['어떻게 시작하나요', '다음 단계는 무엇인가요'],
    location: ['어디에 있나요', '위치는 어디인가요'],
    scale: ['면적은 얼마인가요', '규모는요'],
    requirements: ['자격 요건은 무엇인가요', '어떤 기술이 필요한가요'],
  },
  ja: {
    documents: ['どんな書類が必要ですか', '何を準備すればよいですか'],
    timeline: ['どのくらいかかりますか', '期間は'],
    pricing: ['費用はいくらですか', '料金は'],
    process: ['どう始めればよいですか', '次のステップは'],
    location: ['どこにありますか', '場所は'],
    scale: ['面積はどのくらいですか', '規模は'],
    requirements: ['応募要件は何ですか', '必要なスキルは'],
  },
}

const COPY = {
  vi: { regarding: 'Về {topic}:', missing: 'Mình chưa có thông tin đã xác nhận cho câu hỏi này về {topic}. Bạn có thể kiểm tra trang nguồn hoặc liên hệ ICUE để được làm rõ.' },
  en: { regarding: 'For {topic}:', missing: 'I don’t have confirmed information for that question about {topic}. Please check the source page or contact ICUE for clarification.' },
  de: { regarding: 'Zu {topic}:', missing: 'Für diese Frage zu {topic} liegen mir keine bestätigten Informationen vor. Bitte prüfen Sie die Quellseite oder wenden Sie sich zur Klärung an ICUE.' },
  fr: { regarding: 'Concernant {topic} :', missing: 'Je ne dispose pas d’informations confirmées pour cette question sur {topic}. Consultez la page source ou contactez ICUE pour préciser ce point.' },
  ko: { regarding: '{topic} 관련:', missing: '{topic}에 관한 이 질문에 대해 확인된 정보가 없습니다. 출처 페이지를 확인하거나 ICUE에 문의해 주세요.' },
  ja: { regarding: '{topic}について：', missing: '{topic}のこのご質問について、確認済みの情報がありません。参照ページをご確認いただくか、ICUEにお問い合わせください。' },
}

const SERVICE_TOPICS = new Set([
  'services', 'planning_design', 'project_management', 'supervision', 'permits_legal',
  'documents_required', 'pricing_fees', 'payment_installments', 'process_steps',
  'timeline_duration', 'bim_3d', 'green_sustainability', 'request_proposal', 'schedule_meeting',
])
const SERVICE_TARGETS = { documents: 'documents_required', timeline: 'timeline_duration', pricing: 'pricing_fees', process: 'process_steps' }
export const FAQ_CONTEXT = {
  'services.1': 'services', 'process.1': 'process_steps', 'process.2': 'planning_design',
  'technology.1': 'bim_3d', 'technology.2': 'green_sustainability',
  'clients.1': 'sectors_clients', 'general.1': 'portfolio_projects',
}

export function followUpType(text, language) {
  const query = normalizeForSearch(text)
  return Object.entries(FOLLOW_UPS[language] || {}).find(([, variants]) =>
    variants.some(variant => normalizeForSearch(variant) === query),
  )?.[0] || null
}

/** Only opaque topic IDs are carried between turns; no visitor text is retained. */
export function answerFollowUp(kb, type, context, language, strings) {
  if (!type || context?.language !== language) return null
  const anchor = kb.intents.find(intent => intent.id === context.intentId)
  if (!anchor) return null
  const copy = COPY[language]
  let answer = anchor.facts?.[type]
  let links = anchor.links
  let target = anchor.id
  if (SERVICE_TOPICS.has(anchor.id) && SERVICE_TARGETS[type]) {
    const intent = kb.intents.find(item => item.id === SERVICE_TARGETS[type])
    answer = intent?.answer
    links = intent?.links
    target = intent?.id
  } else if (['documents', 'process'].includes(type)
    && (anchor.id.startsWith('job_') || ['recruitment', 'internship'].includes(anchor.id))) {
    const intent = kb.intents.find(item => item.id === (anchor.id === 'internship' ? 'internship' : 'recruitment'))
    answer = intent?.answer
    links = intent?.links
    target = intent?.id
  }
  const meta = { source: answer ? 'intent' : 'clarification', language, contextIntentId: anchor.id, followUp: type }
  if (answer) meta.intentId = target
  return {
    content: answer
      ? `${copy.regarding.replace('{topic}', anchor.label)}\n\n${answer}`
      : copy.missing.replace('{topic}', anchor.label),
    links: answer ? links || [] : [...(anchor.links || []), { label: strings.contact, url: strings.contactUrl }]
      .filter((link, index, list) => list.findIndex(item => item.url === link.url) === index),
    meta,
    context: { intentId: anchor.id, language },
  }
}
