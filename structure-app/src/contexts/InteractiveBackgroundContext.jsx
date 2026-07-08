import { createContext, useContext, useMemo } from 'react'

const InteractiveBackgroundContext = createContext(false)

export function InteractiveBackgroundProvider({ active, children }) {
  const value = useMemo(() => Boolean(active), [active])

  return (
    <InteractiveBackgroundContext.Provider value={value}>
      {children}
    </InteractiveBackgroundContext.Provider>
  )
}

/** True when the interactive galaxy background is enabled. */
export function useInteractiveBackgroundActive() {
  return useContext(InteractiveBackgroundContext)
}
