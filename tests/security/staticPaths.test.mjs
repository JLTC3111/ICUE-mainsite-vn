import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { loadConfigFromFile } from 'vite'
import { resolveStaticPath } from '../../shared/vite/staticPath.js'

test('static resolution rejects traversal, hidden files, malformed paths and escaping symlinks', t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'icue-static-security-'))
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }))
  const root = path.join(fixture, 'public')
  fs.mkdirSync(root)
  fs.writeFileSync(path.join(root, 'safe file.js'), 'safe')
  fs.writeFileSync(path.join(fixture, 'secret.json'), 'canary')
  fs.symlinkSync(path.join(fixture, 'secret.json'), path.join(root, 'link.json'))
  fs.symlinkSync(fixture, path.join(root, 'escape'))
  for (const url of ['../secret.json', '%2e%2e/secret.json', '..%2fsecret.json', '..%5csecret.json', '/secret.json', '.env.local', '%2eenv.local', 'x/../../secret.json', '%00.json', '%E0%A4%A', 'link.json', 'escape/secret.json', 'escape/missing.js']) {
    assert.equal(resolveStaticPath(root, url), null, url)
  }
  assert.equal(resolveStaticPath(root, 'safe%20file.js'), path.join(root, 'safe file.js'))
  assert.equal(resolveStaticPath(root, 'assets/missing.js'), path.join(root, 'assets/missing.js'))
})

test('the actual root Vite middleware rejects traversal in every app and the public alias', async () => {
  const loaded = await loadConfigFromFile({ command: 'serve', mode: 'test' })
  const plugins = loaded.config.plugins.filter(plugin => plugin.name?.endsWith('dev-fallback'))
  const attack = plugin => plugin.name === 'home-dev-fallback' ? '/../../package.json' : {
    'newsroom-dev-fallback': '/newsroom', 'people-dev-fallback': '/people',
    'structure-dev-fallback': '/structure', 'ourwork-dev-fallback': '/our-work',
    'contact-dev-fallback': '/contact', 'legal-dev-fallback': '/legal',
    'faq-dev-fallback': '/faqs', 'recruitment-dev-fallback': '/recruitment',
    'community-dev-fallback': '/community-activities',
  }[plugin.name] + '/../package.json'
  for (const plugin of plugins) {
    let middleware
    plugin.configureServer({ middlewares: { use: fn => { middleware = fn } } })
    const urls = [attack(plugin), attack(plugin).replace('..', '%2e%2e')]
    if (plugin.name === 'home-dev-fallback') urls.push('/public/../../package.json')
    for (const url of urls) {
      const response = { setHeader() {}, end(body) { this.body = body } }
      middleware({ url }, response, () => assert.fail(`unsafe path fell through: ${url}`))
      assert.equal(response.statusCode, 403, url)
      assert.equal(response.body, 'Forbidden')
    }
  }
  assert.equal(plugins.length, 10)
})
