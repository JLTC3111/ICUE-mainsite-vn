import { useMemo, useState } from 'react'
import { orgProfiles, orgChartLevels, findProfile } from '../data/orgProfiles'
import { departments } from '../data/departments'
import { documentCategories, downloadDocument } from '../data/documents'
import OrgChart from '../components/OrgChart'
import DepartmentsGrid from '../components/DepartmentsGrid'
import LegalDocuments from '../components/LegalDocuments'
import ProfileModal from '../components/ProfileModal'
import DeptIcon from '../components/DeptIcon'

const TABS = [
  { id: 'org-chart', label: 'Cơ Cấu' },
  { id: 'departments', label: 'Phòng Ban' },
  { id: 'documents', label: 'Tài Liệu Pháp Lý' },
]

export default function StructurePage() {
  const [activeTab, setActiveTab] = useState('org-chart')
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

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
    <div className="structure-page">
      <div className="structure-container">
        <header className="structure-header">
          <h1>Viện Nghiên Cứu Kinh Tế Xây Dựng và Đô Thị</h1>
          <h3>Công Nghệ cho Tương Lai</h3>
        </header>

        <div className="structure-content-wrapper">
          <div className="structure-tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`structure-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'org-chart' && (
            <section className="structure-tab-content active" role="tabpanel">
              <h2 className="structure-section-title structure-section-title--underline">
                Sơ Đồ Nhân Sự
              </h2>
              <OrgChart levels={levels} onSelectPerson={openProfile} />
            </section>
          )}

          {activeTab === 'departments' && (
            <section className="structure-tab-content active" role="tabpanel">
              <h2 className="structure-section-title">Các Phòng Ban</h2>
              <DepartmentsGrid departments={departmentCards} />
            </section>
          )}

          {activeTab === 'documents' && (
            <section className="structure-tab-content active" role="tabpanel">
              <h2 className="structure-section-title">
                Tuân Thủ, Pháp Lý & Cơ Chế, Phúc Lợi
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
  )
}
