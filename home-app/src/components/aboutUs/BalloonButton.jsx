import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const BALLOON_COLORS = [
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#ffeead',
  '#d4a5a5',
  '#9b5de5',
]
const BALLOONS_PER_PRESS = 15

/**
 * "Thả Bóng!" — releases a staggered batch of balloons that float up the
 * viewport and delete themselves when the animation ends. Pressing again while
 * a batch is still rising adds to it, as the legacy page did.
 *
 * They render into <body> through a portal because `.balloon` is
 * `position: fixed` at `z-index: 999`: nesting them inside `.about-container`
 * would put them behind the page's own stacking context.
 */
export default function BalloonButton({ label }) {
  const [balloons, setBalloons] = useState([])
  const nextId = useRef(0)

  const release = () => {
    const batch = Array.from({ length: BALLOONS_PER_PRESS }, (_, index) => {
      nextId.current += 1
      return {
        id: nextId.current,
        color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
        left: `${Math.random() * 80 + 10}%`,
        delay: `${index * 0.2}s`,
      }
    })
    setBalloons((current) => [...current, ...batch])
  }

  const remove = (id) => {
    setBalloons((current) => current.filter((balloon) => balloon.id !== id))
  }

  return (
    <>
      <button id="balloonButton" className="balloon-button" onClick={release}>
        {label}
      </button>

      {balloons.length > 0 &&
        createPortal(
          balloons.map((balloon) => (
            <div
              key={balloon.id}
              className="balloon about-us-balloon"
              style={{
                backgroundColor: balloon.color,
                left: balloon.left,
                animationDelay: balloon.delay,
              }}
              onAnimationEnd={() => remove(balloon.id)}
            />
          )),
          document.body,
        )}
    </>
  )
}
