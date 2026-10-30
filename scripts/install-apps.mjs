import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const cache = path.join(root, '.cache', 'npm')
mkdirSync(cache, { recursive: true })
const apps = ['news-app', 'people-app', 'structure-app', 'ourwork-app', 'contact-app', 'legal-app', 'home-app', 'faq-app', 'recruitment-app', 'community-app']
const npm = process.env.npm_execpath
for (const app of apps) {
  console.log(`Installing ${app}, including platform build bindings…`)
  const command = npm ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(command, [...(npm ? [npm] : []), 'ci', '--include=optional', '--cache', cache, '--no-fund'], {
    cwd: path.join(root, app), stdio: 'inherit', shell: !npm && process.platform === 'win32',
  })
  if (result.error || result.status !== 0) {
    console.error(result.error?.message || `Dependency installation failed for ${app}.`)
    process.exit(result.status || 1)
  }
  // npm may report success even after skipping an optional native dependency.
  // Validate the actual toolchain before tests or asset synchronization begin.
  const check = spawnSync(process.execPath, ['--input-type=module', '-e', 'await import("vite")'], { cwd: path.join(root, app), stdio: 'inherit' })
  if (check.status !== 0) {
    console.error(`The ${app} build toolchain could not load. Retry npm run install:apps after checking the registry connection.`)
    process.exit(1)
  }
}
