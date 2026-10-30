import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { PAST_PROJECTS, pastProjectHeroMedia } from '../../home-app/src/data/pastProjectsContent.js'
import { coverSrcSet, heroSrcSet } from '../../home-app/src/lib/responsiveImage.js'

function webpSize(file) {
  const bytes = fs.readFileSync(file)
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
  for (let offset = 12; offset + 8 < bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4)
    const size = bytes.readUInt32LE(offset + 4)
    const start = offset + 8
    if (type === 'VP8 ') return { width: bytes.readUInt16LE(start + 6) & 0x3fff, height: bytes.readUInt16LE(start + 8) & 0x3fff }
    if (type === 'VP8X') return { width: bytes.readUIntLE(start + 4, 3) + 1, height: bytes.readUIntLE(start + 7, 3) + 1 }
    if (type === 'VP8L') {
      const dimensions = bytes.readUInt32LE(start + 1)
      return { width: (dimensions & 0x3fff) + 1, height: ((dimensions >>> 14) & 0x3fff) + 1 }
    }
    offset = start + size + (size & 1)
  }
  assert.fail(`No WebP image dimensions in ${file}`)
}

test('selected project heroes remain selected even when a gallery drawing is wider', () => {
  const selected = { src: '/selected-photo.webp', width: 1920, height: 1080 }
  assert.deepEqual(pastProjectHeroMedia({
    hero: selected.src, heroWidth: selected.width, heroHeight: selected.height,
    images: [{ src: '/wide-plan.jpg', width: 3300, height: 2550 }],
  }), selected)
  assert.deepEqual(pastProjectHeroMedia({
    cover: '/small-cover.jpg', width: 720, height: 480,
    images: [{ src: '/wide-plan.jpg', width: 3300, height: 2550 }],
  }), { src: '/wide-plan.jpg', width: 3300, height: 2550 })
})

test('all nine project collages ship matching responsive images without obsolete photo attribution', () => {
  assert.equal(PAST_PROJECTS.length, 9)
  assert.equal(new Set(PAST_PROJECTS.map(project => project.cover)).size, 9)
  for (const project of PAST_PROJECTS) {
    assert.equal(pastProjectHeroMedia(project).src, project.cover)
    assert.equal(project.photo, undefined, 'a collage must not inherit the prior regional photo author or license')
    const original = webpSize(new URL(`../../public${project.cover}`, import.meta.url))
    assert.deepEqual(original, { width: project.width, height: project.height }, 'intrinsic dimensions must describe the selected collage')
    const card = coverSrcSet(project.cover, project.width)
    const hero = heroSrcSet(project.hero, project.heroWidth)
    assert.match(card, /-480\.webp 480w/)
    assert.match(hero, /-960\.webp 960w/)
    assert.doesNotMatch(hero, /480w/)
    for (const candidate of card.split(', ')) {
      const [src, descriptor] = candidate.split(' ')
      const file = new URL(`../../public${src}`, import.meta.url)
      assert.ok(fs.existsSync(file), src)
      const size = webpSize(file)
      assert.equal(size.width, Number.parseInt(descriptor, 10), src)
      assert.ok(Math.abs(size.height - Math.round(original.height * size.width / original.width)) <= 1, 'responsive images preserve the collage proportions')
    }
    assert.ok(project.images.length > 0, 'original project gallery remains available')
  }
})
