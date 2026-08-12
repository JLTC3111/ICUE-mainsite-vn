import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './EmployeeLanyard.css'

export const EMPLOYEE_LANYARD_PHONE_QUERY =
  '(max-width: 450px), (max-width: 520px) and (pointer: coarse), (max-height: 520px) and (pointer: coarse)'

const INTER_BADGE_FONT = '"Inter", Arial, sans-serif'
const VI_BADGE_FONT = '"Noto Sans", Arial, sans-serif'
const JA_BADGE_FONT = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif'
const KO_BADGE_FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'

const BADGE_FONT_BY_LANGUAGE = {
  vi: VI_BADGE_FONT,
  ja: JA_BADGE_FONT,
  ko: KO_BADGE_FONT,
}

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

function fitText(ctx, text, maxWidth, maxSize, fontFamily, minSize = 24) {
  let size = maxSize
  while (size > minSize) {
    ctx.font = `700 ${size}px ${fontFamily}`
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 2
  }
  return size
}

async function ensureBadgeFonts(fontFamily, sampleText) {
  if (!document.fonts?.load) return

  try {
    await Promise.all(
      [500, 600, 700, 800].map((weight) =>
        document.fonts.load(`${weight} 32px ${fontFamily}`, sampleText),
      ),
    )
  } catch {
    // Keep badge generation resilient if the Font Loading API is unavailable.
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

async function createBadgeImage({ profile, displayName, title, genericLabel, fontFamily }) {
  await ensureBadgeFonts(
    fontFamily,
    `${displayName} ${title} ${genericLabel} ICUE EMPLOYEE BADGE`,
  )

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
  ctx.font = `800 72px ${fontFamily}`
  ctx.fillStyle = '#f8fbff'
  ctx.fillText('ICUE', 56, 148)
  ctx.font = `600 24px ${fontFamily}`
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
      const photoFrame = { x: 42, y: 210, width: 684, height: 579 }
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
    ctx.font = `800 150px ${fontFamily}`
    ctx.fillStyle = 'rgba(128, 236, 255, 0.9)'
    ctx.textAlign = 'center'
    ctx.fillText('ICUE', 384, 555)
    ctx.textAlign = 'start'
  }

  const name = displayName || genericLabel
  const nameSize = fitText(ctx, name, 656, 52, fontFamily, 28)
  ctx.font = `700 ${nameSize}px ${fontFamily}`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(name, 56, 850)

  ctx.font = `500 30px ${fontFamily}`
  ctx.fillStyle = '#9be9ff'
  ctx.fillText(title || 'INSTITUTE STAFF', 56, 906)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)'
  ctx.beginPath()
  ctx.moveTo(56, 958)
  ctx.lineTo(712, 958)
  ctx.stroke()

  ctx.font = `600 22px ${fontFamily}`
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

/**
 * The badge on its lanyard.
 *
 * This used to be a WebGL scene: three.js + @react-three/fiber + drei, a
 * rapier physics rig and a meshline strap, so the card could be dragged and
 * swung. It cost roughly 3 MB of JavaScript, held a live renderer and a
 * physics step on a page that is mostly an org chart, and re-mounted whenever
 * a visitor picked a different person.
 *
 * The badge artwork was never 3D — it is composited to a canvas by
 * createBadgeImage and mapped onto a flat card. So the same picture hangs here
 * from a CSS strap with a transform-only sway. Nothing animates on the main
 * thread, the sway stops for `prefers-reduced-motion`, and hovering lifts the
 * card the way grabbing it used to.
 */
function HangingBadge({ image, label, onOpen, interactive }) {
  const Tag = interactive ? 'button' : 'div'

  return (
    <div className="employee-badge-hang">
      <span className="employee-badge-hang__strap" aria-hidden="true" />
      <span className="employee-badge-hang__clip" aria-hidden="true" />
      <Tag
        {...(interactive ? { type: 'button', onClick: onOpen } : {})}
        className="employee-badge-hang__card"
      >
        <img src={image} alt={label} draggable="false" />
      </Tag>
    </div>
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
  const language = (i18n.resolvedLanguage || i18n.language).split('-')[0]
  const badgeFontFamily = BADGE_FONT_BY_LANGUAGE[language] || INTER_BADGE_FONT
  const [badgeImage, setBadgeImage] = useState(null)

  const badgeRequest = useMemo(
    () => ({ profile, displayName, title, genericLabel, fontFamily: badgeFontFamily }),
    [profile, displayName, title, genericLabel, badgeFontFamily],
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

      <div
        className={`employee-lanyard__stage${tabletLayout ? ' is-compact' : ''}`}
        data-motion={reducedMotion ? 'reduced' : 'full'}
      >
        {badgeImage ? (
          <HangingBadge
            image={badgeImage}
            label={displayName || genericLabel}
            onOpen={onOpen}
            interactive={Boolean(profile)}
          />
        ) : (
          <StaticBadge
            profile={profile}
            displayName={displayName}
            title={title}
            genericLabel={genericLabel}
            onOpen={onOpen}
          />
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
