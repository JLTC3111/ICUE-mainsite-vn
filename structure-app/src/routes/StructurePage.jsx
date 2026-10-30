import { lazyWithRecovery as lazy } from '../../../shared/resilience/lazyWithRecovery.jsx'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { orgProfiles, orgChartLevels } from '../data/orgProfiles'
import { departments } from '../data/departments'
import { documentCategories, downloadDocument } from '../data/documents'
import PageShell from '../components/PageShell'
import OrgChart from '../components/OrgChart'
import ProfileModal from '../components/ProfileModal'
import DeptIcon from '../components/DeptIcon'
import { ICUE_BADGE_LOGO_SRC } from '../components/employeeLanyardConfig'
import '../components/EmployeeLanyard.css'
import { InteractiveGridPattern } from '../components/magicui/InteractiveGridPattern'
import { DiaTextReveal } from '../components/magicui/DiaTextReveal'
import { WordRotate } from '../components/magicui/WordRotate'
import { RippleButton } from '../components/magicui/RippleButton'
import { TransitionPanel } from '../components/motion-primitives/TransitionPanel'
import { useDocumentMeta } from '../../../shared/site-meta/useDocumentMeta'
import LatticeLoader, { loadingLabelForLocale } from '../../../shared/ui/LatticeLoader.jsx'
import { RecoveryNotice } from '../../../shared/resilience/RecoveryBoundary.jsx'

const loadDepartmentsGrid = () => import('../components/DepartmentsGrid')
const loadLegalDocuments = () => import('../components/LegalDocuments')
const loadEmployeeLanyard = () => import('../components/EmployeeLanyard')
const DepartmentsGrid = lazy(loadDepartmentsGrid)
const LegalDocuments = lazy(loadLegalDocuments)
const EmployeeLanyard = lazy(loadEmployeeLanyard)

function EmployeeLanyardPlaceholder({ profile, onOpen }) {
  const { t, i18n } = useTranslation()
  const label = t(profile ? `orgChart.people.${profile.id}.displayName` : 'orgChart.badgeGeneric')
  const role = t(profile ? `orgChart.people.${profile.id}.title` : 'orgChart.badgeGenericRole')

  return (
    <aside className="employee-lanyard" aria-live="polite">
      <div className="employee-lanyard__heading">
        <span className="employee-lanyard__status" aria-hidden="true" />
        <span>{t('orgChart.badgePanelLabel')}</span>
      </div>
      <div className="employee-lanyard__stage" data-motion="reduced">
        <button type="button" className="employee-badge-static" disabled={!profile} onClick={onOpen}>
          <span className="employee-badge-static__brand">ICUE</span>
          <span className="employee-badge-static__monogram">
            <img src={profile?.img || ICUE_BADGE_LOGO_SRC} alt="" />
          </span>
          <strong>{label}</strong>
          <span>{role}</span>
        </button>
      </div>
      <div className="employee-lanyard__identity">
        <strong>{label}</strong>
        <span>{role}</span>
        <p>{t(profile ? 'orgChart.badgeOpenProfile' : 'orgChart.badgeSelectHint')}</p>
        {profile && <LatticeLoader compact label={loadingLabelForLocale(i18n?.resolvedLanguage || i18n?.language)} />}
      </div>
    </aside>
  )
}

const TAB_IDS = [
  { id: 'org-chart', labelKey: 'tabs.orgChart' },
  { id: 'departments', labelKey: 'tabs.departments' },
  { id: 'documents', labelKey: 'tabs.documents' },
]

const TAB_PANEL_TRANSITION = { duration: 0.2, ease: 'easeInOut' }

const TAB_PANEL_VARIANTS = {
  enter: { opacity: 0, y: -50, filter: 'blur(4px)' },
  center: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: 50, filter: 'blur(4px)' },
}

