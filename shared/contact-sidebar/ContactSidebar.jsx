import { memo, useId, useRef } from 'react'
import { ICUE_ZALO_PHONE, openZaloChat, zaloWebUrl } from '@icue/zalo/zaloLink'
import { staffPortalCopy, staffPortalUrl } from './staffPortal.js'
import { useAudioVisualizer } from './useAudioVisualizer'
import { useBackgroundAppearance, useMusicBarColor } from './useMusicBarColor'
import useFloatingCollapse from '../ui/useFloatingCollapse.js'
import FloatingCollapseControls from '../ui/FloatingCollapseControls.jsx'
import { floatingCollapseCopy } from '../ui/floatingCollapseCopy.js'
import './ContactSidebar.css'

function StaffLoginIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" stroke="#fff" strokeWidth="4" />
      <path d="M3 12h12m-5-5 5 5-5 5" stroke="#fff" strokeWidth="4" />
      <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5M3 12h12m-5-5 5 5-5 5" />
    </svg>
  )
}

function ZaloIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M25 3C12.85 3 3 11.73 3 22.5c0 5.88 2.94 11.15 7.6 14.72L8.5 46l10.2-4.7c2.02.5 4.13.75 6.3.75 12.15 0 22-8.73 22-19.5S37.15 3 25 3Z"
        fill="#fff"
        stroke="#000"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g fill="#000" transform="translate(-3 0)">
        <path d="M20.5632 17H10.8382V19.0853H17.5869L10.9329 27.3317C10.7244 27.635 10.5728 27.9194 10.5728 28.5639V29.0947H19.748C20.203 29.0947 20.5822 28.7156 20.5822 28.2606V27.1421H13.4922L19.748 19.2938C19.8428 19.1801 20.0134 18.9716 20.0893 18.8768L20.1272 18.8199C20.4874 18.2891 20.5632 17.8341 20.5632 17.2844V17Z" />
        <path d="M32.9416 29.0947H34.3255V17H32.2402V28.3933C32.2402 28.7725 32.5435 29.0947 32.9416 29.0947Z" />
        <path d="M25.814 19.6924C23.1979 19.6924 21.0747 21.8156 21.0747 24.4317C21.0747 27.0478 23.1979 29.171 25.814 29.171C28.4301 29.171 30.5533 27.0478 30.5533 24.4317C30.5723 21.8156 28.4491 19.6924 25.814 19.6924ZM25.814 27.2184C24.2785 27.2184 23.0273 25.9672 23.0273 24.4317C23.0273 22.8962 24.2785 21.645 25.814 21.645C27.3495 21.645 28.6007 22.8962 28.6007 24.4317C28.6007 25.9672 27.3685 27.2184 25.814 27.2184Z" />
        <path d="M40.4867 19.6162C37.8516 19.6162 35.7095 21.7584 35.7095 24.3934C35.7095 27.0285 37.8516 29.1707 40.4867 29.1707C43.1217 29.1707 45.2639 27.0285 45.2639 24.3934C45.2639 21.7584 43.1217 19.6162 40.4867 19.6162ZM40.4867 27.2181C38.9322 27.2181 37.681 25.9669 37.681 24.4124C37.681 22.8579 38.9322 21.6067 40.4867 21.6067C42.0412 21.6067 43.2924 22.8579 43.2924 24.4124C43.2924 25.9669 42.0412 27.2181 40.4867 27.2181Z" />
        <path d="M29.4562 29.0944H30.5747V19.957H28.6221V28.2793C28.6221 28.7153 29.0012 29.0944 29.4562 29.0944Z" />
      </g>
    </svg>
  )
}

function MessengerIcon() {
  return (
    <svg
      width="30"
      height="30"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      viewBox="64 64 384 384"
    >
      <path
        fill="#fff"
        stroke="#000"
        strokeWidth="16"
        strokeLinejoin="round"
        d="M256 78.2c-102.4 0-181.8 75 -181.8 176.4c0 53 21.7 98.8 57 130.4a14.7 14.7 0 015 10.4l1 32.3a14.6 14.6 0 0020.4 12.9l36-16a14.5 14.5 0 019.8-.7a197.8 197.8 0 0052.6 7c102.4 0 181.8-75 181.8 -176.3S358.4 78.2 256 78.2z"
      />
      <path
        fill="#000"
        d="M146.8 306.1l53.4-84.7a27.3 27.3 0 0139.5-7.3l42.5 31.9a11 11 0 0013 0l57.5-43.6c7.6-5.8 17.6 3.4 12.5 11.5l-53.4 84.7a27.3 27.3 0 01-39.4 7.3L229.9 274a11 11 0 00-13.2 0l-57.4 43.6c-7.6 5.8-17.6 -3.4 -12.5 -11.5z"
      />
    </svg>
  )
}

