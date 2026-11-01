import test from 'node:test'
import assert from 'node:assert/strict'
import { React, act, create, sourceModule, silenceRenderer, unmount } from '../../shared/resilience/testHarness.js'

const row = (id, fields = {}) => ({
  id, name: `Publisher ${id}`, focusKey: id,
  url: `https://${id}.example/`, logo: `/newsroom/publications/${id}-logo.svg`,
  previewImage: `/newsroom/publications/${id}-preview.webp`,
  previewSource: `https://${id}.example/about`, logoSource: `https://${id}.example/brand`,
  language: 'vi', ...fields,
})

async function fixture(t, partners = [row('one'), row('two')], related = [row('three')]) {
  silenceRenderer(t)
  const { default: Directory } = await sourceModule('news-app/src/components/NewsroomPublications.jsx', {
    imports: {
      'react-i18next': { useTranslation: () => ({ t: (key, values) => values?.name ? `${key}: ${values.name}` : key }) },
      '../data/newsroomPublications': { NEWSROOM_PARTNERS: partners, RELATED_PUBLICATIONS: related },
    },
  })
  let renderer
  await act(async () => { renderer = create(React.createElement(Directory)) })
  t.after(() => unmount(renderer))
  return {
    renderer,
    buttons: () => renderer.root.findAllByType('button'),
    previews: () => renderer.root.findAllByType('img').filter(image => image.props.src.includes('-preview')),
    async click(index) { await act(async () => { renderer.root.findAllByType('button')[index].props.onClick() }) },
  }
}

test('publication previews start closed and expand exclusively across both directory groups', async t => {
  const f = await fixture(t)
  assert.equal(f.buttons().length, 3)
  assert.equal(f.previews().length, 0, 'closed panels do not mount or request preview media')
  for (const button of f.buttons()) {
    assert.equal(button.props.type, 'button', 'native buttons provide keyboard activation')
    assert.equal(button.props['aria-expanded'], false)
    assert.ok(button.props['aria-label'].includes('publicationDirectory.expandPreview'))
    const region = f.renderer.root.findByProps({ id: button.props['aria-controls'] })
    assert.equal(region.props['aria-labelledby'], button.props.id)
    assert.equal(region.props.hidden, true)
    assert.equal(button.findAllByType('a').length, 0, 'toggle buttons contain no nested links')
  }
  await f.click(0)
  assert.equal(f.buttons()[0].props['aria-expanded'], true)
  assert.ok(f.buttons()[0].props['aria-label'].includes('publicationDirectory.collapsePreview'))
  assert.equal(f.previews().length, 1)
  assert.equal(f.previews()[0].props.src, '/newsroom/publications/one-preview.webp')
  assert.equal(f.previews()[0].props.loading, 'lazy')
  await f.click(2)
  assert.equal(f.buttons()[0].props['aria-expanded'], false)
  assert.equal(f.buttons()[2].props['aria-expanded'], true)
  assert.equal(f.previews().length, 1)
  assert.equal(f.previews()[0].props.src, '/newsroom/publications/three-preview.webp')
  await f.click(2)
  assert.ok(f.buttons().every(button => button.props['aria-expanded'] === false))
  assert.equal(f.previews().length, 0)
})

test('expanded publication details show attributed sources and safe independent outbound links', async t => {
  const f = await fixture(t, [row('one', { previewCredit: 'Publisher image credit' })], [])
  await f.click(0)
  const links = f.renderer.root.findAllByType('a')
  assert.equal(links.length, 4)
  for (const link of links) {
    assert.equal(new URL(link.props.href).protocol, 'https:')
    assert.equal(link.props.target, '_blank')
    assert.equal(link.props.rel, 'noopener noreferrer')
  }
  assert.ok(links.some(link => link.props.href === 'https://one.example/about'))
  assert.ok(links.some(link => link.props.href === 'https://one.example/brand'))
  const callToAction = links.find(link => link.props['aria-label'])
  assert.equal(callToAction.props['aria-label'], 'publicationDirectory.visitLabel: Publisher one')
  const rendered = JSON.stringify(f.renderer.toJSON())
  assert.ok(rendered.includes('publicationDirectory.languages.vi'))
  assert.ok(rendered.includes('Publisher image credit'))
  assert.ok(rendered.includes('one.example'))
})

test('failed or unavailable publication media keeps a readable named entry and website access', async t => {
  const f = await fixture(t, [row('one')], [])
  const logo = f.renderer.root.findByType('img')
  assert.equal(logo.props.alt, 'publicationDirectory.logoAlt: Publisher one')
  await act(async () => { logo.props.onError() })
  assert.equal(f.renderer.root.findAllByType('img').length, 0)
  assert.ok(JSON.stringify(f.renderer.toJSON()).includes('Publisher one'))
  await f.click(0)
  await act(async () => { f.previews()[0].props.onError() })
  assert.equal(f.previews().length, 0)
  const fallback = f.renderer.root.findByProps({ role: 'status' })
  assert.equal(fallback.findByType('p').children.join(''), 'publicationDirectory.previewUnavailable')
  assert.ok(f.renderer.root.findAllByType('a').some(link => link.props.href === 'https://one.example/'))
  const missing = await fixture(t, [row('missing', { logo: undefined, previewImage: undefined, language: undefined })], [])
  await missing.click(0)
  assert.equal(missing.renderer.root.findAllByType('img').length, 0)
  assert.ok(JSON.stringify(missing.renderer.toJSON()).includes('publicationDirectory.languages.multiple'))
  assert.equal(missing.renderer.root.findByProps({ role: 'status' }).findByType('p').children.join(''), 'publicationDirectory.previewUnavailable')
})
