/**
 * Glyphs lifted verbatim out of the legacy page: the six benefit icons from
 * src/pages/recruitment.html:415-444, the three gallery marks from :382-393,
 * and the location pin from the job-card template in src/script.js:3243.
 *
 * Imported with Vite's `?raw` so the markup stays in readable .svg files rather
 * than as multi-kilobyte string literals. They are authored assets from this
 * repository, not remote or user content, so rendering them with
 * dangerouslySetInnerHTML is safe — see Glyph below.
 */
import balance from '../icons/balance.svg?raw'
import growth from '../icons/growth.svg?raw'
import health from '../icons/health.svg?raw'
import impact from '../icons/impact.svg?raw'
import projects from '../icons/projects.svg?raw'
import salary from '../icons/salary.svg?raw'

import galleryEvent from '../icons/gallery-event.svg?raw'
import galleryOffice from '../icons/gallery-office.svg?raw'
import gallerySurvey from '../icons/gallery-survey.svg?raw'

import pin from '../icons/pin.svg?raw'

export { BENEFIT_KEYS, GALLERY_KEYS } from './contentKeys'

export const BENEFIT_ICONS = { salary, health, growth, balance, projects, impact }

export const GALLERY_ICONS = {
  survey: gallerySurvey,
  office: galleryOffice,
  event: galleryEvent,
}

export const PIN_ICON = pin
