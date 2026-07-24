import { useMemo } from 'react'
import GooeyNav from './GooeyNav'
import PhosphorYoutubeLogo from './icons/PhosphorYoutubeLogo'
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
          <PhosphorYoutubeLogo />
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
