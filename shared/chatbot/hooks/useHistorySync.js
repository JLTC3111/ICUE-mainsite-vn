import { useEffect, useState, useSyncExternalStore } from 'react'
import { createHistorySync } from '../lib/historySync.js'

export function useHistorySync(isOpen) {
  const [sync] = useState(() => createHistorySync())
  const state = useSyncExternalStore(sync.subscribe, sync.getSnapshot, sync.getSnapshot)
  useEffect(() => sync.start(), [sync])
  useEffect(() => { sync.setOpen(isOpen) }, [isOpen, sync])
  return { sync, state }
}
