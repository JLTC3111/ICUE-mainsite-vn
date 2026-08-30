import { Component, Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EMPLOYEE_LANYARD_PHONE_QUERY } from './employeeLanyardConfig'
import './EmployeeLanyard.css'

/*
 * The WebGL scene is code-split: three.js + fiber + drei + rapier is a large
 * chunk on a page that is mostly an org chart, and phones and
 * `prefers-reduced-motion` visitors never render it (they get the CSS badge
 * below). Loading it lazily keeps that weight off their first paint.
 */
const Lanyard = lazy(() => import('./reactbits/Lanyard/Lanyard.jsx'))

/*
 * Canvas needs real font strings, not the CSS custom properties the rest of the
 * site uses — so these mirror shared/styles/typography.css by hand. Inter used
 * to lead here; it is no longer shipped (the site is Noto Sans throughout, see
 * shared/fonts/fonts.css), and naming a font we do not serve would silently
 * fall back to Arial and change the badge's metrics.
 */
const DEFAULT_BADGE_FONT = '"Noto Sans", Arial, sans-serif'
const JA_BADGE_FONT = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif'
const KO_BADGE_FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'

const BADGE_FONT_BY_LANGUAGE = {
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

/**
 * Largest size at or below `maxSize` that fits `text` into `maxWidth`.
 *
 * `weight` matters: the caller sets the same weight it will draw with, because
 * measuring 600 text with a 700 font over-estimates and shrinks the result more
 * than needed. Any letter-spacing must already be set on `ctx` — measureText
 * accounts for it.
 */
function fitText(ctx, text, maxWidth, maxSize, fontFamily, minSize = 24, weight = 700) {
  let size = maxSize
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${fontFamily}`
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

/**
 * Draw the badge artwork.
 *
 * Everything printed here is passed in already translated. The wordmark stays
 * "ICUE" in every language; the badge label, the fallback role and the strap
 * line under the wordmark all come from orgChart.* — they used to be English
 * string literals, which is why the card kept reading "EMPLOYEE BADGE" no
 * matter what the rest of the page said.
 */
async function createBadgeImage({
  profile,
  displayName,
  title,
  genericLabel,
  genericRole,
  badgeLabel,
  tagline,
  language,
  fontFamily,
}) {
  // Upper-casing is locale-sensitive (Turkish dotted i, Vietnamese diacritics);
  // for ja/ko it is simply a no-op, which is what we want.
  const upper = (value) => (value || '').toLocaleUpperCase(language || 'en')
  const badgeHeading = upper(badgeLabel)
  const strapLine = upper(tagline)

  await ensureBadgeFonts(
    fontFamily,
    `${displayName} ${title} ${genericLabel} ICUE ${badgeHeading} ${strapLine}`,
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
  ctx.letterSpacing = '5px'
  const headingSize = fitText(ctx, badgeHeading, 656, 24, fontFamily, 14, 600)
  ctx.font = `600 ${headingSize}px ${fontFamily}`
  ctx.fillStyle = 'rgba(222, 237, 250, 0.7)'
  ctx.fillText(badgeHeading, 56, 196)
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
  ctx.fillText(title || genericRole, 56, 906)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)'
  ctx.beginPath()
  ctx.moveTo(56, 958)
  ctx.lineTo(712, 958)
  ctx.stroke()

  const strapSize = fitText(ctx, strapLine, 600, 22, fontFamily, 13, 600)
  ctx.font = `600 ${strapSize}px ${fontFamily}`
  ctx.fillStyle = 'rgba(225, 237, 248, 0.68)'
  ctx.fillText(strapLine, 56, 1012)
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
 * The badge on a CSS strap — the still fallback for the WebGL lanyard.
 *
 * Same artwork: createBadgeImage composites it to a canvas either way, so this
 * is the 3D card's texture hung from an SVG cord with a transform-only sway.
 * It renders when the physics scene is not wanted — `prefers-reduced-motion`,
 * where a draggable swinging card is exactly what the visitor asked us not to
 * do — and when it cannot run at all. Nothing here touches the main thread.
 */
function HangingBadge({ image, label, onOpen, interactive }) {
  const Tag = interactive ? 'button' : 'div'

  return (
    <div className="employee-badge-hang">
      {/*
       * The cord: two strands running from the top corners down to the clasp,
       * the way a real lanyard reads when you look at it front-on. Drawn as SVG
       * rather than two skewed divs so the strands can actually curve and take
       * a woven texture, and so the join at the clasp is a single shape.
       */}
      <svg
        className="employee-badge-hang__cord"
        viewBox="0 0 300 150"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="lanyard-cord" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2f7fb8" />
            <stop offset="55%" stopColor="#1d5f92" />
            <stop offset="100%" stopColor="#12405f" />
          </linearGradient>
          <linearGradient id="lanyard-cord-sheen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(190,238,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <path
          className="employee-badge-hang__strand"
          d="M6 0 C 34 74, 96 116, 150 150"
        />
        <path
          className="employee-badge-hang__strand"
          d="M294 0 C 266 74, 204 116, 150 150"
        />
        {/* Highlight along the left strand only — light comes from upper left. */}
        <path
          className="employee-badge-hang__strand-sheen"
          d="M6 0 C 34 74, 96 116, 150 150"
        />
      </svg>

      <span className="employee-badge-hang__clasp" aria-hidden="true">
        <span className="employee-badge-hang__clasp-ring" />
      </span>

      <Tag
        {...(interactive ? { type: 'button', onClick: onOpen } : {})}
        className="employee-badge-hang__card"
      >
        <img src={image} alt={label} draggable="false" />
      </Tag>
    </div>
  )
}

/**
 * Falls back to the CSS badge if the WebGL scene cannot run.
 *
 * Two things can fail here and neither should take the org chart with it: the
 * lazy chunk failing to arrive, and three.js finding no WebGL context (old
 * hardware, a blocked GPU). Without a boundary either one throws past this
 * panel and blanks the page.
 */
class LanyardBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}

export default function EmployeeLanyard({ profile, onOpen }) {
  const { t, i18n } = useTranslation()
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const phoneDisabled = useMediaQuery(EMPLOYEE_LANYARD_PHONE_QUERY)
  const tabletLayout = useMediaQuery('(max-width: 1200px)')
  const displayName = profile ? t(`orgChart.people.${profile.id}.displayName`) : ''
  const title = profile ? t(`orgChart.people.${profile.id}.title`) : t('orgChart.badgeGenericRole')
  const genericLabel = t('orgChart.badgeGeneric')
  const genericRole = t('orgChart.badgeGenericRole')
  const badgeLabel = t('orgChart.badgeLabel')
  const tagline = t('orgChart.badgeTagline')
  const language = (i18n.resolvedLanguage || i18n.language).split('-')[0]
  const badgeFontFamily = BADGE_FONT_BY_LANGUAGE[language] || DEFAULT_BADGE_FONT
  const [badgeImage, setBadgeImage] = useState(null)

  // Every translated string the artwork prints is a dependency: the badge is a
  // rasterised image, so it has to be redrawn when the language changes.
  const badgeRequest = useMemo(
    () => ({
      profile,
      displayName,
      title,
      genericLabel,
      genericRole,
      badgeLabel,
      tagline,
      language,
      fontFamily: badgeFontFamily,
    }),
    [
      profile, displayName, title, genericLabel, genericRole,
      badgeLabel, tagline, language, badgeFontFamily,
    ],
  )

  useEffect(() => {
    if (phoneDisabled || !profile) {
      setBadgeImage(null)
      return undefined
    }

    let cancelled = false
    setBadgeImage(null)
    createBadgeImage(badgeRequest).then((image) => {
      if (!cancelled) setBadgeImage(image)
    }).catch(() => {
      if (!cancelled) setBadgeImage(null)
    })
    return () => {
      cancelled = true
    }
  }, [badgeRequest, phoneDisabled])

  if (phoneDisabled) return null

  // The non-WebGL badge: the reduced-motion rendering, and what the boundary
  // above shows if the scene cannot run at all.
  const stillBadge = badgeImage ? (
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
  )

  return (
    <aside className="employee-lanyard" aria-live="polite">
      {/*
        Names the panel rather than the card. The badge label is printed on the
        badge artwork itself now, so repeating it here read as a duplicate — and
        sat left-aligned right where the cord's left strand comes down.
      */}
      <div className="employee-lanyard__heading">
        <span className="employee-lanyard__status" aria-hidden="true" />
        <span>{t('orgChart.badgePanelLabel')}</span>
      </div>

      <div
        className={`employee-lanyard__stage${tabletLayout ? ' is-compact' : ''}`}
        data-motion={reducedMotion ? 'reduced' : 'full'}
      >
        {reducedMotion || !profile ? (
          stillBadge
        ) : (
          <LanyardBoundary fallback={stillBadge}>
            <Suspense fallback={stillBadge}>
              <Lanyard
                /*
                 * Key on the profile only. Including the badge-image load state
                 * tore down and rebuilt the whole WebGL scene (renderer, physics
                 * rig, textures) a second time the moment the canvas-composited
                 * badge finished generating — the "loads twice on profile
                 * change". `frontImage` is already reactive inside Lanyard via
                 * useTexture, so the texture swaps in place without a remount.
                 */
                key={profile?.id || 'generic'}
                position={[0, 0, 26]}
                gravity={[0, -34, 0]}
                fov={22}
                frontImage={badgeImage}
                imageFit="cover"
                lanyardWidth={0.82}
                segmentLength={0.5}
                cardScale={tabletLayout ? 2.8 : 3.05}
                rigPosition={[0, 3.3, 0]}
                onCardClick={profile ? onOpen : undefined}
              />
            </Suspense>
          </LanyardBoundary>
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
