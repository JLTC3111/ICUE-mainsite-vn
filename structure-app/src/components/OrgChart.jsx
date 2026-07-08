export default function OrgChart({ levels, onSelectPerson }) {
  return (
    <div className="org-chart">
      {levels.map((level) => (
        <div
          key={level.id}
          className={`org-level${level.connectors ? ' connectors' : ''}`}
        >
          {level.people.map((person) => (
            <button
              key={person.id}
              type="button"
              className="person-card"
              onClick={() => onSelectPerson(person)}
            >
              <h3>{person.displayName}</h3>
              <div className="title">{person.title}</div>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
