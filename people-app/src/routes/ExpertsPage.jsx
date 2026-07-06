import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import people from '../data/people.js'
import PageShell from '../components/PageShell'
import ProfileCarousel from '../components/ProfileCarousel'
import { useBackgroundVideo } from '../hooks/useBackgroundVideo'

const experts = people.filter((p) => p.group === 'experts')

export default function ExpertsPage() {
  const { t, i18n } = useTranslation()
  const { enabled, toggle, canToggle } = useBackgroundVideo()

  useEffect(() => {
    document.title = t('meta.expertsTitle')
  }, [t, i18n.language])

  return (
    <PageShell
      pageKey="experts"
      showHrLink
      showBackgroundToggle={canToggle}
      backgroundEnabled={enabled}
      onBackgroundToggle={toggle}
    >
      <ProfileCarousel profiles={experts} group="experts" />
    </PageShell>
  )
}
