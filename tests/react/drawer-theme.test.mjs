import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const postcss = require('postcss')
const source = await fs.readFile(new URL('../../shared/drawer-menu/DrawerMenu.css', import.meta.url), 'utf8')
  + await fs.readFile(new URL('../../shared/main-site-nav/MainSiteNav.css', import.meta.url), 'utf8')

function cssAtWidth(width) {
  const css = postcss.parse(source)
  css.walkAtRules('media', rule => {
    const matches = !/prefers-reduced-motion:\s*reduce/.test(rule.params)
      && [...rule.params.matchAll(/(min|max)-width:\s*(\d+)px/g)]
      .every(([, kind, size]) => kind === 'min' ? width >= Number(size) : width <= Number(size))
    if (matches) rule.replaceWith(...rule.nodes)
    else rule.remove()
  })
  // Expose browser pseudo states/elements to JSDOM's selector engine. Color
  // declarations and the root-theme selectors still come from the real CSS.
  return css.toString().replaceAll(':focus-visible', '[data-focus]')
    .replaceAll(':hover', '[data-hover]').replaceAll('::before', ' > [data-rule]')
    .replaceAll('::after', ' > [data-tick]')
}

function panel(id) {
  return `<aside id="${id}" class="nav-drawer is-open open"><div class="nav-drawer__header"><button class="nav-drawer__close" data-focus>Close</button></div>
    <nav class="nav-drawer__links">
      <a href="/" data-normal data-focus><span data-rule></span><span data-tick></span><span class="nav-drawer__label">Home</span><span class="nav-drawer__index">01</span></a>
      <a href="/structure" class="is-current" data-current><span data-rule></span><span class="nav-drawer__label">Structure</span></a>
      <button class="nav-drawer__submenu-toggle" data-focus>People</button>
      <div class="nav-drawer__submenu-inner"><a href="/experts" class="moe-subMenu" data-focus>Experts</a><a href="/team" class="core-subMenu" data-focus>Core team</a></div>
    </nav></aside>`
}

function fixture(t, width = 1280) {
  const dom = new JSDOM(`<!doctype html><html><head><style>${cssAtWidth(width)}</style></head><body>
    <div id="page" class="main-site-nav drawer-open"><div id="embedded-overlay" class="nav-drawer__overlay is-open"></div>${panel('drawerMenu').replace('class="nav-drawer is-open open"', 'class="nav-drawer main-site-drawer is-open open"')}</div>
    <div id="portal-overlay" class="nav-drawer__overlay is-open"></div>${panel('portal')}
    </body></html>`, { pretendToBeVisual: true })
  t.after(() => dom.window.close())
  const { window } = dom, { document } = window
  const property = (element, name) => window.getComputedStyle(element).getPropertyValue(name).trim()
  const variable = (element, name) => {
    for (let node = element; node; node = node.parentElement) {
      const value = property(node, name)
      if (value) return value
    }
    return ''
  }
  const resolve = (element, input) => {
    let value = input
    for (let guard = 0; value.includes('var(') && guard < 30; guard++) {
      const start = value.indexOf('var(')
      let end = start + 4, depth = 1
      for (; depth && end < value.length; end++) {
        if (value[end] === '(') depth++
        else if (value[end] === ')') depth--
      }
      const content = value.slice(start + 4, end - 1)
      const comma = content.indexOf(',')
      const key = (comma < 0 ? content : content.slice(0, comma)).trim()
      const fallback = comma < 0 ? '' : content.slice(comma + 1).trim()
      const replacement = variable(element, key) || fallback
      assert.ok(replacement, `Unresolved CSS variable ${key}`)
      value = value.slice(0, start) + replacement + value.slice(end)
    }
    return value.replace(/calc\(([\d.]+)\s*\*\s*([\d.]+)(%)?\)/g,
      (_, first, second, unit = '') => `${Number(first) * Number(second)}${unit}`)
  }
  const style = (element, name) => resolve(element, property(element, name))
  return { window, document, root: document.documentElement, property, variable, resolve, style,
    panels: [document.getElementById('drawerMenu'), document.getElementById('portal')],
    overlays: [document.getElementById('embedded-overlay'), document.getElementById('portal-overlay')] }
}

