import { useTranslation } from 'react-i18next'

export default function DepartmentsGrid({ departments }) {
  const { t } = useTranslation()

  return (
    <div className="departments-grid">
      {departments.map((dept) => (
        <article key={dept.id} className="department-card">
          <div className="dept-icon">{dept.iconNode}</div>
          <h3>{t(`departments.items.${dept.id}.name`)}</h3>
          <p>{t(`departments.items.${dept.id}.description`)}</p>
          <br />
          <strong>{t('departments.head')}:</strong> {dept.head}
          <br />
          <strong>{t('departments.contact')}:</strong>{' '}
          <a href={`mailto:${dept.email}`}>{dept.email}</a>
        </article>
      ))}
    </div>
  )
}
