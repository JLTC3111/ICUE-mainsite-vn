import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { React, act, create, silenceRenderer, sourceModule, unmount } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const postcss = require('postcss')
const { JSDOM } = require('jsdom')
const read = file => fs.readFile(new URL(`../../${file}`, import.meta.url), 'utf8')

function rgb(value) {
  if (value.startsWith('#')) {
    const hex = value.slice(1).replace(/^([\da-f])([\da-f])([\da-f])$/i, '$1$1$2$2$3$3')
    return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16))
  }
  return value.match(/[\d.]+/g).map(Number)
}

function contrast(foreground, background, label, brightness = 1) {
  const bg = rgb(background)
  const fg = rgb(foreground)
  const alpha = fg[3] ?? 1
  const composite = fg.slice(0, 3).map((channel, index) => channel * alpha + bg[index] * (1 - alpha))
  const luminance = channels => channels.slice(0, 3).map(c => {
    const value = Math.min(255, c * brightness) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
  const [light, dark] = [luminance(composite), luminance(bg)].sort((a, b) => b - a)
  const ratio = (light + 0.05) / (dark + 0.05)
  assert.ok(ratio >= 4.5, `${label}: ${foreground} on ${background} = ${ratio.toFixed(2)}:1`)
}

async function tokens(file, selector) {
  const result = {}
  postcss.parse(await read(file)).walkRules(rule => {
    if (rule.selector === selector) rule.walkDecls(/^--/, declaration => { result[declaration.prop] = declaration.value })
  })
  return result
}

test('Structure animated heading uses readable colors throughout its sweep in both themes', async t => {
  silenceRenderer(t)
  const route = await read('structure-app/src/routes/StructurePage.jsx')
  const textColor = route.match(/textColor="([^"]+)"/)[1]
  const colors = [...route.matchAll(/'var\(--structure-heading-[\w-]+\)'/g)].map(match => match[0].slice(1, -1))
  assert.ok(colors.length >= 4)
  let derived
  const { DiaTextReveal } = await sourceModule('structure-app/src/components/magicui/DiaTextReveal.jsx', {
    imports: { 'motion/react': {
      motion: { span: 'span' }, useReducedMotion: () => true, useInView: () => true,
      useMotionValue: initial => React.useRef({ value: initial, set(value) { this.value = value } }).current,
      useTransform: (value, transform) => { derived = () => transform(value.value); return derived },
      animate: () => ({ stop() {} }),
    } },
  })
  let renderer
  await act(async () => { renderer = create(React.createElement(DiaTextReveal, { text: 'Institute heading', textColor, colors })) })
  const finalGradient = derived()
  assert.ok(finalGradient.includes(textColor), 'The settled animation must retain the live theme token')
  const light = await tokens('structure-app/src/styles/theme.css', ':root')
  const dark = { ...light, ...await tokens('structure-app/src/styles/dark-mode.css', ":root[data-icue-page-theme='dark']") }
  for (const [theme, palette, backgrounds] of [
    ['light', light, ['#f8fafc', '#e8eef8', '#dbe7f7']],
    ['dark', dark, ['#172638', '#111d2e']],
  ]) {
    for (const expression of [textColor, ...colors]) {
      const token = expression.slice(4, -1)
      for (const background of backgrounds) contrast(palette[token], background, `${theme} heading ${token}`)
    }
  }
  await unmount(renderer)
})

test('Our Work secondary copy stays readable on cards and page backgrounds in either theme', async () => {
  const dark = await tokens('ourwork-app/src/styles/theme.css', ':root')
  const light = { ...dark, ...await tokens('ourwork-app/src/styles/theme.css', ":root[data-theme='light']") }
  for (const [theme, palette] of [['dark', dark], ['light', light]]) {
    for (const ink of ['text', 'text-2', 'text-3', 'text-mute', 'text-faint', 'text-dim', 'chip-text']) {
      for (const surface of ['bg', 'surface', 'surface-alt', 'image-bg']) {
        contrast(palette[`--ow-${ink}`], palette[`--ow-${surface}`], `${theme} Our Work ${ink}/${surface}`)
      }
    }
  }
})

test('footer legal links and copyright remain readable across every dark chrome gradient', async () => {
  for (const file of ['shared/site-footer/Footer.css', 'structure-app/src/components/Footer.css', 'news-app/src/components/Footer.css', 'people-app/src/components/Footer.css']) {
    const copy = []
    postcss.parse(await read(file)).walkRules(rule => {
      if (!['.icue-footer__rights', '.icue-footer__legal a'].includes(rule.selector)) return
      rule.walkDecls('color', declaration => copy.push(declaration.value))
    })
    assert.equal(copy.length, 2)
    for (const color of copy) for (const surface of ['#0a1628', '#1a2a42', '#0a0a0a', '#1a1a1a']) contrast(color, surface, file)
  }
})

test('Newsroom CTA labels and FAQ action labels clear contrast in default and hover states', async () => {
  const news = await tokens('news-app/src/styles/theme.css', ':root')
  for (const stop of news['--icue-gradient-pill'].match(/#[\da-f]{6}/gi)) {
    contrast('#ffffff', stop, 'Newsroom action')
    contrast('#ffffff', stop, 'Newsroom action hover', 1.06)
  }
  const faqLight = await tokens('faq-app/src/styles/theme.css', ':root')
  const faqDark = { ...faqLight, ...await tokens('faq-app/src/styles/theme.css', ":root[data-icue-page-theme='dark']") }
  for (const palette of [faqLight, faqDark]) {
    for (const state of ['accent', 'accent-hover']) contrast(palette['--fq-on-accent'], palette[`--fq-${state}`], `FAQ ${state}`)
  }
})

test('shared hamburger follows every new page theme with visible hover and keyboard focus', async t => {
  const css = (await read('shared/ui/page-theme.css')) + (await read('shared/drawer-menu/DrawerMenu.css'))
    .replaceAll(':hover', '[data-hover]').replaceAll(':focus-visible', '[data-focus]')
  const dom = new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body><button class="nav-drawer__toggle"><span class="nav-drawer__toggle-bars"><span></span></span></button></body></html>`)
  t.after(() => dom.window.close())
  const { document } = dom.window
  const button = document.querySelector('button')
  const resolve = value => value.replace(/var\((--[\w-]+)(?:,\s*(.*))?\)/g, (_match, key, fallback) =>
    dom.window.getComputedStyle(document.documentElement).getPropertyValue(key).trim() || fallback || '')
  for (const app of ['structure', 'faqs', 'recruitment', 'community', 'contact', 'legal', 'archive']) {
    document.documentElement.setAttribute('data-icue-theme-page', app)
    for (const theme of ['dark', 'light']) {
      document.documentElement.setAttribute('data-icue-page-theme', theme)
      for (const hover of [false, true]) {
        button.toggleAttribute('data-hover', hover)
        const style = dom.window.getComputedStyle(button)
        contrast(resolve(style.color), resolve(style.background), `${app} ${theme} hamburger ${hover ? 'hover' : ''}`)
      }
      button.setAttribute('data-focus', '')
      const style = dom.window.getComputedStyle(button)
      assert.match(style.outline, /^2px solid/)
      assert.ok(resolve(style.outline).includes(theme === 'dark' ? '#93c5fd' : '#1d4ed8'))
      button.removeAttribute('data-focus')
    }
  }
})
