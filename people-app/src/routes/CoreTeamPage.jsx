import { useEffect } from 'react'
import people from '../data/people.json'
import PageShell from '../components/PageShell'
import ProfileCarousel from '../components/ProfileCarousel'
import { useBackgroundVideo } from '../hooks/useBackgroundVideo'

const coreTeam = people.filter((p) => p.group === 'core')

export default function CoreTeamPage() {
  const { enabled, toggle, canToggle } = useBackgroundVideo()

  useEffect(() => {
    document.title = 'ICUE — Cán Bộ'
  }, [])

  return (
    <PageShell
      title="Cán Bộ"
      subtitle="Đội ngũ cán bộ nghiên cứu và hành chính đóng góp vào hoạt động hàng ngày của viện."
      showVideoToggle={canToggle}
      videoEnabled={enabled}
      onVideoToggle={toggle}
      desktopVideoSrc="/public/bgVideos/bg10.mp4"
      mobileVideoSrc="/public/bgVideos/bg10-mobile.mp4"
    >
      <ProfileCarousel profiles={coreTeam} group="core" />
    </PageShell>
  )
}
