import fs from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { transformWithEsbuild } from 'vite'
const apps = (await fs.readdir('.')).filter(name => name.endsWith('-app'))
const roots = [...apps.map(name => `${name}/src`), 'shared', 'src', 'lib', 'components', 'legacy']
const listed = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...roots], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
const files = [...new Set(listed.split('\0'))].filter(file => /\.[jt]sx?$/.test(file) && !/\.test\.|\/testHarness\.js$/.test(file)).sort()
const inventory = [], failures = []
for (const file of files) {
  try {
    const source = await fs.readFile(file, 'utf8')
    const loader = file.endsWith('.tsx') ? 'tsx' : file.endsWith('.ts') ? 'ts' : file.endsWith('.jsx') ? 'jsx' : 'js'
    await transformWithEsbuild(source, file, { loader })
    inventory.push({ file, component: /\.[jt]sx$/.test(file), async: /\bawait\b|\bfetch\s*\(|\bimport\s*\(/.test(source), lifecycle: /useEffect|addEventListener|requestAnimationFrame|setInterval|setTimeout/.test(source) })
  } catch (error) { failures.push({ file, message: error.message }) }
}
const result = { parsed: inventory.length, components: inventory.filter(item => item.component).length, failures, inventory }
console.log(JSON.stringify(process.argv.includes('--json') ? result : { parsed: result.parsed, components: result.components, failures }, null, 2))
if (failures.length) process.exitCode = 1
