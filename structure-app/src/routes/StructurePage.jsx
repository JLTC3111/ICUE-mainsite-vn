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

  function openProfile(query) {
    const profile = typeof query === 'object' ? query : findProfile(query)
    if (profile) setSelectedProfile(profile)
  }

  return (
    <PageShell>
      <div className="structure-page">
        <div className="structure-container">
          <header className="structure-header">
            <h1>{t('instituteName')}</h1>
            <h3>{t('tagline')}</h3>
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
