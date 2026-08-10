import test from 'node:test'
import assert from 'node:assert/strict'
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
