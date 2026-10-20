import { ArrowUpRight } from 'lucide-react';
import { getAppNavigation } from './appLinks.js';

export default function StaffPortalLinks({ locale = 'vi' }) {
  const copy = getAppNavigation(locale);
  return (
    <div className="icue-footer__portals" style={{ marginTop: 24 }}>
      <h4>{copy.portals}</h4>
      {copy.apps.filter(app => app.id !== 'website').map(app => (
        <a key={app.id} href={app.href} target="_blank" rel="noopener noreferrer" aria-label={`${app.label} (${copy.newTab})`}>
          {app.label} <ArrowUpRight size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: 'middle' }} />
        </a>
      ))}
    </div>
  );
}
