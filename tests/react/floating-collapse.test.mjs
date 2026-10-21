import assert from 'node:assert/strict'
import test from 'node:test'
import { React, act, create, platform, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

async function fixture(t, { compact = false, mode, blockedStorage = false } = {}) {
  silenceRenderer(t)
  const f = platform()
  const storage = new Map(mode ? [['test:collapse', mode]] : [])
  const media = Object.assign(new EventTarget(), { matches: compact })
  const timers = new Map()
  let serial = 0
  f.window.matchMedia = () => media
  f.window.setTimeout = callback => { const id = ++serial; timers.set(id, callback); return id }
  f.window.clearTimeout = id => timers.delete(id)
  const { default: useCollapse } = await sourceModule('shared/ui/useFloatingCollapse.js', {
    globals: { ...f, localStorage: {
      getItem: key => { if (blockedStorage) throw new Error('Storage unavailable'); return storage.get(key) },
      setItem: (key, value) => { if (blockedStorage) throw new Error('Storage unavailable'); storage.set(key, value) },
    } },
  })
  function Widget({ keepOpen = false }) {
    return React.createElement('collapse-fixture', useCollapse({ storageKey: 'test:collapse', keepOpen }))
  }
  const element = props => React.createElement(React.StrictMode, null, React.createElement(Widget, props))
  let renderer
  await act(async () => { renderer = create(element()) })
  const current = () => renderer.root.findByType('collapse-fixture').props
  const idle = () => act(async () => {
    const pending = [...timers.values()]
    timers.clear()
    pending.forEach(callback => callback())
  })
  const resize = matches => act(async () => { media.matches = matches; media.dispatchEvent(new Event('change')) })
  const update = props => act(async () => renderer.update(element(props)))
  return { ...f, renderer, current, idle, resize, update, timers, storage }
}

test('automatic collapse waits for pointer and keyboard use, then yields to manual selection', async t => {
  const f = await fixture(t)
  assert.equal(f.current().collapsed, false)
  assert.equal(f.timers.size, 1, 'Strict Mode leaves one inactivity deadline')
  await f.idle()
  assert.equal(f.current().collapsed, true)
  await act(async () => f.current().interactionProps.onPointerEnter({ pointerType: 'mouse' }))
  assert.equal(f.current().collapsed, true, 'hover keeps the restore button stable until it is clicked')
  await act(async () => f.current().toggle())
  await act(async () => f.current().toggleAutomatic())
  assert.equal(f.current().collapsed, false)
  assert.equal(f.timers.size, 0)
  await act(async () => f.current().interactionProps.onFocusCapture())
  await act(async () => f.current().interactionProps.onPointerLeave())
  assert.equal(f.timers.size, 0, 'keyboard focus holds the widget open after the pointer leaves')
  await act(async () => f.current().interactionProps.onBlurCapture({ currentTarget: { contains: () => true }, relatedTarget: {} }))
  assert.equal(f.timers.size, 0, 'moving focus between controls does not collapse the widget')
  await act(async () => f.current().interactionProps.onBlurCapture({ currentTarget: { contains: () => false }, relatedTarget: null }))
  await f.idle()
  assert.equal(f.current().collapsed, true)
  await act(async () => f.current().toggle())
  assert.equal(f.current().collapsed, false)
  assert.equal(f.current().automatic, false)
  assert.equal(f.storage.get('test:collapse'), 'expanded')
  await f.resize(true)
  await f.idle()
  assert.equal(f.current().collapsed, true, 'compact screens start collapsed independently of desktop expansion')
  await f.resize(false)
  assert.equal(f.current().collapsed, false, 'returning to desktop restores its manual selection')
  await act(async () => f.current().toggle())
  await act(async () => f.current().interactionProps.onPointerEnter({ pointerType: 'mouse' }))
  assert.equal(f.current().collapsed, true, 'hover cannot undo a manual collapse')
  assert.equal(f.storage.get('test:collapse'), 'collapsed')
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('small viewports start collapsed, touch does not hover-expand, and Auto can be restored', async t => {
  const f = await fixture(t, { compact: true })
  assert.equal(f.current().collapsed, true)
  await act(async () => f.current().interactionProps.onPointerEnter({ pointerType: 'touch' }))
  assert.equal(f.current().collapsed, true)
  await act(async () => f.current().toggle())
  assert.equal(f.current().collapsed, false)
  await act(async () => f.current().toggleAutomatic())
  assert.equal(f.current().collapsed, true)
  assert.equal(f.storage.get('test:collapse:compact'), 'auto')
  await f.resize(false)
  assert.equal(f.current().collapsed, false, 'Auto follows a larger viewport')
  await f.idle()
  assert.equal(f.current().collapsed, true)
  await unmount(f.renderer)
})

test('compact defaults ignore desktop expansion and each viewport remembers its own choice', async t => {
  const f = await fixture(t, { compact: true, mode: 'expanded' })
  assert.equal(f.current().collapsed, true)
  assert.equal(f.current().automatic, true)
  await act(async () => f.current().toggle())
  assert.equal(f.current().collapsed, false)
  assert.equal(f.storage.get('test:collapse:compact'), 'expanded')
  assert.equal(f.storage.get('test:collapse'), 'expanded')
  await f.resize(false)
  assert.equal(f.current().collapsed, false)
  await act(async () => f.current().toggle())
  assert.equal(f.storage.get('test:collapse'), 'collapsed')
  await f.resize(true)
  assert.equal(f.current().collapsed, false, 'the explicit compact expansion is restored')
  await f.resize(false)
  assert.equal(f.current().collapsed, true, 'the explicit desktop collapse is restored')
  await unmount(f.renderer)
})

test('saved collapse resumes after a dialog closes and storage failures remain usable', async t => {
  const saved = await fixture(t, { mode: 'collapsed' })
  assert.equal(saved.current().collapsed, true)
  await saved.update({ keepOpen: true })
  assert.equal(saved.current().collapsed, false)
  assert.equal(saved.timers.size, 0)
  await saved.update({ keepOpen: false })
  assert.equal(saved.current().collapsed, true)
  await unmount(saved.renderer)

  const blocked = await fixture(t, { blockedStorage: true })
  await act(async () => blocked.current().toggle())
  assert.equal(blocked.current().collapsed, true)
  await blocked.resize(true)
  await act(async () => blocked.current().toggle())
  assert.equal(blocked.current().collapsed, false)
  await blocked.resize(false)
  assert.equal(blocked.current().collapsed, true, 'desktop choice survives without storage')
  await blocked.resize(true)
  assert.equal(blocked.current().collapsed, false, 'compact choice survives without storage')
  await unmount(blocked.renderer)
})

test('automatic inactivity timers pause with hidden pages and clean up on unmount', async t => {
  const f = await fixture(t)
  await act(async () => { f.document.hidden = true; f.document.dispatchEvent(new Event('visibilitychange')) })
  assert.equal(f.timers.size, 0)
  await act(async () => { f.document.hidden = false; f.document.dispatchEvent(new Event('visibilitychange')) })
  assert.equal(f.timers.size, 1)
  await f.update({ keepOpen: true })
  assert.equal(f.timers.size, 0)
  await f.update({ keepOpen: false })
  assert.equal(f.timers.size, 1)
  await unmount(f.renderer)
  assert.equal(f.timers.size, 0)
})

test('the contact rail keeps its actions out of keyboard navigation when collapsed and preserves music', async t => {
  silenceRenderer(t)
  const f = platform()
  f.window.matchMedia = () => ({ matches: true })
  const storage = new Map([['icue:contact-sidebar:collapse', 'expanded']])
  let musicToggles = 0
  const { default: Sidebar } = await sourceModule('shared/contact-sidebar/ContactSidebar.jsx', {
    globals: { ...f, localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } },
    imports: {
      'react-dom': { createPortal: node => node },
      '../ui/useModalFocus.js': { default() {} },
      '@icue/zalo/zaloLink': { ICUE_ZALO_PHONE: '0', openZaloChat() {}, zaloWebUrl: () => '#' },
      './useCalendarClock': { useCalendarClock: () => ({ month: 'October', day: '14', time: '09:00' }) },
      './useAudioVisualizer': { useAudioVisualizer: () => ({ toggle() { musicToggles++ }, isPlaying: true, isAnimating: true }) },
      './useMusicBarColor': {
        useMusicBarColor: () => '#fff',
        useBackgroundAppearance: () => ({ color: '#fff', overVideo: false }),
      },
    },
  })
  let renderer
  await act(async () => { renderer = create(React.createElement(Sidebar, { locale: 'en' })) })
  const find = className => renderer.root.findByProps({ className })
  assert.equal(find('contact-sidebar').props['data-collapsed'], true)
  assert.equal(find('contact-sidebar__body').props.inert, true)
  assert.equal(find('contact-sidebar__body').props['aria-hidden'], true)
  assert.equal(find('floating-collapse__toggle').props['aria-controls'], find('contact-sidebar__body').props.id)
  assert.equal(find('contact-sidebar__music').props['aria-pressed'], true, 'collapsing never stops playback')
  assert.equal(find('contact-sidebar__music').props['data-animating'], false)
  await act(async () => find('floating-collapse__toggle').props.onClick())
  assert.equal(find('contact-sidebar').props['data-collapsed'], false)
  assert.equal(find('floating-collapse-controls').findAllByType('button').length, 2, 'expanded rail restores the arrow and automatic-collapse control')
  assert.equal(find('floating-collapse__toggle').props['aria-expanded'], true)
  assert.equal(find('contact-sidebar__body').props.inert, undefined)
  assert.equal(find('contact-sidebar__music').props['data-animating'], true)
  assert.equal(storage.get('icue:contact-sidebar:collapse:compact'), 'expanded')
  await act(async () => find('contact-sidebar__music').props.onClick())
  assert.equal(musicToggles, 1)
  await act(async () => renderer.root.findByProps({ 'aria-label': 'Open calendar' }).props.onClick())
  await act(async () => find('floating-collapse__toggle').props.onClick())
  assert.equal(find('contact-sidebar').props['data-collapsed'], false, 'an open calendar holds the rail open')
  assert.equal(renderer.root.findAllByProps({ role: 'dialog' }).length, 1)
  await act(async () => renderer.root.findByProps({ 'aria-label': 'Close calendar' }).props.onClick())
  assert.equal(find('contact-sidebar').props['data-collapsed'], true)
  assert.equal(storage.get('icue:contact-sidebar:collapse:compact'), 'collapsed')
  assert.equal(storage.get('icue:contact-sidebar:collapse'), 'expanded', 'mobile does not overwrite the desktop choice')
  await unmount(renderer)
})