export default function StructurePage() {
  const { t, i18n } = useTranslation()
  const { profileId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const searchTerm = searchParams.get('q') || ''
  const requestedProfileId = profileId || searchParams.get('profile') || ''
  const [activeTab, setActiveTab] = useState('org-chart')
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [badgeProfile, setBadgeProfile] = useState(null)

  const activeIndex = Math.max(
    0,
    TAB_IDS.findIndex((tab) => tab.id === activeTab),
  )

  useDocumentMeta({ title: t('meta.title'), description: t('meta.description') })

  useEffect(() => {
    if (searchTerm.trim()) setActiveTab('documents')
  }, [searchTerm])

  useEffect(() => {
    if (!requestedProfileId) return
    const requestedProfile = orgProfiles.find((profile) => profile.id === requestedProfileId)
    if (!requestedProfile) return
    void loadEmployeeLanyard()
    setActiveTab('org-chart')
    setBadgeProfile(requestedProfile)
    setSelectedProfile(requestedProfile)
  }, [requestedProfileId])

  const profileById = useMemo(() => {
    const map = new Map()
    for (const profile of orgProfiles) map.set(profile.id, profile)
    return map
  }, [])

  const levels = useMemo(
    () =>
      orgChartLevels.map((level) => ({
        ...level,
        people: level.people.map((id) => profileById.get(id)).filter(Boolean),
      })),
    [profileById],
  )

  const departmentCards = useMemo(
    () =>
      departments.map((dept) => ({
        ...dept,
        iconNode: <DeptIcon name={dept.icon} />,
      })),
    [],
  )

  const taglines = useMemo(
    () => [
      t('tagline'),
      t('taglines.shapingNextGeneration'),
      t('taglines.innovatingWithoutLimits'),
    ],
    [t, i18n.language],
  )

  function selectBadgeProfile(profile) {
    if (!profile) return
    setBadgeProfile(profile)
    setSelectedProfile(profile)
    void loadEmployeeLanyard()
  }

  return (
    <PageShell>
      <div className="structure-page">
        <div className="structure-container">
          <header className="structure-header">
            <InteractiveGridPattern
              className="interactive-grid-pattern--hero"
              width={28}
              height={28}
              squares={[36, 22]}
            />
            <div className="structure-header__content">
              <h1 className="structure-header__title">
                <DiaTextReveal
                  text={t('instituteName')}
                  textColor="var(--structure-heading-ink)"
                  colors={['var(--structure-heading-blue)', 'var(--structure-heading-violet)', 'var(--structure-heading-cyan)', 'var(--structure-heading-pink)', 'var(--structure-heading-blue)']}
                  duration={3}
                  delay={0.5}
                  loop
                  repeatDelay={5}
                  className="structure-header__reveal"
                />
              </h1>
              <WordRotate
                as="h3"
                className="structure-header__subtitle"
                duration={2800}
                words={taglines}
              />
            </div>
          </header>

          <div className="structure-content-wrapper">
            <div className="structure-tabs" role="tablist" aria-label={t('tabs.groupAria')}>
              {TAB_IDS.map((tab) => (
                <RippleButton
                  key={tab.id}
                  id={`structure-tab-${tab.id}`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`structure-panel-${tab.id}`}
                  className={`structure-tab${activeTab === tab.id ? ' active' : ''}`}
                  rippleColor="rgba(255, 255, 255, 0.65)"
                  duration="700ms"
                  onPointerEnter={() => {
                    if (tab.id === 'departments') void loadDepartmentsGrid()
                    if (tab.id === 'documents') void loadLegalDocuments()
                  }}
                  onFocus={() => {
                    if (tab.id === 'departments') void loadDepartmentsGrid()
                    if (tab.id === 'documents') void loadLegalDocuments()
                  }}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {t(tab.labelKey)}
                </RippleButton>
              ))}
            </div>

            <div className="structure-tabs-panel">
              <TransitionPanel
                activeIndex={activeIndex}
                transition={TAB_PANEL_TRANSITION}
                variants={TAB_PANEL_VARIANTS}
              >
                <section
                  id="structure-panel-org-chart"
                  className="structure-tab-content structure-tab-content--bento"
                  role="tabpanel"
                  aria-labelledby="structure-tab-org-chart"
                >
                  <h2 className="structure-section-title structure-section-title--on-dark structure-section-title--underline">
                    {t('orgChart.title')}
                  </h2>
                  <div className="org-chart-layout">
                    <div className="org-chart-layout__chart">
                      <OrgChart
                        levels={levels}
                        onSelectPerson={selectBadgeProfile}
                        selectedPersonId={badgeProfile?.id}
                      />
                    </div>
                    {badgeProfile ? (
                      <Suspense fallback={<EmployeeLanyardPlaceholder profile={badgeProfile} onOpen={() => setSelectedProfile(badgeProfile)} />}>
                        <EmployeeLanyard
                          profile={badgeProfile}
                          onOpen={() => setSelectedProfile(badgeProfile)}
                        />
                      </Suspense>
                    ) : (
                      <EmployeeLanyardPlaceholder />
                    )}
                  </div>
                </section>

                <section
                  id="structure-panel-departments"
                  className="structure-tab-content structure-tab-content--bento"
                  role="tabpanel"
                  aria-labelledby="structure-tab-departments"
                >
                  <h2 className="structure-section-title structure-section-title--on-dark">
                    {t('departments.title')}
                  </h2>
                  <Suspense fallback={<RecoveryNotice loading compact />}>
                    <DepartmentsGrid departments={departmentCards} />
                  </Suspense>
                </section>

                <section
                  id="structure-panel-documents"
                  className="structure-tab-content structure-tab-content--bento"
                  role="tabpanel"
                  aria-labelledby="structure-tab-documents"
                >
                  <h2 className="structure-section-title structure-section-title--on-dark">
                    {t('documents.title')}
                  </h2>
                  <Suspense fallback={<RecoveryNotice loading compact />}>
                    <LegalDocuments
                      categories={documentCategories}
                      searchTerm={searchTerm}
                      onDownload={downloadDocument}
                    />
                  </Suspense>
                </section>
              </TransitionPanel>
            </div>
          </div>
        </div>

        <ProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
      </div>
    </PageShell>
  )
}
