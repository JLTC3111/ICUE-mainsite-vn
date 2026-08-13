import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import people from '../data/people.js'
import PageShell from '../components/PageShell'
import ProfileCarousel from '../components/ProfileCarousel'
import { useBackgroundVideo } from '../hooks/useBackgroundVideo'
import { useDocumentMeta } from '../../../shared/site-meta/useDocumentMeta'

const coreTeam = people.filter((p) => p.group === 'core')

export default function CoreTeamPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { enabled, toggle, canToggle } = useBackgroundVideo()

  useDocumentMeta({ title: t('meta.coreTitle'), description: t('meta.description') })

  return (
    <PageShell
      pageKey="core"
      showBackgroundToggle={canToggle}
      backgroundEnabled={enabled}
      onBackgroundToggle={toggle}
    >
      <ProfileCarousel
        profiles={coreTeam}
        group="core"
        requestedProfileId={searchParams.get('profile') || ''}
      />
    </PageShell>
  )
}
