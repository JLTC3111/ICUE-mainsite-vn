import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findArticleDirectoryMentions,
  getEmployeeById,
  getStructureAuthorProfile,
  resolveAuthorLinkTarget,
} from './authorLinks.js'

test('verified staff bylines resolve to their exact structure profiles', () => {
  assert.deepEqual(resolveAuthorLinkTarget('Nguyễn Hồng Hạnh'), {
    type: 'structure-profile',
    profileId: 'hanh',
  })
  assert.deepEqual(resolveAuthorLinkTarget('TS. KTS Trần Thị Lan Anh'), {
    type: 'structure-profile',
    profileId: 'lan-anh',
  })
})

test('unicode form, case and harmless spacing do not break exact matching', () => {
  assert.deepEqual(resolveAuthorLinkTarget('  NGUYỄN HỒNG HẠNH  '), {
    type: 'structure-profile',
    profileId: 'hanh',
  })
  assert.deepEqual(resolveAuthorLinkTarget('Organisation / Company'), { type: 'people' })
})

test('localized People names resolve to the same individual Structure profile', () => {
  assert.deepEqual(resolveAuthorLinkTarget('Nguyen Hong Hanh'), {
    type: 'structure-profile',
    profileId: 'hanh',
  })
  assert.equal(getEmployeeById('nguyen-hong-hanh')?.structureProfileId, 'hanh')
})

test('generic ICUE bylines resolve to the people page', () => {
  assert.deepEqual(resolveAuthorLinkTarget('Admin'), { type: 'people' })
  assert.deepEqual(resolveAuthorLinkTarget('icue'), { type: 'people' })
  assert.deepEqual(resolveAuthorLinkTarget('Organisation/Compnay'), { type: 'people' })
})

test('misspelled names and unknown organisations stay unlinked', () => {
  assert.equal(resolveAuthorLinkTarget('Nguyễn Hồng Hạhn'), null)
  assert.equal(resolveAuthorLinkTarget('GreenViet'), null)
})

test('verified structure profiles expose compact hover-card details', () => {
  assert.deepEqual(getStructureAuthorProfile('hanh'), {
    id: 'hanh',
    name: 'Nguyễn Hồng Hạnh',
    names: ['Nguyễn Hồng Hạnh'],
    photo: 'hanhnguyenorgstructure.png',
    title: {
      vi: 'Viện Trưởng',
      en: 'Director',
      de: 'Direktorin',
      fr: 'Directrice',
      ko: '원장',
      ja: '所長',
    },
  })
  assert.equal(getStructureAuthorProfile('not-a-profile'), null)
})

test('article text detection finds exact employee names without partial-word false positives', () => {
  const mentions = findArticleDirectoryMentions(
    'Nguyen Hong Hanh met Nguyễn Thị Ly. Nguyen Hong Hanhson did not attend.',
  )

  assert.deepEqual(
    mentions.filter((mention) => mention.kind === 'employee').map((mention) => mention.employee.id),
    ['nguyen-hong-hanh', 'nguyen-thi-ly'],
  )
})

test('general People terms are detected across every supported locale', () => {
  const samples = [
    ['vi', 'các chuyên gia'],
    ['en', 'advisory team'],
    ['de', 'Beratungsteam'],
    ['fr', 'équipe de conseil'],
    ['ko', '전문가들이 참여했습니다'],
    ['ja', '専門家が参加しました'],
  ]

  for (const [locale, sample] of samples) {
    const mention = findArticleDirectoryMentions(sample).find((item) => item.kind === 'people')
    assert.equal(mention?.locale, locale, sample)
  }
})

test('general Latin People terms still require real word boundaries', () => {
  assert.equal(findArticleDirectoryMentions('membership expertise').length, 0)
})
