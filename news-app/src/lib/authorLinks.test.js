import test from 'node:test'
import assert from 'node:assert/strict'
import { getStructureAuthorProfile, resolveAuthorLinkTarget } from './authorLinks.js'

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
