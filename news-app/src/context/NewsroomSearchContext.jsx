import { createContext, useContext } from 'react'

export const NewsroomSearchContext = createContext(null)

export function useNewsroomSearch() {
  const ctx = useContext(NewsroomSearchContext)
  if (!ctx) {
    throw new Error('useNewsroomSearch must be used within NewsroomSearchProvider')
  }
  return ctx
}
