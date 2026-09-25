import { useMemo, useSyncExternalStore } from 'react'

const EMPTY_SELECTION = { selectedIndex: 0, canScrollPrev: false, canScrollNext: false }
const getServerSnapshot = () => EMPTY_SELECTION

function createSelectionStore(emblaApi) {
  let snapshot = EMPTY_SELECTION

  return {
    subscribe(onChange) {
      if (!emblaApi) return () => {}
      emblaApi.on('select', onChange)
      emblaApi.on('reInit', onChange)
      return () => {
        emblaApi.off('select', onChange)
        emblaApi.off('reInit', onChange)
      }
    },
    getSnapshot() {
      if (!emblaApi) return EMPTY_SELECTION
      const selectedIndex = emblaApi.selectedScrollSnap()
      const canScrollPrev = emblaApi.canScrollPrev()
      const canScrollNext = emblaApi.canScrollNext()
      if (selectedIndex !== snapshot.selectedIndex
        || canScrollPrev !== snapshot.canScrollPrev
        || canScrollNext !== snapshot.canScrollNext) {
        snapshot = { selectedIndex, canScrollPrev, canScrollNext }
      }
      return snapshot
    },
  }
}

/** Keep React in sync with Embla, including selection changes during reInit. */
export default function useEmblaSelection(emblaApi) {
  const store = useMemo(() => createSelectionStore(emblaApi), [emblaApi])

  return useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot)
}
