import { useMemo } from 'react'
import HeroVideoDialog from './magicui/HeroVideoDialog'
import EmployeeNameHighlighter from './EmployeeNameHighlighter'
import { embedUrlWithAutoplay, splitArticleHtmlSegments } from '../lib/articleHtmlSegments'

export default function ArticleHtmlContent({ html, className }) {
  const segments = useMemo(() => splitArticleHtmlSegments(html), [html])
  const hasVideo = segments.some((segment) => segment.kind === 'video')

  if (!hasVideo && segments.length === 1) {
    return (
      <EmployeeNameHighlighter
        className={className}
        html={segments[0].html ?? ''}
      />
    )
  }

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
          <EmployeeNameHighlighter
            key={`html-${index}`}
            className="article-detail__html-segment"
            html={segment.html}
          />
        )
      })}
    </div>
  )
}
