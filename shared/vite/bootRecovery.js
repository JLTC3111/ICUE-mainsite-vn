import { installBootRecovery } from '../resilience/bootRecovery.js'

/** Inline before module scripts, including every generated deep-link shell. */
export function bootRecovery() {
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
          children: `(${installBootRecovery.toString()})(${JSON.stringify(modules)});`,
          injectTo: 'head-prepend',
        }]
      },
    },
  }
}
