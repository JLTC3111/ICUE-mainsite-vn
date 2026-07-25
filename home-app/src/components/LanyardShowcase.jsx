import { lazy, Suspense } from 'react'
import './LanyardShowcase.css'

const Lanyard = lazy(() => import('./reactbits/Lanyard/Lanyard'))

// Replace this PNG later to customise the face of the badge.
export const LANYARD_CARD_IMAGE = '/lanyard/card-front.png'

export default function LanyardShowcase() {
  return (
    <div
      className="home-hero__lanyard"
      role="img"
      aria-label="Thẻ ICUE 3D tương tác treo trên dây đeo"
    >
      <Suspense fallback={<div className="home-hero__lanyard-loading" aria-hidden="true" />}>
        <Lanyard
          position={[0, 0, 30]}
          gravity={[0, -40, 0]}
          fov={24}
          frontImage={LANYARD_CARD_IMAGE}
          imageFit="contain"
          lanyardWidth={0.9}
        />
      </Suspense>
    </div>
  )
}
