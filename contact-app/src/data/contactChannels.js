import { ICUE_ZALO_PHONE, zaloWebUrl } from '@icue/zalo/zaloLink'

/**
 * Every address, number and door on this page, in one place. Copy lives in the
 * locale files; this file owns only what a person could dial, send to or walk
 * into, so a change of desk is one edit and not a search across components.
 */

export const PHONE_DISPLAY = '+84 (24) 3772 8485'
export const PHONE_TEL = '+842437728485'
export const GENERAL_EMAIL = 'info@icue.vn'

const OFFICE_ADDRESS = 'Số 20, Ngõ 114, Hoàng Ngân, Trung Hoà, Cầu Giấy, Hà Nội'

/**
 * Hoàng Ngân, geocoded through OpenStreetMap's Nominatim. Street-level, not
 * door-level: Ngõ 114 is an alley off Hoàng Ngân and is not separately mapped,
 * so the pin marks the road the alley opens onto. The caption says as much
 * rather than implying a precision the coordinate does not have.
 */
const OFFICE_LAT = 21.0097
const OFFICE_LON = 105.8057

/* Roughly 500m across — close enough to recognise the junction, wide enough to
   place it against Trung Hoà. Rounded because binary floats otherwise put
   `21.007199999999997` in the URL. */
const BBOX = [
  OFFICE_LON - 0.005,
  OFFICE_LAT - 0.0025,
  OFFICE_LON + 0.005,
  OFFICE_LAT + 0.0025,
].map((n) => n.toFixed(4))

export const OFFICE = {
  address: OFFICE_ADDRESS,
  lat: OFFICE_LAT,
  lon: OFFICE_LON,

  /* OpenStreetMap's own embed endpoint: no API key, no account, no per-load
     quota, and the tiles carry their own attribution. */
  embedUrl:
    `https://www.openstreetmap.org/export/embed.html?bbox=${BBOX.join('%2C')}`
    + `&layer=mapnik&marker=${OFFICE_LAT}%2C${OFFICE_LON}`,

  osmUrl: `https://www.openstreetmap.org/?mlat=${OFFICE_LAT}&mlon=${OFFICE_LON}#map=17/${OFFICE_LAT}/${OFFICE_LON}`,

  /* Directions go through Google Maps on the full address string rather than
     the coordinate — it knows the alley by name even though OSM does not, and
     the URL needs no key either. */
  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `ICUE Vietnam, ${OFFICE_ADDRESS}`,
  )}`,

  attributionUrl: 'https://www.openstreetmap.org/copyright',
}

/**
 * The four desks in the right-hand rail.
 *
 * These are the mailboxes the site already uses elsewhere — `contract@` and
 * `hr@` come from the department cards in structure-app, `info@` is the front
 * desk on every legacy page. If ICUE opens dedicated `projects@` or `press@`
 * boxes, swap the address in here and nothing else has to move; until then a
 * message to either of those subjects lands with reception, which is where it
 * would have been forwarded anyway.
 */
export const DESKS = [
  { id: 'project', email: GENERAL_EMAIL },
  { id: 'tender', email: 'contract@icue.vn' },
  { id: 'careers', email: 'hr@icue.vn' },
  { id: 'press', email: GENERAL_EMAIL },
]

/** Form topics, in the order the tabs render. `desk` decides where it goes. */
export const TOPICS = [
  { id: 'new-project', desk: 'project' },
  { id: 'tender', desk: 'tender' },
  { id: 'careers', desk: 'careers' },
  { id: 'press', desk: 'press' },
  { id: 'other', desk: 'project' },
]

export const DEFAULT_TOPIC = TOPICS[0].id

export function deskForTopic(topicId) {
  const topic = TOPICS.find((item) => item.id === topicId)
  return DESKS.find((desk) => desk.id === topic?.desk) ?? DESKS[0]
}

export const CHAT = {
  zaloPhone: ICUE_ZALO_PHONE,
  zaloDisplay: '+84 904 540 661',
  zaloUrl: zaloWebUrl(ICUE_ZALO_PHONE),
  /* Same destination the floating contact sidebar uses site-wide. */
  messengerUrl: 'https://www.facebook.com/profile.php?id=100075982245583',
}

/**
 * Site-root paths, not app assets: the capability statement is ~88 MB and
 * lives once in public/docs/, which `_redirects` maps to /docs/*.
 */
export const SHORTCUTS = [
  { id: 'capability', href: '/docs/capability_statement.pdf', external: true },
  { id: 'roles', href: '/recruitment', external: false },
  { id: 'faqs', href: '/faqs', external: false },
]
