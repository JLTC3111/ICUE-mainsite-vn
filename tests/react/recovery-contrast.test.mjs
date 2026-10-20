import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { React, platform, sourceModule } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { renderToStaticMarkup } = require('react-dom/server')
const postcss = require('postcss')
const recoveryCss = await fs.readFile(new URL('../../shared/resilience/recovery.css', import.meta.url), 'utf8')
const hostileCss = 'body{background:#000;color:#000}p{color:#000;transition:color .3s}button{background:linear-gradient(#fff,#fff);color:#fff;transition:background .3s}button:hover{background:#fff;color:#fff}'

function resolved(element, value) {
  return value.replace(/var\((--[\w-]+)(?:,\s*([^()]+))?\)/g, (_match, name, fallback) => {
    // JSDOM retains var() expressions, so resolve inherited tokens from the DOM.
    for (let node = element; node; node = node.parentElement) {
      const token = element.ownerDocument.defaultView.getComputedStyle(node).getPropertyValue(name).trim()
      if (token) return resolved(node, token)
    }
    return fallback || ''
  })
}

function cssValue(element, property) {
  return resolved(element, element.ownerDocument.defaultView.getComputedStyle(element).getPropertyValue(property))
}

function luminance(color) {
  let channels
  if (color.startsWith('#')) {
    let hex = color.slice(1)
    if (hex.length === 3) hex = [...hex].map(x => x + x).join('')
    channels = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16))
  } else channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number)
  assert.ok(channels?.length === 3 && channels.every(Number.isFinite), `Solid color required: ${color}`)
  const [r, g, b] = channels.map(channel => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return r * 0.2126 + g * 0.7152 + b * 0.0722
}

function contrast(foreground, background, minimum, label) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  const ratio = (values[0] + 0.05) / (values[1] + 0.05)
  assert.ok(ratio >= minimum, `${label}: ${foreground} on ${background}: ${ratio.toFixed(2)}:1`)
}

function checkNotice(document) {
  const notice = document.querySelector('.icue-recovery')
  const message = notice.querySelector('p')
  const button = notice.querySelector('button')
  const surface = cssValue(notice, 'background')
  contrast(cssValue(message, 'color'), surface, 4.5, 'Message')
  contrast(cssValue(notice, 'border-top-color'), surface, 3, 'Panel border')
  contrast(cssValue(button, 'color'), cssValue(button, 'background'), 4.5, 'Action')
  contrast(cssValue(button, 'background'), surface, 3, 'Action boundary')
  assert.equal(document.defaultView.getComputedStyle(button).minHeight, '44px')
  assert.equal(document.defaultView.getComputedStyle(button).transition, 'none', 'Foreground and background switch together')
  assert.equal(document.defaultView.getComputedStyle(message).transition, 'none')
  return { notice, button, surface }
}

function matchingMedia(css, dark) {
  const parsed = postcss.parse(css)
  parsed.walkAtRules('media', rule => {
    if (dark) rule.replaceWith(rule.nodes)
    else rule.remove()
  })
  // JSDOM does not model pointer/keyboard state; exercise their actual rules via attributes.
  return parsed.toString().replaceAll(':hover', '[data-hover]').replaceAll(':focus-visible', '[data-focus]')
}

test('recovery messages and actions stay readable over inherited page colors in every theme context', async () => {
  const contexts = [
    { attribute: 'data-icue-page-theme' },
    { attribute: 'data-about-theme' },
    { attribute: 'data-theme' },
    { newsroom: true },
  ]
  for (const context of contexts) {
    for (const theme of ['light', 'dark']) {
      const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>')
      const document = dom.window.document
      try {
        if (context.attribute) document.documentElement.setAttribute(context.attribute, theme)
        const { RecoveryNotice } = await sourceModule('shared/resilience/RecoveryBoundary.jsx', { globals: { document } })
        const html = renderToStaticMarkup(React.createElement(RecoveryNotice, { onRetry() {}, allowReload: true }))
        document.body.innerHTML = context.newsroom
          ? `<div class="icue-app${theme === 'dark' ? ' icue-app--news-theme-dark' : ''}">${html}</div>`
          : html
        const style = document.createElement('style')
        style.textContent = hostileCss + matchingMedia(recoveryCss, true)
        document.head.append(style)
        const { notice, button, surface } = checkNotice(document)
        assert.equal(cssValue(notice, '--recovery-scheme'), theme, 'The page selection wins over a dark OS')
        button.setAttribute('data-hover', '')
        contrast(cssValue(button, 'color'), cssValue(button, 'background'), 4.5, 'Hovered action')
        button.setAttribute('data-focus', '')
        const focusColor = cssValue(button, 'outline').match(/#[a-f\d]+|rgba?\([^)]+\)/i)?.[0]
        contrast(focusColor || '', surface, 3, 'Keyboard focus')
        if (context.attribute) {
          const next = theme === 'dark' ? 'light' : 'dark'
          document.documentElement.setAttribute(context.attribute, next)
          checkNotice(document)
          assert.equal(cssValue(notice, '--recovery-scheme'), next, 'An already-visible error follows theme changes')
        }
      } finally { dom.window.close() }
    }
  }
})

test('a top-level recovery panel has its own readable palette before a page theme is available', async () => {
  for (const dark of [false, true]) {
    const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>')
    const document = dom.window.document
    try {
      const { RecoveryNotice } = await sourceModule('shared/resilience/RecoveryBoundary.jsx', { globals: { document } })
      document.body.innerHTML = renderToStaticMarkup(React.createElement(RecoveryNotice, { onRetry() {} }))
      const style = document.createElement('style')
      style.textContent = hostileCss + matchingMedia(recoveryCss, dark)
      document.head.append(style)
      const { notice } = checkNotice(document)
      assert.equal(cssValue(notice, '--recovery-scheme'), dark ? 'dark' : 'light')
    } finally { dom.window.close() }
  }
})

test('the serialized startup controller supplies readable recovery UI without the application stylesheet', async () => {
  const dom = new JSDOM('<!doctype html><html lang="en" data-icue-page-theme="dark"><head></head><body></body></html>')
  const document = dom.window.document
  const f = platform()
  const timers = new Map()
  let timerId = 0
  let reloads = 0
  f.window.setTimeout = callback => { timers.set(++timerId, callback); return timerId }
  f.window.clearTimeout = id => timers.delete(id)
  f.window.location = { href: 'https://icue.test/notable-awards?lang=en', search: '?lang=en', reload() { reloads++ } }
  try {
    const { installBootRecovery } = await sourceModule('shared/resilience/bootRecovery.js')
    vm.runInNewContext(`(${installBootRecovery.toString()})([], css)`, {
      window: f.window, document, navigator: f.navigator, URL, URLSearchParams, css: recoveryCss,
    })
    assert.equal(document.getElementById('icue-recovery-styles').textContent, recoveryCss)
    const event = new Event('error')
    const script = document.createElement('script')
    script.type = 'module'
    Object.defineProperty(event, 'target', { value: script })
    f.window.dispatchEvent(event)
    assert.equal(document.getElementById('icue-boot-recovery').getAttribute('role'), 'alert')
    const { button } = checkNotice(document)
    button.click()
    assert.equal(reloads, 1, 'The visible reload action still works')
    f.window.dispatchEvent(new Event('icue:app-ready'))
    assert.equal(document.getElementById('icue-boot-recovery'), null)
  } finally { dom.window.close() }
})
