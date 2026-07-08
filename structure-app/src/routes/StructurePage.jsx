import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { orgProfiles, orgChartLevels, findProfile } from '../data/orgProfiles'
import { departments } from '../data/departments'
import { documentCategories, downloadDocument } from '../data/documents'
import PageShell from '../components/PageShell'
import OrgChart from '../components/OrgChart'
import DepartmentsGrid from '../components/DepartmentsGrid'
import LegalDocuments from '../components/LegalDocuments'
import ProfileModal from '../components/ProfileModal'
import DeptIcon from '../components/DeptIcon'
import { InteractiveGridPattern } from '../components/magicui/InteractiveGridPattern'
import { DiaTextReveal } from '../components/magicui/DiaTextReveal'
import { WordRotate } from '../components/magicui/WordRotate'

const TAB_IDS = [
  { id: 'org-chart', labelKey: 'tabs.orgChart' },
  { id: 'departments', labelKey: 'tabs.departments' },
  { id: 'documents', labelKey: 'tabs.documents' },
]

export default function StructurePage() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState('org-chart')
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    document.title = t('meta.title')
  }, [t, i18n.language])

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

  function openProfile(query) {
    const profile = typeof query === 'object' ? query : findProfile(query)
    if (profile) setSelectedProfile(profile)
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
                  textColor="#0f172a"
                  colors={['#368adf', '#2821a8', '#8ec5ff', '#c679c4', '#0358f7']}
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
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`structure-tab${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>

            {activeTab === 'org-chart' && (
              <section
                className="structure-tab-content structure-tab-content--bento active"
                role="tabpanel"
              >
                <h2 className="structure-section-title structure-section-title--on-dark structure-section-title--underline">
                  {t('orgChart.title')}
                </h2>
                <OrgChart levels={levels} onSelectPerson={openProfile} />
              </section>
            )}

            {activeTab === 'departments' && (
              <section
                className="structure-tab-content structure-tab-content--bento active"
                role="tabpanel"
              >
                <h2 className="structure-section-title structure-section-title--on-dark">
                  {t('departments.title')}
                </h2>
                <DepartmentsGrid departments={departmentCards} />
              </section>
            )}

            {activeTab === 'documents' && (
              <section
                className="structure-tab-content structure-tab-content--bento active"
                role="tabpanel"
              >
                <h2 className="structure-section-title structure-section-title--on-dark">
                  {t('documents.title')}
                </h2>
                <LegalDocuments
                  categories={documentCategories}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  onDownload={downloadDocument}
                />
              </section>
            )}
          </div>
        </div>

        <ProfileModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
      </div>
    </PageShell>
  )
}
