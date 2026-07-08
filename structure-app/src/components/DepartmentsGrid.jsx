export default function DepartmentsGrid({ departments }) {
  return (
    <div className="departments-grid">
      {departments.map((dept) => (
        <article key={dept.id} className="department-card">
          <div className="dept-icon">{dept.iconNode}</div>
          <h3>{dept.name}</h3>
          <p>{dept.description}</p>
          <br />
          <strong>Trưởng Phòng:</strong> {dept.head}
          <br />
          <strong>Liên Hệ:</strong>{' '}
          <a href={`mailto:${dept.email}`}>{dept.email}</a>
        </article>
      ))}
    </div>
  )
}
