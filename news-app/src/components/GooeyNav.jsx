import { useRef, useEffect, useState } from 'react'
import './GooeyNav.css'

export default function GooeyNav({
  items,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex = 0,
  activateOnHover = false,
  showTextEffect = true,
  className = '',
  ariaLabel,
}) {
  const containerRef = useRef(null)
  const navRef = useRef(null)
  const filterRef = useRef(null)
  const textRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex)

  const noise = (n = 1) => n / 2 - Math.random() * n

  const getXY = (distance, pointIndex, totalPoints) => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180)
    return [distance * Math.cos(angle), distance * Math.sin(angle)]
  }

  const createParticle = (i, t, d, r) => {
    const rotate = noise(r / 10)
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
    }
  }

  const makeParticles = (element) => {
    if (particleCount <= 0) return

    const d = particleDistances
    const r = particleR
    const bubbleTime = animationTime * 2 + timeVariance
    element.style.setProperty('--time', `${bubbleTime}ms`)

    for (let i = 0; i < particleCount; i += 1) {
      const t = animationTime * 2 + noise(timeVariance * 2)
      const p = createParticle(i, t, d, r)
      element.classList.remove('active')

      setTimeout(() => {
        const particle = document.createElement('span')
        const point = document.createElement('span')
        particle.classList.add('particle')
        particle.style.setProperty('--start-x', `${p.start[0]}px`)
        particle.style.setProperty('--start-y', `${p.start[1]}px`)
        particle.style.setProperty('--end-x', `${p.end[0]}px`)
        particle.style.setProperty('--end-y', `${p.end[1]}px`)
        particle.style.setProperty('--time', `${p.time}ms`)
        particle.style.setProperty('--scale', `${p.scale}`)
        particle.style.setProperty('--color', `var(--color-${p.color}, white)`)
        particle.style.setProperty('--rotate', `${p.rotate}deg`)

        point.classList.add('point')
        particle.appendChild(point)
        element.appendChild(particle)
        requestAnimationFrame(() => {
          element.classList.add('active')
        })
        setTimeout(() => {
          try {
            element.removeChild(particle)
          } catch {
            // ignore cleanup race
          }
        }, t)
      }, 30)
    }
  }

  const hideEffects = () => {
    if (filterRef.current) {
      filterRef.current.style.width = '0'
      filterRef.current.style.height = '0'
      filterRef.current.classList.remove('active')
      filterRef.current.querySelectorAll('.particle').forEach((p) => p.remove())
    }
    if (textRef.current) {
      textRef.current.classList.remove('active')
    }
  }

  const updateEffectPosition = (element, label) => {
    if (!containerRef.current || !filterRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const pos = element.getBoundingClientRect()

    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`,
    }
    Object.assign(filterRef.current.style, styles)

    if (showTextEffect && textRef.current) {
      Object.assign(textRef.current.style, styles)
      textRef.current.innerText = label
    }
  }

  const applyVisual = (liEl, index, { animateParticles = true } = {}) => {
    if (index < 0 || !liEl) return

    setActiveIndex(index)
    updateEffectPosition(liEl, items[index]?.label || '')

    if (filterRef.current) {
      filterRef.current.querySelectorAll('.particle').forEach((p) => p.remove())
    }

    if (textRef.current) {
      textRef.current.classList.remove('active')
      if (showTextEffect) {
        void textRef.current.offsetWidth
        textRef.current.classList.add('active')
      }
    }

    if (filterRef.current) {
      filterRef.current.classList.add('active')
      if (animateParticles) makeParticles(filterRef.current)
    }
  }

  const handleClick = (e, index) => {
    const item = items[index]
    item.onClick?.(e)

    const liEl = e.currentTarget.closest('li')
    if (liEl) applyVisual(liEl, index)
  }

  const handleMouseEnter = (e, index) => {
    if (!activateOnHover) return
    applyVisual(e.currentTarget, index)
  }

  const handleMouseLeave = () => {
    if (!activateOnHover) return
    setActiveIndex(-1)
    hideEffects()
  }

  const handleKeyDown = (e, index) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    const liEl = e.currentTarget.closest('li')
    if (liEl) applyVisual(liEl, index)
    e.currentTarget.click()
  }

  useEffect(() => {
    if (activateOnHover || initialActiveIndex < 0) return undefined
    if (!navRef.current || !containerRef.current) return undefined
    const activeLi = navRef.current.querySelectorAll('li')[initialActiveIndex]
    if (activeLi) {
      applyVisual(activeLi, initialActiveIndex, { animateParticles: false })
    }

    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex]
      if (currentActiveLi && activeIndex >= 0) {
        updateEffectPosition(currentActiveLi, items[activeIndex]?.label || '')
      }
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [activateOnHover, initialActiveIndex])

  useEffect(() => {
    if (activeIndex < 0) return
    const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex]
    if (currentActiveLi) {
      updateEffectPosition(currentActiveLi, items[activeIndex]?.label || '')
    }
  }, [activeIndex, items, showTextEffect])

  return (
    <div
      className={`gooey-nav-container ${className}`.trim()}
      ref={containerRef}
      onMouseLeave={handleMouseLeave}
    >
      <nav aria-label={ariaLabel}>
        <ul ref={navRef}>
          {items.map((item, index) => (
            <li
              key={item.href || item.label || index}
              className={activeIndex === index ? 'active' : ''}
              onMouseEnter={(e) => handleMouseEnter(e, index)}
            >
              <a
                href={item.href || '#'}
                target={item.target}
                rel={item.rel}
                aria-label={item.ariaLabel || item.label}
                onClick={(e) => handleClick(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              >
                {item.content || item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <span className="effect filter" ref={filterRef} aria-hidden="true" />
      {showTextEffect && <span className="effect text" ref={textRef} aria-hidden="true" />}
    </div>
  )
}
