export const IMPORTANT_PHRASE_STYLES = Object.freeze({
  finding: Object.freeze({ bold: true, color: '#059669', highlight: '#bbf7d0' }),
  recommendation: Object.freeze({ bold: true, underline: true, color: '#2563eb', highlight: '#bfdbfe' }),
  risk: Object.freeze({ bold: true, color: '#ea580c', highlight: '#fed7aa' }),
  statistic: Object.freeze({ bold: true, highlight: '#fef08a' }),
  deadline: Object.freeze({ bold: true, underline: true, color: '#dc2626', highlight: '#fef08a' }),
  quote: Object.freeze({ italic: true, color: '#7c3aed', highlight: '#fbcfe8' }),
})

const FINDING_RE = /(kết quả|phát hiện|cho thấy|chỉ ra|đáng chú ý|quan trọng|tác động|xu hướng|results?|findings?|shows?|indicates?|notably|significant|impact|trend|assessment|assessing|evaluation|evaluated|focused on|highlighted|emphasized|identified|concluded|acknowledged|ergebnis|ergebnisse|feststellung|zeigt|zeigen|bedeutsam|auswirkung|bewertung|bewertet|konzentrierte sich|konzentriert sich|betonte|hervorgehoben|stellte fest|résultat|résultats|constat|montre|montrent|indique|notamment|important|impact|évaluation|évalué|s['’]est concentré|se concentre|souligné|mise en évidence|résultats?|結果|調査|判明|示して|重要|影響|傾向|결과|조사|밝혀|보여|중요|영향|추세)/iu
const RECOMMENDATION_RE = /(khuyến nghị|đề xuất|cần ưu tiên|cần phải|nên|phải|ưu tiên|giải pháp|recommend|should|must|priority|action required|proposal|requested|called for|urged|ensure|proposed|empfehl|sollte|muss|priorität|maßnahme|\bbat\b|forderte|aufforder|berücksichtigen|sicherzustellen|vorgeschlagen|recommand|devrait|doit|priorité|mesure|demandé|proposé|prendre en compte|garantir|afin de|推奨|必要|すべき|優先|対策|권고|필요|해야|우선|대책)/iu
const RISK_RE = /(rủi ro|cảnh báo|khẩn cấp|nghiêm trọng|thách thức|đe dọa|risk|warning|urgent|critical|challenge|threat|risiko|warnung|dringend|kritisch|herausforderung|risque|alerte|urgent|critique|défis?(?!\p{L})|menace|リスク|警告|緊急|深刻|課題|脅威|위험|경고|긴급|심각|과제|위협)/iu
const DEADLINE_SIGNAL_RE = /(thời hạn|hạn chót|trước ngày|đến năm|deadline|due by|no later than|by the end of|frist|spätestens|bis zum|date limite|au plus tard|d'ici|期限|までに|마감|기한|까지)/iu
const DATE_RE = /(?:\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:19|20)\d{2}\b|\b(?:q[1-4]|quý\s*[1-4])\s*(?:19|20)\d{2}\b)/iu
const STATISTIC_RE = /(?:[$€£¥₫₩]\s*\d[\d.,\s]*|\d[\d.,\s]*\s*(?:%|％|phần trăm|percent|triệu|tỷ|nghìn|million|billion|thousand|mio\.?|milliarden?|millionen?|millions?|milliards?|万|億|兆|만|억|조|ha|km²|tấn|tonnes?|tons?|kg|mw|gw|kwh|mwh|gwh))(?=$|[\s.,;:!?。！？)])/iu

const MIN_PHRASE_LENGTH = 8
const MAX_PHRASE_LENGTH = 260

function trimmedRange(text, start, end) {
  while (start < end && /\s/u.test(text[start])) start += 1
  while (end > start && /\s/u.test(text[end - 1])) end -= 1
  return { start, end }
}

function chooseNonOverlapping(candidates, maxRanges) {
  const selected = []
  const ranked = [...candidates].sort((a, b) => (
    b.score - a.score
    || (a.end - a.start) - (b.end - b.start)
    || a.start - b.start
  ))

  for (const candidate of ranked) {
    if (selected.length >= maxRanges) break
    const overlaps = selected.some((range) => (
      candidate.start < range.end && candidate.end > range.start
    ))
    if (!overlaps) selected.push(candidate)
  }

  return selected.sort((a, b) => a.start - b.start)
}

/** Split translated report prose into usable ranges without highlighting a whole long paragraph. */
function candidateSegments(source) {
  const segments = []
  const sentences = source.matchAll(/[^.!?。！？;\n]+(?:[.!?。！？;]+|$)/gu)

  for (const sentence of sentences) {
    const sentenceStart = sentence.index ?? 0
    const sentenceRange = trimmedRange(
      source,
      sentenceStart,
      sentenceStart + sentence[0].length,
    )

    if (sentenceRange.end - sentenceRange.start <= MAX_PHRASE_LENGTH) {
      segments.push(sentenceRange)
      continue
    }

    // Machine-translated report sentences are often much longer than their
    // Vietnamese source. Break only those long sentences at clause boundaries.
    for (const clause of sentence[0].matchAll(/[^,，:：]+(?:[,，:：]+|$)/gu)) {
      const clauseStart = sentenceStart + (clause.index ?? 0)
      segments.push(trimmedRange(source, clauseStart, clauseStart + clause[0].length))
    }
  }

  return segments
}

/**
 * Detect report phrases worth emphasizing without sending article text away.
 * The result is deterministic and language-aware for the newsroom locales.
 */
export function detectImportantPhraseRanges(text, { maxRanges = 12 } = {}) {
  const source = String(text || '')
  if (!source.trim() || maxRanges <= 0) return []

  const candidates = []
  for (const range of candidateSegments(source)) {
    const phrase = source.slice(range.start, range.end)
    if (phrase.length < MIN_PHRASE_LENGTH || phrase.length > MAX_PHRASE_LENGTH) continue

    const hasFinding = FINDING_RE.test(phrase)
    const hasRecommendation = RECOMMENDATION_RE.test(phrase)
    const hasRisk = RISK_RE.test(phrase)
    const hasStatistic = STATISTIC_RE.test(phrase)
    const hasDeadline = DEADLINE_SIGNAL_RE.test(phrase) && DATE_RE.test(phrase)
    const score = (hasFinding ? 4 : 0)
      + (hasRecommendation ? 5 : 0)
      + (hasRisk ? 5 : 0)
      + (hasStatistic ? 3 : 0)
      + (hasDeadline ? 5 : 0)

    if (score < 3) continue

    let kind = 'statistic'
    if (hasDeadline) kind = 'deadline'
    else if (hasRisk) kind = 'risk'
    else if (hasRecommendation) kind = 'recommendation'
    else if (hasFinding) kind = 'finding'

    candidates.push({ ...range, kind, score })
  }

  for (const match of source.matchAll(/"([^"\n]{8,180})"|“([^”\n]{8,180})”|‘([^’\n]{8,180})’/gu)) {
    const quoted = match[1] || match[2] || match[3]
    const quoteOffset = match[0].indexOf(quoted)
    const start = (match.index ?? 0) + quoteOffset
    candidates.push({ start, end: start + quoted.length, kind: 'quote', score: 8 })
  }

  return chooseNonOverlapping(candidates, maxRanges)
}
