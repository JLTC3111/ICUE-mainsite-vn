import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './EmployeeLanyard.css'

const Lanyard = lazy(() => import('./reactbits/Lanyard/Lanyard'))
export const EMPLOYEE_LANYARD_PHONE_QUERY =
  '(max-width: 450px), (max-width: 520px) and (pointer: coarse), (max-height: 520px) and (pointer: coarse)'

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function fitText(ctx, text, maxWidth, maxSize, minSize = 24) {
  let size = maxSize
  while (size > minSize) {
    ctx.font = `700 ${size}px Inter, Arial, sans-serif`
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 2
  }
  return size
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

async function createBadgeImage({ profile, displayName, title, genericLabel }) {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 1100
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const background = ctx.createLinearGradient(0, 0, 768, 1100)
  background.addColorStop(0, '#173559')
  background.addColorStop(0.5, '#0c1c34')
  background.addColorStop(1, '#07111f')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, 768, 1100)

  const glow = ctx.createRadialGradient(590, 210, 10, 590, 210, 430)
  glow.addColorStop(0, 'rgba(29, 183, 255, 0.34)')
  glow.addColorStop(1, 'rgba(29, 183, 255, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 768, 1100)

  ctx.fillStyle = '#80ecff'
  ctx.fillRect(56, 58, 88, 8)
  ctx.font = '800 72px Inter, Arial, sans-serif'
  ctx.fillStyle = '#f8fbff'
  ctx.fillText('ICUE', 56, 148)
  ctx.font = '600 24px Inter, Arial, sans-serif'
  ctx.fillStyle = 'rgba(222, 237, 250, 0.7)'
  ctx.letterSpacing = '5px'
  ctx.fillText('EMPLOYEE BADGE', 56, 196)
  ctx.letterSpacing = '0px'

  roundedRect(ctx, 36, 204, 696, 593, 34)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(128, 236, 255, 0.24)'
  ctx.lineWidth = 3
  ctx.stroke()

  if (profile?.img) {
    try {
      const photo = await loadImage(profile.img)
      ctx.save()
      const photoFrame = { x: 50, y: 218, width: 668, height: 565 }
      roundedRect(
        ctx,
        photoFrame.x,
        photoFrame.y,
        photoFrame.width,
        photoFrame.height,
        26,
      )
      ctx.clip()
      const scale = Math.max(
        photoFrame.width / photo.width,
        photoFrame.height / photo.height,
      )
      const width = photo.width * scale
      const height = photo.height * scale
      const cropOverflow = Math.max(0, height - photoFrame.height)
      const topBias = Math.min(cropOverflow * 0.18, 34)
      ctx.drawImage(
        photo,
        photoFrame.x + (photoFrame.width - width) / 2,
        photoFrame.y - topBias,
        width,
        height,
      )
      const fade = ctx.createLinearGradient(0, 588, 0, 783)
      fade.addColorStop(0, 'rgba(7, 17, 31, 0)')
      fade.addColorStop(1, 'rgba(7, 17, 31, 0.82)')
      ctx.fillStyle = fade
      ctx.fillRect(
        photoFrame.x,
        560,
        photoFrame.width,
        photoFrame.y + photoFrame.height - 560,
      )
      ctx.restore()
    } catch {
      // The text identity remains usable if a profile photo cannot load.
    }
  } else {
    ctx.font = '800 150px Inter, Arial, sans-serif'
    ctx.fillStyle = 'rgba(128, 236, 255, 0.9)'
    ctx.textAlign = 'center'
    ctx.fillText('ICUE', 384, 555)
    ctx.textAlign = 'start'
  }

  const name = displayName || genericLabel
  const nameSize = fitText(ctx, name, 656, 52, 28)
  ctx.font = `700 ${nameSize}px Inter, Arial, sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(name, 56, 850)

  ctx.font = '500 30px Inter, Arial, sans-serif'
  ctx.fillStyle = '#9be9ff'
  ctx.fillText(title || 'INSTITUTE STAFF', 56, 906)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)'
  ctx.beginPath()
  ctx.moveTo(56, 958)
  ctx.lineTo(712, 958)
  ctx.stroke()

  ctx.font = '600 22px Inter, Arial, sans-serif'
  ctx.fillStyle = 'rgba(225, 237, 248, 0.68)'
  ctx.fillText('CONSTRUCTION ECONOMICS · URBAN PLANNING', 56, 1012)
  ctx.fillStyle = '#80ecff'
  ctx.beginPath()
  ctx.arc(682, 1005, 12, 0, Math.PI * 2)
  ctx.fill()

  return canvas.toDataURL('image/png')
}

function StaticBadge({ profile, displayName, title, genericLabel, onOpen }) {
  return (
    <button
      type="button"
      className="employee-badge-static"
      onClick={profile ? onOpen : undefined}
      disabled={!profile}
    >
      <span className="employee-badge-static__brand">ICUE</span>
      {profile ? <img src={profile.img} alt="" /> : <span className="employee-badge-static__monogram">ICUE</span>}
      <strong>{displayName || genericLabel}</strong>
      <span>{title}</span>
    </button>
  )
}

export default function EmployeeLanyard({ profile, onOpen }) {
  const { t, i18n } = useTranslation()
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const phoneDisabled = useMediaQuery(EMPLOYEE_LANYARD_PHONE_QUERY)
  const tabletLayout = useMediaQuery('(max-width: 1200px)')
  const displayName = profile ? t(`orgChart.people.${profile.id}.displayName`) : ''
  const title = profile ? t(`orgChart.people.${profile.id}.title`) : t('orgChart.badgeGenericRole')
  const genericLabel = t('orgChart.badgeGeneric')
  const [badgeImage, setBadgeImage] = useState(null)

  const badgeRequest = useMemo(
    () => ({ profile, displayName, title, genericLabel }),
    [profile, displayName, title, genericLabel, i18n.language],
  )

  useEffect(() => {
    if (phoneDisabled) {
      setBadgeImage(null)
      return undefined
    }

    let cancelled = false
    setBadgeImage(null)
    createBadgeImage(badgeRequest).then((image) => {
      if (!cancelled) setBadgeImage(image)
    })
    return () => {
      cancelled = true
    }
  }, [badgeRequest, phoneDisabled])

  if (phoneDisabled) return null

  return (
    <aside className="employee-lanyard" aria-live="polite">
      <div className="employee-lanyard__heading">
        <span className="employee-lanyard__status" aria-hidden="true" />
        <span>{t('orgChart.badgeLabel')}</span>
      </div>

      <div className="employee-lanyard__stage">
        {reducedMotion ? (
          <StaticBadge
            profile={profile}
            displayName={displayName}
            title={title}
            genericLabel={genericLabel}
            onOpen={onOpen}
          />
        ) : (
          <Suspense fallback={<div className="employee-lanyard__loading" aria-hidden="true" />}>
            <Lanyard
              key={`${profile?.id || 'generic'}-${badgeImage ? 'ready' : 'loading'}`}
              position={[0, 0, 26]}
              gravity={[0, -34, 0]}
              fov={22}
              frontImage={badgeImage}
              imageFit="cover"
              lanyardWidth={0.82}
              cardScale={tabletLayout ? 2.55 : 2.75}
              rigPosition={[0, 3.3, 0]}
              onCardClick={profile ? onOpen : undefined}
            />
          </Suspense>
        )}
      </div>

      <div className="employee-lanyard__identity">
        <strong>{displayName || genericLabel}</strong>
        <span>{title}</span>
        <p>{profile ? t('orgChart.badgeDragHint') : t('orgChart.badgeSelectHint')}</p>
        {profile ? (
          <button type="button" onClick={onOpen}>
            {t('orgChart.badgeOpenProfile')}
          </button>
        ) : null}
      </div>
    </aside>
  )
}
