import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { React, act, sourceModule } from '../../shared/resilience/testHarness.js'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const { createRoot } = require('react-dom/client')
const { createPortal } = require('react-dom')

async function fixture(t) {
  const dom = new JSDOM('<html><body><main></main></body></html>', { pretendToBeVisual: true })
  const { window } = dom, { document } = window
  const originals = new Map()
  for (const [key, value] of Object.entries({ window, document })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
  let id = 0, clock = 0, locale = 'en'
  const frames = new Map(), timeouts = new Map(), intervals = new Map()
  const globals = {
    window, document, performance: { now: () => clock },
    requestAnimationFrame: fn => { frames.set(++id, fn); return id },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: fn => { timeouts.set(++id, fn); return id },
    clearTimeout: id => timeouts.delete(id),
    setInterval: fn => { intervals.set(++id, fn); return id },
    clearInterval: id => intervals.delete(id),
  }
  const root = createRoot(document.querySelector('main'))
  t.after(async () => {
    await act(async () => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  return {
    window, document, globals, intervals, timeouts, frames,
    i18n: { useTranslation: () => ({ t: key => `${locale}:${key}` }) },
    locale(next) { locale = next },
    render: element => act(async () => root.render(element)),
    async tick(now) { clock = now; await act(async () => { for (const fn of [...intervals.values()]) fn() }) },
    async flush(queue) { await act(async () => { const work = [...queue.values()]; queue.clear(); for (const fn of work) fn() }) },
  }
}

test('article translation loading follows the locale without restarting and gives way to actionable errors', async t => {
  const f = await fixture(t)
  const { default: Translator } = await sourceModule('news-app/src/components/ArticleTranslator.jsx', {
    globals: f.globals,
    imports: {
      'react-i18next': f.i18n,
      '../lib/i18n': { SUPPORTED_LANGUAGES: [{ code: 'en', label: 'English' }] },
    },
  })
  await f.render(React.createElement(Translator, { busy: true }))
  await f.tick(3100)
  assert.equal(f.document.querySelector('.lattice-loader__timer').textContent, '3.1s')
  f.locale('vi')
  await f.render(React.createElement(Translator, { busy: true }))
  assert.equal(f.document.querySelector('.lattice-loader__label').textContent, 'vi:translate.translating')
  assert.equal(f.document.querySelector('.lattice-loader__timer').textContent, '3.1s')
  let retries = 0
  await f.render(React.createElement(Translator, { error: true, onRetry: () => retries++ }))
  assert.equal(f.document.querySelector('.lattice-loader'), null)
  assert.equal(f.intervals.size, 0)
  await act(async () => f.document.querySelector('button').click())
  assert.equal(retries, 1)
})

test('AI translation elapsed status is immediate, freezes on completion, lingers and resets for the next operation', async t => {
  const f = await fixture(t)
  const { default: Pill } = await sourceModule('news-app/src/components/TranslateElapsedPill.jsx', {
    globals: f.globals, imports: { 'react-i18next': f.i18n },
  })
  const render = active => f.render(React.createElement(Pill, { active }))
  await render(false)
  assert.equal(f.document.querySelector('.lattice-loader'), null)
  await render(true)
  assert.equal(f.document.querySelector('.lattice-loader').dataset.status, 'working')
  await f.flush(f.frames)
  await f.tick(4250)
  await render(false)
  assert.equal(f.document.querySelector('.lattice-loader').dataset.status, 'done')
  assert.equal(f.document.querySelector('.lattice-loader__label').textContent, 'en:translate.ready')
  assert.equal(f.document.querySelector('.lattice-loader__timer').textContent, '4.2s')
  assert.equal(f.intervals.size, 0)
  await f.flush(f.timeouts)
  assert.equal(f.document.querySelector('.lattice-loader'), null)
  await render(true)
  assert.equal(f.document.querySelector('.lattice-loader__timer').textContent, '0.0s')
})

test('support uploads use a compact loader while preserving stop, removal and retry behavior', async t => {
  const f = await fixture(t)
  const Null = () => null
  const { default: PromptBar } = await sourceModule('shared/chatbot/PromptBar.jsx', {
    globals: f.globals,
    imports: {
      'react-dom': { createPortal },
      'lucide-react': Object.fromEntries(['Plus', 'Paperclip', 'ArrowUp', 'Square', 'X', 'FileText', 'Image', 'RotateCcw'].map(name => [name, Null])),
    },
  })
  const labels = { title: 'ICUE', attachFiles: 'Attach', stop: 'Stop', send: 'Send', uploading: 'Uploading', uploadFailed: 'Failed', removeFile: 'Remove', retry: 'Retry' }
  const calls = []
  const props = { value: 'A draft', labels, placeholder: 'Message', onChange() {}, onSend() { calls.push('send') }, onStop() { calls.push('stop') }, onRemove: file => calls.push(file.client_id), onRetry() {} }
  await f.render(React.createElement(PromptBar, { ...props, busy: true, attachments: [{ client_id: 'file-1', name: 'report.pdf', size: 2500, status: 'uploading' }] }))
  assert.equal(f.document.querySelector('.lattice-loader__label').textContent, 'Uploading')
  assert.equal(f.document.querySelector('.lattice-loader__timer'), null)
  assert.equal(f.intervals.size, 0)
  assert.equal(f.document.querySelector('[aria-label="Attach"]').disabled, true)
  await act(async () => f.document.querySelector('[aria-label="Stop"]').click())
  await act(async () => f.document.querySelector('[aria-label="Remove: report.pdf"]').click())
  assert.deepEqual(calls, ['stop', 'file-1'])
  await f.render(React.createElement(PromptBar, { ...props, attachments: [{ client_id: 'file-1', name: 'report.pdf', size: 2500, status: 'failed' }] }))
  assert.equal(f.document.querySelector('.lattice-loader'), null)
  assert.equal(f.document.querySelector('[aria-label="Retry: report.pdf"]').disabled, false)
})
