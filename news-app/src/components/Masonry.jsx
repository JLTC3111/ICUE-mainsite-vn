import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'

import './Masonry.css'

// React Bits defaults — dense masonry with varied tile heights.
const COLUMN_QUERIES = ['(min-width:1500px)', '(min-width:1000px)', '(min-width:600px)', '(min-width:400px)']
const COLUMN_COUNTS = [5, 4, 3, 2]

function useMedia(queries, values, defaultValue) {
  const get = () => values[queries.findIndex((q) => matchMedia(q).matches)] ?? defaultValue

  const [value, setValue] = useState(get)

  useEffect(() => {
    const handler = () => setValue(get)
    queries.forEach((q) => matchMedia(q).addEventListener('change', handler))
    return () => queries.forEach(q => matchMedia(q).removeEventListener('change', handler))
  }, [queries, values, defaultValue])

  return value
}

function useMeasure() {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    if (!ref.current) return undefined
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  return [ref, size]
}

async function preloadImages(urls) {
  await Promise.all(
    urls.map(
      (src) =>
        new Promise((resolve) => {
          if (!src) {
            resolve()
            return
          }
          const img = new Image()
          img.src = src
          img.onload = img.onerror = () => resolve()
        }),
    ),
  )
}

function getInitialPosition(item, animateFrom, containerRect) {
  if (!containerRect) return { x: item.x, y: item.y }

  let direction = animateFrom
  if (animateFrom === 'random') {
    const directions = ['top', 'bottom', 'left', 'right']
    direction = directions[Math.floor(Math.random() * directions.length)]
  }

  switch (direction) {
    case 'top':
      return { x: item.x, y: -200 }
    case 'bottom':
      return { x: item.x, y: window.innerHeight + 200 }
    case 'left':
      return { x: -200, y: item.y }
    case 'right':
      return { x: window.innerWidth + 200, y: item.y }
    case 'center':
      return {
        x: containerRect.width / 2 - item.w / 2,
        y: containerRect.height / 2 - item.h / 2,
      }
    default:
      return { x: item.x, y: item.y + 100 }
  }
}

function layoutGrid(items, width, columns, heightScale) {
  const colHeights = new Array(columns).fill(0)
  const columnWidth = width / columns
  const gap = 0

  return items.map((child) => {
    const span = Math.min(Math.max(1, child.colSpan || 1), columns)
    let bestCol = 0
    let bestY = Infinity

    for (let col = 0; col <= columns - span; col += 1) {
      const segmentTop = Math.max(...colHeights.slice(col, col + span))
      if (segmentTop < bestY) {
        bestY = segmentTop
        bestCol = col
      }
    }

    const x = columnWidth * bestCol
    const w = columnWidth * span - (span < columns ? 0 : 0)
    const h = child.height * heightScale
    const y = bestY

    for (let col = bestCol; col < bestCol + span; col += 1) {
      colHeights[col] = y + h + gap
    }

    return { ...child, x, y, w, h, colSpan: span }
  })
}

export default function Masonry({
  items,
  ease = 'power3.out',
  duration = 0.6,
  stagger = 0.05,
  animateFrom = 'bottom',
  scaleOnHover = true,
  hoverScale = 0.95,
  blurToFocus = true,
  adjustHeight = true,
  reduceMotion = false,
  heightScale = 0.5,
  columnQueries = COLUMN_QUERIES,
  columnCounts = COLUMN_COUNTS,
  className = '',
  onItemClick,
  renderItem,
}) {
  const columns = useMedia(columnQueries, columnCounts, 1)
  const [containerRef, { width }] = useMeasure()
  const [imagesReady, setImagesReady] = useState(false)
  const hasMounted = useRef(false)

  useEffect(() => {
    setImagesReady(false)
    preloadImages(items.map((i) => i.img)).then(() => setImagesReady(true))
  }, [items])

  const grid = useMemo(() => {
    if (!width) return []
    return layoutGrid(items, width, columns, heightScale)
  }, [columns, items, width, heightScale])

  const containerHeight = useMemo(() => {
    if (!grid.length) return 0
    return Math.max(...grid.map((item) => item.y + item.h))
  }, [grid])

  useLayoutEffect(() => {
    if (!imagesReady || !grid.length) return undefined

    grid.forEach((item, index) => {
      const selector = `[data-masonry-key="${item.id}"]`
      const animationProps = {
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h,
      }

      if (reduceMotion) {
        gsap.set(selector, { opacity: 1, filter: 'none', scale: 1, ...animationProps })
        return
      }

      if (!hasMounted.current) {
        const containerRect = containerRef.current?.getBoundingClientRect()
        const initialPos = getInitialPosition(item, animateFrom, containerRect)
        gsap.fromTo(
          selector,
          {
            opacity: 0,
            x: initialPos.x,
            y: initialPos.y,
            width: item.w,
            height: item.h,
            ...(blurToFocus && { filter: 'blur(10px)' }),
          },
          {
            opacity: 1,
            ...animationProps,
            ...(blurToFocus && { filter: 'blur(0px)' }),
            duration: 0.8,
            ease: 'power3.out',
            delay: index * stagger,
          },
        )
      } else {
        gsap.to(selector, {
          ...animationProps,
          duration,
          ease,
          overwrite: 'auto',
        })
      }
    })

    hasMounted.current = true
  }, [
    grid,
    imagesReady,
    stagger,
    animateFrom,
    blurToFocus,
    duration,
    ease,
    reduceMotion,
    containerRef,
  ])

  const handleMouseEnter = (_e, item) => {
    if (reduceMotion || !scaleOnHover) return
    gsap.to(`[data-masonry-key="${item.id}"]`, {
      scale: hoverScale,
      duration: 0.3,
      ease: 'power2.out',
    })
  }

  const handleMouseLeave = (_e, item) => {
    if (reduceMotion || !scaleOnHover) return
    gsap.to(`[data-masonry-key="${item.id}"]`, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
    })
  }

  return (
    <div
      ref={containerRef}
      className={`masonry ${className}`.trim()}
      style={adjustHeight && containerHeight ? { height: containerHeight } : undefined}
    >
      {grid.map((item) => (
        <div
          key={item.id}
          data-masonry-key={item.id}
          className="masonry__item"
          onClick={() => onItemClick?.(item)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onItemClick?.(item)
            }
          }}
          onMouseEnter={(e) => handleMouseEnter(e, item)}
          onMouseLeave={(e) => handleMouseLeave(e, item)}
          role="button"
          tabIndex={0}
        >
          {renderItem ? (
            renderItem(item)
          ) : (
            <div className="masonry__item-inner">
              {item.img ? (
                <img src={item.img} alt="" className="masonry__item-img" loading="lazy" decoding="async" />
              ) : (
                <div className="masonry__item-placeholder">ICUE</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
