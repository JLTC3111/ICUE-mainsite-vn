import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { detectImportantPhraseRanges, IMPORTANT_PHRASE_STYLES } from './importantPhrases.js'

test('detects Vietnamese findings, recommendations, risks, and statistics', () => {
  const text = [
    'Kết quả khảo sát cho thấy 68% hộ gia đình đã giảm lượng rác thải.',
    'Khuyến nghị cần ưu tiên đầu tư hệ thống quan trắc trong năm 2027.',
    'Rủi ro nghiêm trọng nhất là suy giảm 25% diện tích sinh cảnh.',
  ].join(' ')

  const ranges = detectImportantPhraseRanges(text)
  assert.deepEqual(ranges.map((range) => range.kind), ['finding', 'recommendation', 'risk'])
  assert.match(text.slice(ranges[0].start, ranges[0].end), /Kết quả/u)
})

test('uses quotation styling and ignores ordinary report prose', () => {
  const text = 'Nhóm nghiên cứu đã họp vào buổi sáng. “Phục hồi hệ sinh thái là ưu tiên chung” được các bên thống nhất.'
  const ranges = detectImportantPhraseRanges(text)

  assert.equal(ranges.length, 1)
  assert.equal(ranges[0].kind, 'quote')
  assert.equal(text.slice(ranges[0].start, ranges[0].end), 'Phục hồi hệ sinh thái là ưu tiên chung')
  assert.equal(IMPORTANT_PHRASE_STYLES.quote.italic, true)
})

test('keeps Magic UI underline and highlight treatments mutually exclusive', () => {
  assert.equal(IMPORTANT_PHRASE_STYLES.finding.highlight, '#bbf7d0')
  assert.equal(IMPORTANT_PHRASE_STYLES.finding.underline, undefined)
  assert.equal(IMPORTANT_PHRASE_STYLES.recommendation.underline, true)
  assert.equal(IMPORTANT_PHRASE_STYLES.recommendation.highlight, undefined)
  assert.equal(IMPORTANT_PHRASE_STYLES.deadline.underline, true)
  assert.equal(IMPORTANT_PHRASE_STYLES.deadline.highlight, undefined)
})

test('limits overlapping and excessive matches', () => {
  const text = 'Kết quả quan trọng cho thấy 75% diện tích được bảo vệ. Rủi ro nghiêm trọng có thể làm giảm 30% sản lượng.'
  const ranges = detectImportantPhraseRanges(text, { maxRanges: 1 })
  assert.equal(ranges.length, 1)
})

test('detects a standalone percentage as a statistic', () => {
  const text = 'Khoảng 42% số người tham gia đồng ý.'
  const ranges = detectImportantPhraseRanges(text)
  assert.equal(ranges[0]?.kind, 'statistic')
})

test('detects important report phrases in every newsroom locale', () => {
  const samples = [
    'Kết quả cho thấy 64% khu vực đã phục hồi.',
    'The findings show that 64% of the area has recovered.',
    'Die Ergebnisse zeigen, dass 64% der Fläche wiederhergestellt sind.',
    'Les résultats montrent que 64% de la zone a été restaurée.',
    '調査結果は、地域の64％が回復したことを示しています。',
    '조사 결과는 해당 지역의 64%가 회복되었음을 보여 줍니다.',
  ]

  for (const sample of samples) {
    assert.equal(detectImportantPhraseRanges(sample)[0]?.kind, 'finding', sample)
  }
})

test('recognizes the longer English, German, and French phrasing used in translated reports', () => {
  const samples = [
    "The report focused on assessing the current status of the province's urban system development, the state of technical infrastructure, digital infrastructure, and transformation efforts in urban management, while establishing priorities for a coherent and sustainable development program for the next planning period.",
    'Der Bericht konzentrierte sich auf die Bewertung des aktuellen Entwicklungsstands des städtischen Systems der Provinz, des Zustands der technischen Infrastruktur, der digitalen Infrastruktur sowie der digitalen Transformation im Stadtmanagement und beschrieb außerdem die nächsten Arbeitsschritte für die neue Planungsphase.',
    "Le rapport s'est concentré sur l'évaluation de l'état actuel du développement du système urbain de la province, des infrastructures techniques, des infrastructures numériques et des efforts de transformation dans la gestion urbaine, tout en définissant les priorités de la prochaine phase de planification.",
  ]

  for (const sample of samples) {
    const ranges = detectImportantPhraseRanges(sample)
    assert.ok(ranges.some((range) => range.kind === 'finding'), sample)
  }
})

test('provides a localized empty-state message for every newsroom locale', () => {
  const locales = ['vi', 'en', 'de', 'fr', 'ja', 'ko']
  const messages = locales.map((locale) => {
    const path = new URL(`../locales/${locale}.json`, import.meta.url)
    return JSON.parse(readFileSync(path, 'utf8')).editor.smartHighlightNone
  })

  assert.ok(messages.every((message) => typeof message === 'string' && message.trim()))
  assert.equal(new Set(messages).size, locales.length)
})
