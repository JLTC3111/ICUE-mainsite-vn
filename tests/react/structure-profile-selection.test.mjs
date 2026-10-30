import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { createPortal } = require('react-dom')

async function fixture(t, { width = 1440, profileId = '', query = '', lanyardPending = false, realShimmer = false } = {}) {
  const dom = new JSDOM('<html><body><main></main></body></html>', {
    pretendToBeVisual: true,
    url: `https://vi.icue.vn/structure/${query}`,
  })
  const { window } = dom
  const { document } = window
  const originals = new Map()
  for (const [key, value] of Object.entries({ window, document })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  window.matchMedia = query => ({
    matches: [...query.matchAll(/max-width:\s*(\d+)px/g)].some(match => width <= Number(match[1])),
    addEventListener() {},
    removeEventListener() {},
  })
  let scrollCalls = 0
  window.HTMLElement.prototype.scrollIntoView = () => { scrollCalls++ }
  const route = { profileId, query: new URLSearchParams(query) }
  const fragment = ({ children }) => React.createElement(React.Fragment, null, children)
  const text = ({ as = 'span', children, className }) => React.createElement(as, { className }, children)
  const lanyard = ({ profile, onOpen }) => React.createElement('aside', {
    className: 'employee-lanyard',
    'data-profile-id': profile.id,
  }, React.createElement('button', { type: 'button', onClick: onOpen }, profile.name))
  const imports = {
    '../../../shared/resilience/lazyWithRecovery.jsx': { lazyWithRecovery: React.lazy },
    'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language: 'vi' } }) },
    'react-router-dom': { useParams: () => ({ profileId: route.profileId }), useSearchParams: () => [route.query] },
    'react-dom': { createPortal },
    '../components/PageShell': { default: fragment },
    '../components/DeptIcon': { default: () => null },
    '../components/magicui/InteractiveGridPattern': { InteractiveGridPattern: () => null },
    '../components/magicui/DiaTextReveal': { DiaTextReveal: ({ text }) => text },
    '../components/magicui/WordRotate': { WordRotate: () => null },
    '../components/magicui/RippleButton': { RippleButton: ({ children, rippleColor, duration, ...props }) => React.createElement('button', props, children) },
    '../components/motion-primitives/TransitionPanel': { TransitionPanel: ({ children, activeIndex }) => children[activeIndex] },
    '../../../shared/site-meta/useDocumentMeta': { useDocumentMeta() {} },
    './magicui/AnimatedBeam': { AnimatedBeam: () => null },
    './motion-primitives/TextShimmerWave': { TextShimmerWave: text },
    './motion-primitives/AnimatedGroup': { AnimatedGroup: fragment, animatedGroupCustomVariants2: {} },
    './ProfileCard/ProfileCard': { default: ({ name, title }) => React.createElement('article', null, name, title) },
    '../components/EmployeeLanyard': { default: lanyard },
    '../components/DepartmentsGrid': { default: () => null },
    '../components/LegalDocuments': { default: () => null },
  }
  if (realShimmer) {
    delete imports['./motion-primitives/TextShimmerWave']
    const motionElement = tag => React.forwardRef(({ children, className }, ref) => React.createElement(tag, { ref, className }, children))
    imports['motion/react'] = { motion: { create: motionElement, span: motionElement('span') } }
  }
  const source = await sourceModule('structure-app/src/routes/StructurePage.jsx', {
    imports,
    globals: { window, document, requestAnimationFrame: callback => { callback(); return 1 } },
    env: { BASE_URL: '/structure/' },
    ...(lanyardPending ? { dynamicImport: () => new Promise(() => {}) } : {}),
  })
  const root = createRoot(document.querySelector('main'))
  const render = () => act(async () => root.render(React.createElement(source.default)))
  t.after(async () => {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  await render()
  const click = element => act(async () => element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 })))
  const staff = id => [...document.querySelectorAll('.person-card')].find(button => button.textContent.includes(`orgChart.people.${id}.displayName`))
  const dialog = () => document.querySelector('[role="dialog"]')
  const badge = () => document.querySelector('.employee-lanyard[data-profile-id]')
  return { window, document, route, render, click, staff, dialog, badge, scrollCalls: () => scrollCalls }
}

test('staff selection opens the profile and updates the lanyard together on every viewport', async t => {
  for (const [label, width] of [['desktop', 1440], ['tablet', 1024], ['phone', 390]]) {
    await t.test(label, async t => {
      const f = await fixture(t, { width })
      assert.equal(f.dialog(), null)
      await f.click(f.staff('toan'))
      assert.equal(f.dialog()?.getAttribute('aria-label'), 'orgChart.people.toan.displayName')
      assert.equal(f.badge()?.dataset.profileId, 'toan')
      assert.equal(f.staff('toan').getAttribute('aria-pressed'), 'true')
      assert.equal(f.staff('hanh').getAttribute('aria-pressed'), 'false')
      assert.equal(f.scrollCalls(), 0, 'opening a modal must not scroll the page behind it')
    })
  }
})

