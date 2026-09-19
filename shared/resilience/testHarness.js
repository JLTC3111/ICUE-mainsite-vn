import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { transformWithEsbuild } from 'vite'
const repo = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(new URL('../../package.json', import.meta.url))
export const React = require('react')
export const { create, act } = require('react-test-renderer')
globalThis.IS_REACT_ACT_ENVIRONMENT = true
export const i18n = { useTranslation: () => ({ t: key => key, i18n: { resolvedLanguage: 'en', language: 'en' } }) }
export const title = { useDocumentTitle() {} }
export function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
export function silenceRenderer(t) { t.mock.method(console, 'error', () => {}); t.mock.method(console, 'warn', () => {}) }
export const unmount = renderer => act(async () => renderer.unmount())
export function platform() {
  const document = Object.assign(new EventTarget(), { hidden: false, documentElement: { lang: 'en' }, body: { style: {} }, querySelectorAll: () => [] })
  Object.defineProperty(document, 'visibilityState', { get: () => document.hidden ? 'hidden' : 'visible' })
  const window = Object.assign(new EventTarget(), { setTimeout, clearTimeout, setInterval, clearInterval, history: { length: 1, replaceState() {} }, location: { reload() { throw new Error('Unexpected page reload') } } })
  return { document, window, navigator: { onLine: true } }
}
/** Run actual source and real React; mock only dependency/platform boundaries. */
export async function sourceModule(file, { imports = {}, globals = {}, env = {}, dynamicImport } = {}) {
  const context = vm.createContext({ console, URL, URLSearchParams, Request, Response, Headers, AbortController, DOMException, Error, Event, EventTarget, setTimeout, clearTimeout, setInterval, clearInterval, fetch, IS_REACT_ACT_ENVIRONMENT: true, ...globals })
  const modules = new Map()
  function synthetic(key, values) {
    if (!modules.has(key)) modules.set(key, Promise.resolve(new vm.SyntheticModule(Object.keys(values), function () {
      for (const [name, value] of Object.entries(values)) this.setExport(name, value)
    }, { context, identifier: key })))
    return modules.get(key)
  }
  async function resolve(specifier, parent) {
    if (specifier in imports) return synthetic('mock:'+specifier, imports[specifier])
    if (specifier === 'react') return synthetic('react', React)
    if (/\.css$/.test(specifier)) return synthetic(specifier, {})
    let resolved
    if (specifier.startsWith('@icue/')) resolved = path.join(repo, 'shared', specifier.slice(6))
    else if (specifier.startsWith('.')) resolved = path.resolve(path.dirname(parent.identifier), specifier)
    else throw new Error(`Unmocked dependency ${specifier} in ${parent.identifier}`)
    for (const suffix of ['', '.js', '.jsx', '.json', '/index.js']) {
      try { if ((await fs.stat(resolved + suffix)).isFile()) return load(resolved + suffix) } catch { /* Try source extensions. */ }
    }
    throw new Error(`Missing source: ${resolved}`)
  }
  function load(filename) {
    if (!modules.has(filename)) modules.set(filename, (async () => {
      const source = await fs.readFile(filename, 'utf8')
      if (filename.endsWith('.json')) return new vm.SyntheticModule(['default'], function () { this.setExport('default', JSON.parse(source)) }, { context, identifier: filename })
      const code = (await transformWithEsbuild(source, filename, { loader: filename.endsWith('.jsx') ? 'jsx' : 'js', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' })).code
      return new vm.SourceTextModule(`import * as React from 'react';\n${code}`, {
        context, identifier: filename, initializeImportMeta: meta => { meta.env = env },
        importModuleDynamically: async (specifier, parent) => {
          if (dynamicImport) return dynamicImport(specifier, parent)
          const mod = await resolve(specifier, parent)
          if (mod.status === 'unlinked') await mod.link(resolve)
          if (mod.status === 'linked') await mod.evaluate()
          return mod
        },
      })
    })())
    return modules.get(filename)
  }
  const mod = await load(path.join(repo, file))
  await mod.link(resolve)
  await mod.evaluate()
  return mod.namespace
}
