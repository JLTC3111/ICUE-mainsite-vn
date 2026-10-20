import { installBootRecovery } from '../resilience/bootRecovery.js'
import { readFileSync } from 'node:fs'

/** Inline before module scripts, including every generated deep-link shell. */
export function bootRecovery() {
  const recoveryCss = readFileSync(new URL('../resilience/recovery.css', import.meta.url), 'utf8')
  let base = '/'
  return {
    name: 'icue-boot-recovery',
    configResolved(config) { base = config.base },
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const modules = Object.values(context.bundle || {})
          .filter(file => file.type === 'chunk' && !file.isEntry)
          .map(file => `${base}${file.fileName}`)
        return [{
          tag: 'script',
          attrs: { 'data-icue-boot-recovery': '' },
          children: `(${installBootRecovery.toString()})(${JSON.stringify(modules)},${JSON.stringify(recoveryCss)});`,
          injectTo: 'head-prepend',
        }]
      },
    },
  }
}
