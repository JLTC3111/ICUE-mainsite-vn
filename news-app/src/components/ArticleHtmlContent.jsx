import { useMemo } from 'react'
import HeroVideoDialog from './magicui/HeroVideoDialog'
import { embedUrlWithAutoplay, splitArticleHtmlSegments } from '../lib/articleHtmlSegments'

export default function ArticleHtmlContent({ html, className }) {
  const segments = useMemo(() => splitArticleHtmlSegments(html), [html])

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.kind === 'video') {
          return (
            <HeroVideoDialog
              key={`video-${segment.embedUrl}-${index}`}
              videoSrc={embedUrlWithAutoplay(segment.embedUrl)}
              thumbnailSrc={segment.thumbUrl}
              thumbnailAlt={segment.thumbAlt}
              animationStyle="from-center"
            />
          )
        }

        if (!segment.html?.trim()) return null

        return (
          <div
            key={`html-${index}`}
            dangerouslySetInnerHTML={{ __html: segment.html }}
          />
        )
      })}
    </div>
  )
}
