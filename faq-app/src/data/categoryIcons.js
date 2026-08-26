/**
 * The eight category glyphs, lifted verbatim out of src/pages/FAQs.html:249-330
 * where they were pasted inline as SVGRepo markup.
 *
 * Imported with Vite's `?raw` so the markup stays in readable .svg files rather
 * than as multi-kilobyte string literals in a JS module. They are authored
 * assets from this repository, not remote or user content, so rendering them
 * with dangerouslySetInnerHTML is safe — see CategoryIcon in FaqAccordion.jsx.
 */
import clients from '../icons/clients.svg?raw'
import costs from '../icons/costs.svg?raw'
import general from '../icons/general.svg?raw'
import legal from '../icons/legal.svg?raw'
import process from '../icons/process.svg?raw'
import services from '../icons/services.svg?raw'
import technology from '../icons/technology.svg?raw'
import timeline from '../icons/timeline.svg?raw'

export const CATEGORY_ICONS = {
  services,
  process,
  costs,
  legal,
  timeline,
  technology,
  clients,
  general,
}
