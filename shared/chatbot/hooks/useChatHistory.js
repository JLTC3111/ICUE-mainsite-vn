import { useCallback, useSyncExternalStore } from 'react'
import { chatHistory } from '../lib/historyStore.js'

export function useChatHistory(language) {
  const snapshot = useCallback(() => chatHistory.read(language), [language])
  const messages = useSyncExternalStore(chatHistory.subscribe, snapshot, snapshot)
  const append = useCallback(message => chatHistory.append(language, message), [language])
  return { messages, append }
}