test('staff modal does not wait for the lazy lanyard module to load', async t => {
  const f = await fixture(t, { lanyardPending: true })
  await f.click(f.staff('long'))
  assert.equal(f.dialog()?.getAttribute('aria-label'), 'orgChart.people.long.displayName')
  assert.equal(f.document.activeElement, f.dialog().querySelector('.profile-modal-close'))
  assert.equal(f.staff('long').getAttribute('aria-pressed'), 'true')
  assert.equal(f.badge(), null, 'the deliberately unresolved lanyard is still loading')
  const placeholder = f.document.querySelector('.employee-badge-static')
  assert.equal(placeholder.disabled, false)
  assert.ok(placeholder.textContent.includes('orgChart.people.long.displayName'), 'the loading badge already shows the selected staff identity')
  await f.click(f.dialog().querySelector('.profile-modal-close'))
  await f.click(placeholder)
  assert.equal(f.dialog()?.getAttribute('aria-label'), 'orgChart.people.long.displayName', 'the loading badge remains a usable profile action')
  assert.equal(f.scrollCalls(), 0)
})

test('deep links and repeated staff activation retain the selected badge after modal dismissal', async t => {
  const f = await fixture(t, { profileId: 'hanh', query: '?profile=toan' })
  assert.equal(f.dialog()?.getAttribute('aria-label'), 'orgChart.people.hanh.displayName', 'route profile takes precedence over query profile')
  assert.equal(f.badge()?.dataset.profileId, 'hanh')
  await f.click(f.dialog().querySelector('.profile-modal-close'))
  assert.equal(f.dialog(), null)
  assert.equal(f.badge()?.dataset.profileId, 'hanh')

  const trigger = f.staff('long')
  assert.equal(trigger.tagName, 'BUTTON')
  assert.equal(trigger.type, 'button')
  assert.equal(trigger.tabIndex, 0, 'staff selection retains native keyboard button behavior')
  assert.equal(trigger.getAttribute('aria-haspopup'), 'dialog')
  await act(async () => trigger.focus())
  await act(async () => trigger.click())
  assert.equal(f.dialog()?.getAttribute('aria-label'), 'orgChart.people.long.displayName')
  assert.equal(f.badge()?.dataset.profileId, 'long')
  await f.click(f.dialog().querySelector('.profile-modal-close'))
  assert.equal(f.dialog(), null)
  assert.equal(f.document.activeElement, trigger)
  assert.equal(f.badge()?.dataset.profileId, 'long')
  await act(async () => trigger.click())
  assert.equal(f.dialog()?.getAttribute('aria-label'), 'orgChart.people.long.displayName', 'an already selected staff member can reopen their profile')

  await f.click(f.dialog().querySelector('.profile-modal-close'))
  f.route.profileId = ''
  await f.render()
  assert.equal(f.dialog()?.getAttribute('aria-label'), 'orgChart.people.toan.displayName')
  assert.equal(f.badge()?.dataset.profileId, 'toan', 'query deep links continue to synchronize both views')
})

test('staff accessible name stays complete while hover and focus replace shimmer text nodes', async t => {
  const f = await fixture(t, { realShimmer: true })
  const trigger = f.staff('toan')
  const label = trigger.getAttribute('aria-label')
  assert.ok(label?.includes('orgChart.people.toan.displayName'))
  assert.ok(label.includes('orgChart.people.toan.title'))
  const initialNameNode = trigger.querySelector('.person-card__name')
  assert.equal(trigger.querySelectorAll('.text-shimmer-wave__char').length, 0)

  await act(async () => trigger.dispatchEvent(new f.window.MouseEvent('mouseover', { bubbles: true })))
  assert.ok(trigger.querySelectorAll('.text-shimmer-wave__char').length > 0, 'the actual shimmer component split the visible text into characters')
  assert.notEqual(trigger.querySelector('.person-card__name'), initialNameNode)
  assert.equal(trigger.getAttribute('aria-label'), label)

  await act(async () => trigger.dispatchEvent(new f.window.MouseEvent('mouseout', { bubbles: true, relatedTarget: f.document.body })))
  assert.equal(trigger.querySelectorAll('.text-shimmer-wave__char').length, 0)
  await act(async () => trigger.focus())
  assert.ok(trigger.querySelectorAll('.text-shimmer-wave__char').length > 0)
  assert.equal(trigger.getAttribute('aria-label'), label, 'assistive technologies receive one stable full label throughout the visual changes')
  await f.click(trigger)
  assert.equal(f.dialog()?.getAttribute('aria-label'), 'orgChart.people.toan.displayName')
  assert.equal(f.badge()?.dataset.profileId, 'toan')
})
