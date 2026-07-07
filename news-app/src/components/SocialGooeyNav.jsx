import { useMemo } from 'react'
import GooeyNav from './GooeyNav'
import { ICUE_ZALO_PHONE, openZaloChat, zaloWebUrl } from '@icue/zalo/zaloLink'
import './SocialGooeyNav.css'

function SocialIcon({ brand, children }) {
  return (
    <span className={`news-social-gooey__icon news-social-gooey__icon--${brand}`}>
      {children}
    </span>
  )
}

export default function SocialGooeyNav({ reduceMotion = false }) {
  const items = useMemo(() => [
    {
      label: 'YouTube',
      ariaLabel: 'YouTube',
      href: 'https://www.youtube.com/channel/UCy6xFBIvD8_i0gOJbyXE8xg',
      target: '_blank',
      rel: 'noopener noreferrer',
      content: (
        <SocialIcon brand="youtube">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 10.2v3.6l3.8-1.8L11 10.2z" fill="currentColor" stroke="none" />
          </svg>
        </SocialIcon>
      ),
    },
    {
      label: 'Facebook',
      ariaLabel: 'Facebook',
      href: 'https://www.facebook.com/profile.php?id=100075982245583',
      target: '_blank',
      rel: 'noopener noreferrer',
      content: (
        <SocialIcon brand="facebook">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M9.2 24V13H6V8.8h3.2V6.3C9.2 3.1 11.1 1.4 14 1.4c1.4 0 2.6.1 2.9.15V5h-2c-1.6 0-1.9.75-1.9 1.85V8.8h3.8L14.2 13h-3.2v11z" />
          </svg>
        </SocialIcon>
      ),
    },
    {
      label: 'Zalo',
      ariaLabel: 'Zalo',
      href: zaloWebUrl(ICUE_ZALO_PHONE),
      target: '_blank',
      rel: 'noopener noreferrer',
      onClick: (e) => openZaloChat(ICUE_ZALO_PHONE, e),
      content: (
        <SocialIcon brand="zalo">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 3C6.9 3 2.8 6.5 2.8 10.8c0 2.4 1.3 4.6 3.3 6-.2.9-.8 2.1-1.5 2.9-.3.3 0 .7.4.6 1.7-.4 3-1 3.9-1.6 1 .3 2 .4 3.1.4 5.1 0 9.2-3.5 9.2-7.8S17.1 3 12 3z" />
            <path className="news-social-gooey__zalo-mark" d="M8.7 8.9h6.6v1.3l-4 4.6h4.1v1.4H8.5v-1.3l4-4.6H8.7z" />
          </svg>
        </SocialIcon>
      ),
    },
  ], [])

  return (
    <GooeyNav
      className="news-social-gooey"
      ariaLabel="Social media"
      items={items}
      initialActiveIndex={-1}
      activateOnHover
      showTextEffect={false}
      particleCount={reduceMotion ? 0 : 10}
      colors={[1, 2, 3, 4]}
    />
  )
}
