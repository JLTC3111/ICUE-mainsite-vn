import { useEffect } from 'react'
import people from '../data/people.json'
import PageShell from '../components/PageShell'
import ProfileCarousel from '../components/ProfileCarousel'
import { useBackgroundVideo } from '../hooks/useBackgroundVideo'

const experts = people.filter((p) => p.group === 'experts')

export default function ExpertsPage() {
  const { enabled, toggle, canToggle } = useBackgroundVideo()

  useEffect(() => {
    document.title = 'ICUE — Chuyên Gia'
  }, [])

  return (
    <PageShell
      title="Chuyên Gia"
      subtitle="Đội ngũ lãnh đạo và chuyên gia hàng đầu của Viện Nghiên cứu Kinh tế Xây Dựng và Đô thị."
      showHrLink
      showVideoToggle={canToggle}
      videoEnabled={enabled}
      onVideoToggle={toggle}
      desktopVideoSrc="/public/bgVideos/blueflow.mp4"
      mobileVideoSrc="/public/bgVideos/moe_bg_mobile.mp4"
    >
      <ProfileCarousel profiles={experts} group="experts" />
    </PageShell>
  )
}
