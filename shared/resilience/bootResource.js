import { withDeadline } from './requests.js'

/** Track a required initial download before the shell reports itself ready. */
export function loadBootResource(load, id) {
  const signal = type => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(type, { detail: id }))
  }
  signal('icue:route-loading')
  return withDeadline(load).then(module => {
    signal('icue:route-ready')
    return module
  }).catch(error => {
    signal('icue:route-error')
    throw error
  })
}
