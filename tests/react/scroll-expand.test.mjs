import test from 'node:test'
import assert from 'node:assert/strict'
import { React, act, create, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

test('Scroll Expand shows its instruction until scrolling expands the image without moving the document', async t => {
  silenceRenderer(t)
  let top = 0
  let scrollCalls = 0
  const nodes = new Map()
  const window = Object.assign(new EventTarget(), {
    innerHeight: 1000,
    matchMedia: () => ({ matches: false }),
    scrollTo: () => { scrollCalls++ },
  })
  const document = { documentElement: { dataset: {} } }
  class ResizeObserver { observe() {} disconnect() {} }
  const { default: ScrollExpand } = await sourceModule('home-app/src/components/reactbits/ScrollExpand.jsx', {
    globals: { window, document, ResizeObserver },
  })
  let renderer
  await act(async () => {
    renderer = create(React.createElement(ScrollExpand, {
      src: '/project.jpg',
      mediaTitle: 'Illustrative photograph — Photographer (CC BY-SA 4.0)',
      scrollHint: 'Cuộn xuống để mở rộng hình ảnh',
      useWindowScroll: true,
      smoothing: 0,
      scrollDistance: 0.8,
      holdDistance: 0.2,
    }, React.createElement('a', { href: 'https://example.com/photo' }, 'Photo source')), { createNodeMock: ({ props }) => {
      const node = { style: {}, clientHeight: 1000, getBoundingClientRect: () => ({ top }) }
      nodes.set(props.className?.trim(), node)
      return node
    } })
  })
  const hint = renderer.root.findByProps({ className: 'scroll-expand__hint' })
  assert.equal(hint.findByType('span').children[0], 'Cuộn xuống để mở rộng hình ảnh')
  assert.equal(hint.findByType('svg').props['aria-hidden'], 'true')
  assert.equal(renderer.root.findByType('img').props.title, 'Illustrative photograph — Photographer (CC BY-SA 4.0)')
  assert.equal(nodes.get('scroll-expand__hint').style.opacity, '1')
  assert.equal(nodes.get('scroll-expand__overlay').style.visibility, 'hidden', 'invisible credit links cannot receive keyboard focus')
  assert.equal(nodes.get('scroll-expand__track').style.height, '2000px')
  assert.equal(scrollCalls, 0)

  top = -100
  await act(async () => window.dispatchEvent(new Event('scroll')))
  assert.equal(nodes.get('scroll-expand__hint').style.opacity, '0', 'the cue clears after visitors start expanding the image')
  assert.equal(nodes.get('scroll-expand__track').style.height, '2000px', 'guidance does not alter scroll geometry')
  assert.equal(scrollCalls, 0, 'the cue leaves document scrolling under user control')

  top = -800
  await act(async () => window.dispatchEvent(new Event('scroll')))
  assert.equal(nodes.get('scroll-expand__overlay').style.visibility, 'visible', 'credits become available with the visible overlay')
  await unmount(renderer)
})
