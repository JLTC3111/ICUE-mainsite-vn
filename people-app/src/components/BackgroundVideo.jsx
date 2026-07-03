import './BackgroundVideo.css'

export default function BackgroundVideo({ desktopSrc, mobileSrc, enabled }) {
  if (!enabled) {
    return <div className="bg-video bg-video--fallback" aria-hidden="true" />
  }

  return (
    <div className="bg-video" aria-hidden="true">
      <video autoPlay muted loop playsInline className="bg-video__el">
        <source src={desktopSrc} type="video/mp4" media="(min-width: 1368px)" />
        <source src={mobileSrc} type="video/mp4" />
      </video>
      <div className="bg-video__overlay" />
    </div>
  )
}
