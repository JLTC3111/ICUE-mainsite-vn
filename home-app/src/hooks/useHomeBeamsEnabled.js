import { useSyncExternalStore } from 'react'

// Shared by Home's background and beam effects; separate from Newsroom's setting.
export const HOME_BEAMS_STORAGE_KEY = 'icue_home_beams'
const CHANGE_EVENT = 'icue:homeBeamsChanged'
let runtimeEnabled

export function readHomeBeamsEnabled() {
  if (runtimeEnabled !== undefined) return runtimeEnabled
  try {
    return window.localStorage.getItem(HOME_BEAMS_STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

export function setHomeBeamsEnabled(next) {
  runtimeEnabled = Boolean(typeof next === 'function' ? next(readHomeBeamsEnabled()) : next)
  try {
    window.localStorage.setItem(HOME_BEAMS_STORAGE_KEY, runtimeEnabled ? 'on' : 'off')
  } catch {
    // The control still works for this visit when browser storage is blocked.
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new window.Event(CHANGE_EVENT))
}

function subscribe(listener) {
  if (typeof window === 'undefined') return () => {}
  const onStorage = event => {
    if (event.key !== HOME_BEAMS_STORAGE_KEY && event.key !== null) return
    runtimeEnabled = undefined
    listener()
  }
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

const serverSnapshot = () => false

export function useHomeBeamsEnabled() {
  const enabled = useSyncExternalStore(subscribe, readHomeBeamsEnabled, serverSnapshot)
  return [enabled, setHomeBeamsEnabled]
}
