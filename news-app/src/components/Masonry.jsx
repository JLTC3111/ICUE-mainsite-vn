import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'

import './Masonry.css'

const COLUMN_QUERIES = ['(min-width:1200px)', '(min-width:900px)', '(min-width:600px)', '(min-width:400px)']
const COLUMN_COUNTS = [4, 3, 2, 1]

function getEffectiveColumns(responsiveColumns, itemCount) {
  if (itemCount <= 1) return 1
  if (itemCount <= 4) return Math.min(responsiveColumns, Math.max(2, Math.ceil(itemCount / 2)))
  return responsiveColumns
}

function useMedia(queries, values, defaultValue) {
  const get = () => values[queries.findIndex((q) => matchMedia(q).matches)] ?? defaultValue

  const [value, setValue] = useState(get)

  useEffect(() => {
    const handler = () => setValue(get)
    queries.forEach((q) => matchMedia(q).addEventListener('change', handler))
    return () => queries.forEach((q) => matchMedia(q).removeEventListener('change', handler))
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

export default function Masonry({
  items,
  ease = 'power3.out',
  duration = 0.6,
  stagger = 0.05,
  animateFrom = 'bottom',
  scaleOnHover = true,
  hoverScale = 0.97,
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
  const responsiveColumns = useMedia(columnQueries, columnCounts, 1)
  const columns = getEffectiveColumns(responsiveColumns, items.length)
  const [containerRef, { width }] = useMeasure()
  const [imagesReady, setImagesReady] = useState(false)
  const hasMounted = useRef(false)

  useEffect(() => {
    setImagesReady(false)
    preloadImages(items.map((i) => i.img)).then(() => setImagesReady(true))
  }, [items])

  const grid = useMemo(() => {
    if (!width) return []

    const colHeights = new Array(columns).fill(0)
    const columnWidth = width / columns

    return items.map((child) => {
      const col = colHeights.indexOf(Math.min(...colHeights))
      const x = columnWidth * col
      const height = child.height * heightScale
      const y = colHeights[col]

      colHeights[col] += height

      return { ...child, x, y, w: columnWidth, h: height }
    })
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

  const handleMouseEnter = (e, item) => {
    if (reduceMotion || !scaleOnHover) return
    gsap.to(`[data-masonry-key="${item.id}"]`, {
      scale: hoverScale,
      duration: 0.3,
      ease: 'power2.out',
    })
  }

  const handleMouseLeave = (e, item) => {
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
