import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import people from '../data/people.js'
import PageShell from '../components/PageShell'
import ProfileCarousel from '../components/ProfileCarousel'
import { useBackgroundVideo } from '../hooks/useBackgroundVideo'

const coreTeam = people.filter((p) => p.group === 'core')

export default function CoreTeamPage() {
  const { t, i18n } = useTranslation()
  const { enabled, toggle, canToggle } = useBackgroundVideo()

  useEffect(() => {
    document.title = t('meta.coreTitle')
  }, [t, i18n.language])

  return (
    <PageShell
      pageKey="core"
      showBackgroundToggle={canToggle}
      backgroundEnabled={enabled}
      onBackgroundToggle={toggle}
    >
      <ProfileCarousel profiles={coreTeam} group="core" />
    </PageShell>
  )
}