function color(value) {
  value = value.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
  if (value === 'transparent' || !value) return [0, 0, 0, 0]
  if (value.startsWith('color-mix(')) {
    const match = value.match(/^color-mix\(in srgb,\s*(#[\da-f]+|rgba?\([^)]+\))\s+([\d.]+)%,\s*(#[\da-f]+|rgba?\([^)]+\))\)$/i)
    assert.ok(match, `Unsupported mix: ${value}`)
    const first = color(match[1]), second = color(match[3]), weight = Number(match[2]) / 100
    const alpha = first[3] * weight + second[3] * (1 - weight)
    return [...first.slice(0, 3).map((channel, index) =>
      (channel * first[3] * weight + second[index] * second[3] * (1 - weight)) / alpha), alpha]
  }
  if (value.startsWith('#')) {
    const hex = value.slice(1).replace(/^([\da-f])([\da-f])([\da-f])$/i, '$1$1$2$2$3$3')
    return [...[0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16)), 1]
  }
  assert.match(value, /^rgba?\(/)
  const channels = value.match(/[\d.]+/g).map(Number)
  return [...channels.slice(0, 3), channels[3] ?? 1]
}

function over(foreground, background) {
  return [...foreground.slice(0, 3).map((channel, index) => channel * foreground[3] + background[index] * (1 - foreground[3])), 1]
}

function ratio(first, second) {
  const luminance = channels => channels.slice(0, 3).map(channel => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
  const values = [luminance(over(first, second)), luminance(second)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

function assertContrast(foreground, background, minimum, label) {
  const value = ratio(foreground, background)
  assert.ok(value >= minimum, `${label}: ${value.toFixed(2)}:1 < ${minimum}:1`)
}

function assertTheme(f, expected) {
  for (const node of [...f.panels, ...f.overlays]) {
    assert.equal(f.variable(node, '--drawer-color-scheme'), expected, `${node.id} follows the current page`)
  }
  assert.equal(f.document.getElementById('portal').parentElement, f.document.body)
}

for (const [label, attribute] of [
  ['shared app preference', 'data-icue-page-theme'],
  ['Home', 'data-icue-home-theme'],
  ['About and project routes', 'data-about-theme'],
  ['Our Work', 'data-theme'],
]) {
  test(`both drawer topologies follow ${label} while open and clear it on route exit`, t => {
    const f = fixture(t)
    assertTheme(f, 'light')
    const focused = f.panels[1].querySelector('[data-normal]')
    focused.focus()
    for (const theme of ['dark', 'light', 'dark']) {
      f.root.setAttribute(attribute, theme)
      assertTheme(f, theme)
      assert.equal(f.document.activeElement, focused, 'changing theme does not replace or refocus the open drawer')
      assert.ok(f.panels.every(node => node.classList.contains('is-open')))
    }
    f.root.removeAttribute(attribute)
    assertTheme(f, 'light')
  })
}

test('Newsroom dark-class changes and explicit shared preferences select the rendered page palette', t => {
  const f = fixture(t)
  f.root.classList.add('icue-news-theme-dark')
  assertTheme(f, 'dark')
  f.root.classList.remove('icue-news-theme-dark')
  assertTheme(f, 'light')
  for (const attribute of ['data-about-theme', 'data-icue-home-theme', 'data-theme']) f.root.setAttribute(attribute, 'dark')
  f.root.classList.add('icue-news-theme-dark')
  f.root.setAttribute('data-icue-page-theme', 'light')
  assertTheme(f, 'light')
  for (const attribute of ['data-about-theme', 'data-icue-home-theme', 'data-theme']) f.root.setAttribute(attribute, 'light')
  f.root.classList.remove('icue-news-theme-dark')
  f.root.setAttribute('data-icue-page-theme', 'dark')
  assertTheme(f, 'dark')
})

for (const width of [375, 768, 1440]) {
  test(`drawer text, controls and landmarks remain readable in both themes at ${width}px`, t => {
    const f = fixture(t, width)
    for (const theme of ['light', 'dark']) {
      f.root.setAttribute('data-icue-page-theme', theme)
      assertTheme(f, theme)
      for (const drawer of f.panels) {
        const stops = f.style(drawer, 'background').match(/#[\da-f]{6}/gi).map(color)
        assert.equal(stops.length, 2)
        const normal = drawer.querySelector('[data-normal]'), current = drawer.querySelector('[data-current]')
        for (const effect of [0, 0.25, 0.5, 0.75, 1]) {
          normal.style.setProperty('--effect', String(effect))
          for (const stop of stops) {
            const surface = over(color(f.style(normal, 'background')), stop)
            assertContrast(color(f.style(normal, 'color')), surface, 4.5, `${theme} normal/hover at ${effect}`)
            assertContrast(color(f.style(normal.querySelector('.nav-drawer__index'), 'color')), surface, 4.5, `${theme} index`)
            // The ruler is decorative; labels, active styling and focus also
            // identify each destination. Retain the existing subtle dark ruler.
            assertContrast(color(f.style(normal.querySelector('[data-rule]'), 'background-color')), stop, 2, `${theme} decorative ruler`)
          }
        }
        for (const stop of stops) {
          const active = over(color(f.style(current, 'background-color')), stop)
          assertContrast(color(f.style(current, 'color')), active, 4.5, `${theme} current item`)
          for (const selector of ['.moe-subMenu', '.core-subMenu', '.nav-drawer__submenu-toggle']) {
            const link = drawer.querySelector(selector)
            assertContrast(color(f.style(link, 'color')), stop, 4.5, `${theme} ${selector}`)
            assertContrast(color(f.style(link, 'color')), active, 4.5, `${theme} ${selector} on current surface`)
          }
          const ring = color(f.style(normal, 'outline').match(/(#[\da-f]+|rgba?\([^)]+\))$/i)[0])
          assertContrast(ring, stop, 3, `${theme} keyboard focus`)
          const close = drawer.querySelector('.nav-drawer__close')
          for (const hovered of [false, true]) {
            close.toggleAttribute('data-hover', hovered)
            assertContrast(color(f.style(close, 'color')), over(color(f.style(close, 'background')), stop), 4.5, `${theme} close ${hovered ? 'hover' : 'rest'}`)
          }
        }
      }
    }
  })
}

test('changing the drawer palette preserves its layout, single-line labels and animation properties', t => {
  const f = fixture(t, 768)
  const properties = ['position', 'top', 'left', 'width', 'height', 'padding', 'transform', 'transition', 'animation', 'z-index', 'font-size', 'font-weight', 'white-space', 'gap']
  const geometry = () => f.panels.map(drawer => [drawer, drawer.querySelector('[data-normal]'), drawer.querySelector('.nav-drawer__label'), drawer.querySelector('.nav-drawer__close')]
    .map(node => properties.map(property => f.style(node, property))))
  f.root.setAttribute('data-icue-page-theme', 'dark')
  const dark = geometry()
  assert.equal(f.style(f.panels[0].querySelector('.nav-drawer__label'), 'white-space'), 'nowrap')
  f.root.setAttribute('data-icue-page-theme', 'light')
  assert.deepEqual(geometry(), dark)
})