function ContactSidebar({ musicIconColor, contentKey = '', locale = 'vi' }) {
  const collapse = useFloatingCollapse({ storageKey: 'icue:contact-sidebar:collapse' })
  const controlsId = useId()
  const collapseCopy = floatingCollapseCopy(locale)
  const musicRef = useRef(null)
  const controlsRef = useRef(null)
  const controlsAppearance = useBackgroundAppearance(controlsRef, true, `${contentKey}:${collapse.collapsed}`)
  const { toggle: toggleMusic, isPlaying, isAnimating } = useAudioVisualizer()
  const sampledMusicColor = useMusicBarColor(musicRef, musicIconColor == null && !collapse.collapsed, contentKey)
  const musicColor = musicIconColor ?? sampledMusicColor
  const staffCopy = staffPortalCopy(locale)

  return (
    <>
      <aside
        className="contact-sidebar"
        aria-label={collapseCopy.sidebar}
        data-collapsed={collapse.collapsed}
        data-auto-collapse={collapse.automatic}
        {...collapse.interactionProps}
      >
        <FloatingCollapseControls
          controlsRef={controlsRef}
          iconColor={controlsAppearance.color}
          overVideo={controlsAppearance.overVideo}
          collapse={collapse}
          controlsId={controlsId}
          expandLabel={collapseCopy.expandSidebar}
          collapseLabel={collapseCopy.collapseSidebar}
          copy={collapseCopy}
        />
        <div
          id={controlsId}
          className="contact-sidebar__body"
          aria-hidden={collapse.collapsed || undefined}
          inert={collapse.collapsed || undefined}
        >
          <div className="contact-sidebar__actions">
            <button
              type="button"
              className="contact-sidebar__music"
              ref={musicRef}
              onClick={toggleMusic}
              aria-label="Toggle background music"
              aria-pressed={isPlaying}
              data-icue-music-toggle=""
              data-animating={isAnimating && !collapse.collapsed}
              style={{ color: musicColor }}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                style={{ color: musicColor }}
              >
                {[3, 8, 13, 18].map((x) => (
                  <rect
                    key={x}
                    className="contact-sidebar__music-bar"
                    x={x}
                    y="3"
                    width="3"
                    height="18"
                    rx="1.5"
                  />
                ))}
              </svg>
            </button>

            <div className="contact-sidebar__divider" aria-hidden="true" />

            <a href="tel:+842437728485" className="contact-sidebar__item" aria-label="Call ICUE">
              <svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path
                  d="M20.19,13a10,10,0,0,1-3.43-.91,2,2,0,0,0-2.56.83l-.51.85a12.69,12.69,0,0,1-3.44-3.45l.86-.49a2,2,0,0,0,.83-2.56A10,10,0,0,1,11,3.81,2,2,0,0,0,9,2H5.13A3,3,0,0,0,2.86,3a3.13,3.13,0,0,0-.71,2.43A19,19,0,0,0,18.58,21.85a3,3,0,0,0,.42,0,3,3,0,0,0,2-.73,3,3,0,0,0,1-2.26V15A2,2,0,0,0,20.19,13Z"
                  fill="#ffffff"
                  stroke="black"
                />
              </svg>
            </a>

            <div className="contact-sidebar__divider" aria-hidden="true" />

            <a
              href={staffPortalUrl(locale)}
              className="contact-sidebar__item contact-sidebar__staff"
              aria-label={staffCopy.link}
              title={staffCopy.link}
            >
              <StaffLoginIcon />
            </a>

            <div className="contact-sidebar__divider" aria-hidden="true" />

            <a
              href={zaloWebUrl(ICUE_ZALO_PHONE)}
              className="contact-sidebar__item"
              aria-label="Zalo"
              onClick={(e) => openZaloChat(ICUE_ZALO_PHONE, e)}
            >
              <ZaloIcon />
            </a>

            <div className="contact-sidebar__divider" aria-hidden="true" />

            <a
              href="https://www.facebook.com/profile.php?id=100075982245583"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-sidebar__item contact-sidebar__item--messenger"
              aria-label="Messenger"
            >
              <MessengerIcon />
            </a>

            <div className="contact-sidebar__divider" aria-hidden="true" />
          </div>
        </div>
      </aside>

    </>
  )
}

export default memo(ContactSidebar)
