import people from '../../../people-app/src/data/people.json' with { type: 'json' }

const STRUCTURE_PROFILES = [
  {
    id: 'hanh',
    name: 'Nguyễn Hồng Hạnh',
    names: ['Nguyễn Hồng Hạnh'],
    photo: 'hanhnguyenorgstructure.png',
    title: {
      vi: 'Viện Trưởng',
      en: 'Director',
      de: 'Direktorin',
      fr: 'Directrice',
      ko: '원장',
      ja: '所長',
    },
  },
  {
    id: 'lan-anh',
    name: 'Trần Thị Lan Anh',
    names: ['Trần Thị Lan Anh', 'TS. KTS Trần Thị Lan Anh'],
    photo: 'tranthilananhorgstructure.png',
    title: {
      vi: 'Phó Viện Trưởng',
      en: 'Deputy Director',
      de: 'Stellvertretende Direktorin',
      fr: 'Directrice adjointe',
      ko: '부원장',
      ja: '副所長',
    },
  },
  {
    id: 'toan',
    name: 'Trần Quốc Toản',
    names: ['Trần Quốc Toản', 'KS Trần Quốc Toản'],
    photo: 'tranquoctoanorgstructure.png',
    title: {
      vi: 'Phó Viện Trưởng',
      en: 'Deputy Director',
      de: 'Stellvertretender Direktor',
      fr: 'Directeur adjoint',
      ko: '부원장',
      ja: '副所長',
    },
  },
  {
    id: 'tam',
    name: 'Nguyễn Thanh Tâm',
    names: ['Nguyễn Thanh Tâm'],
    photo: 'tamorgstructure.png',
    title: {
      vi: 'Giám Đốc Vận Hành',
      en: 'Operations Director',
      de: 'Operativer Direktor',
      fr: 'Directrice des opérations',
      ko: '운영 이사',
      ja: '運営ディレクター',
    },
  },
  {
    id: 'long',
    name: 'Đỗ Bảo Long',
    names: ['Đỗ Bảo Long'],
    photo: 'longdoorgstructure.png',
    title: {
      vi: 'Giám Đốc Công Nghệ',
      en: 'Technology Director',
      de: 'Technologiedirektor',
      fr: 'Directeur technologique',
      ko: '기술 이사',
      ja: '技術ディレクター',
    },
  },
  {
    id: 'hien',
    name: 'Phạm Thị Hiến',
    names: ['Phạm Thị Hiến'],
    photo: 'hienorgstructure.png',
    title: {
      vi: 'Kế Toán Trưởng',
      en: 'Chief Accountant',
      de: 'Hauptbuchhalterin',
      fr: 'Cheffe comptable',
      ko: '수석 회계',
      ja: '会計責任者',
    },
  },
  {
    id: 'tinh',
    name: 'Trịnh Thị Tình',
    names: ['Trịnh Thị Tình'],
    photo: 'tinhorgstructure.png',
    title: {
      vi: 'Trưởng Phòng Hành Chính',
      en: 'Head of Administration',
      de: 'Leiterin Verwaltung',
      fr: 'Responsable administrative',
      ko: '행정실장',
      ja: '総務部長',
    },
  },
  {
    id: 'quynh-ly',
    name: 'Nguyễn Quỳnh Ly',
    names: ['Nguyễn Quỳnh Ly'],
    photo: 'lyicueorgstructure.png',
    title: {
      vi: 'Quản Lý Hồ Sơ Dự Án',
      en: 'Project Records Manager',
      de: 'Projektakten-Managerin',
      fr: 'Responsable dossiers projets',
      ko: '프로젝트 기록 관리자',
      ja: 'プロジェクト文書管理',
    },
  },
  {
    id: 'thi-ly',
    name: 'Nguyễn Thị Ly',
    names: ['Nguyễn Thị Ly'],
    photo: 'lylyorgstructure.png',
    title: {
      vi: 'Trưởng Phòng CSKH',
      en: 'Head of Customer Care',
      de: 'Leiterin Kundenservice',
      fr: 'Responsable relation client',
      ko: '고객관리 팀장',
      ja: '顧客対応部長',
    },
  },
  {
    id: 'duong',
    name: 'Đinh Tùng Dương',
    names: ['Đinh Tùng Dương'],
    photo: 'duongorgstructure.png',
    title: {
      vi: 'Cán Bộ Nghiên Cứu',
      en: 'Research Officer',
      de: 'Forschungskraft',
      fr: 'Chargé de recherche',
      ko: '연구원',
      ja: '研究員',
    },
  },
]

const ORGANISATION_BYLINES = [
  'Admin',
  'ICUE',
  'ICUE Admin',
  'Organisation',
  'Organization',
  'Company',
  'Organisation/Company',
  'Organisation/Compnay',
  'Organization/Company',
  'Tổ chức',
  'Công ty',
]

const PEOPLE_DIRECTORY_TERMS = [
  // Vietnamese
  { locale: 'vi', terms: ['các chuyên gia', 'chuyên gia', 'các thành viên', 'thành viên', 'nhóm tư vấn', 'đội ngũ tư vấn'] },
  // English
  { locale: 'en', terms: ['advisory team', 'consulting team', 'team members', 'experts', 'expert', 'members', 'member'] },
  // German
  { locale: 'de', terms: ['Beratungsteam', 'Beraterteam', 'Expertinnen', 'Experten', 'Expertin', 'Experte', 'Mitglieder', 'Mitglied'] },
  // French
  { locale: 'fr', terms: ['équipe de conseil', 'équipe consultative', 'expertes', 'experts', 'experte', 'expert', 'membres', 'membre'] },
  // Korean and Japanese words commonly attach directly to particles, so their
  // matcher deliberately does not require Latin-style word boundaries.
  { locale: 'ko', looseBoundary: true, terms: ['컨설팅 팀', '전문가들', '전문가', '구성원', '자문팀'] },
  { locale: 'ja', looseBoundary: true, terms: ['コンサルティングチーム', '諮問チーム', '専門家', 'メンバー', '構成員'] },
]

function normalizeByline(value) {
  return String(value || '')
    .normalize('NFC')
    .trim()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi')
}

const PROFILE_BY_NAME = new Map(
  STRUCTURE_PROFILES.flatMap((profile) => (
    profile.names.map((name) => [normalizeByline(name), profile.id])
  )),
)

const ORGANISATION_BYLINE_KEYS = new Set(ORGANISATION_BYLINES.map(normalizeByline))
const PROFILE_BY_ID = new Map(STRUCTURE_PROFILES.map((profile) => [profile.id, profile]))

function uniqueNames(values) {
  const names = new Map()
  for (const value of values) {
    const name = String(value || '').normalize('NFC').trim()
    const key = normalizeByline(name)
    if (name && !names.has(key)) names.set(key, name)
  }
  return [...names.values()]
}

function localizedPersonTitles(person) {
  return Object.fromEntries(
    Object.entries(person.i18n || {}).map(([locale, fields]) => [locale, fields.title || '']),
  )
}

/**
 * The People app owns the complete employee list. Structure metadata is joined
 * by the exact Vietnamese name so article links can prefer its individual
 * profile route while still supporting future People-only profiles.
 */
export const EMPLOYEE_DIRECTORY = Object.freeze(people.map((person) => {
  const localizedNames = Object.values(person.i18n || {}).map((fields) => fields.name)
  const primaryName = person.i18n?.vi?.name || localizedNames[0] || person.id
  const structureProfile = STRUCTURE_PROFILES.find(
    (profile) => normalizeByline(profile.name) === normalizeByline(primaryName),
  ) || null

  return Object.freeze({
    id: person.id,
    group: person.group,
    name: primaryName,
    names: Object.freeze(uniqueNames([
      ...localizedNames,
      ...(structureProfile?.names || []),
    ])),
    photo: structureProfile
      ? `profilePhotos/${structureProfile.photo}`
      : String(person.photo || '').replace(/^\//, ''),
    title: structureProfile?.title || localizedPersonTitles(person),
    structureProfileId: structureProfile?.id || null,
    peoplePath: `${person.group === 'core' ? 'core-team' : 'experts'}?profile=${encodeURIComponent(person.id)}`,
  })
}))

const EMPLOYEE_BY_NAME = new Map(
  EMPLOYEE_DIRECTORY.flatMap((employee) => (
    employee.names.map((name) => [normalizeByline(name), employee])
  )),
)

const EMPLOYEE_BY_ID = new Map(
  EMPLOYEE_DIRECTORY.map((employee) => [employee.id, employee]),
)

const WORD_CHARACTER_RE = /[\p{L}\p{M}\p{N}_]/u
const JAPANESE_EMPLOYEE_SUFFIX_RE = /^(?:副所長|所長|担当専門家|専門家|研究員|運営ディレクター|技術ディレクター|会計責任者|総務部長|顧客対応部長|プロジェクト文書管理|教授|准教授|博士|技師|部長|局長|課長|会長|社長|先生|さん|さま|様|氏|が|は|を|に|と|も|へ|で|の)/u

function hasWordBoundary(text, start, end) {
  const before = start > 0 ? text[start - 1] : ''
  const after = end < text.length ? text[end] : ''
  return (!before || !WORD_CHARACTER_RE.test(before))
    && (!after || !WORD_CHARACTER_RE.test(after))
}

/**
 * Japanese honorifics, roles, and particles are normally attached directly to
 * a Latin-script personal name. Keep the strict left boundary so partial names
 * still cannot link, while accepting only known Japanese continuations on the
 * right.
 */
function hasJapaneseEmployeeBoundary(text, start, end) {
  const before = start > 0 ? text[start - 1] : ''
  if (before && WORD_CHARACTER_RE.test(before)) return false

  const after = end < text.length ? text[end] : ''
  return !after
    || !WORD_CHARACTER_RE.test(after)
    || JAPANESE_EMPLOYEE_SUFFIX_RE.test(text.slice(end))
}

const DIRECTORY_MATCHERS = (() => {
  const matchers = new Map()

  for (const employee of EMPLOYEE_DIRECTORY) {
    for (const name of employee.names) {
      const key = normalizeByline(name)
      if (!key || matchers.has(`employee:${key}`)) continue
      matchers.set(`employee:${key}`, {
        key,
        kind: 'employee',
        employee,
        looseBoundary: false,
      })
    }
  }

  for (const group of PEOPLE_DIRECTORY_TERMS) {
    for (const term of group.terms) {
      const key = normalizeByline(term)
      if (!key || matchers.has(`people:${key}`)) continue
      matchers.set(`people:${key}`, {
        key,
        kind: 'people',
        locale: group.locale,
        looseBoundary: Boolean(group.looseBoundary),
      })
    }
  }

  return [...matchers.values()].sort((a, b) => (
    b.key.length - a.key.length
    || (a.kind === 'employee' ? -1 : 1)
  ))
})()

export function getStructureAuthorProfile(profileId) {
  return PROFILE_BY_ID.get(profileId) || null
}

export function getEmployeeById(employeeId) {
  return EMPLOYEE_BY_ID.get(employeeId) || null
}

/** Find non-overlapping, exact employee names and localized People terms. */
export function findArticleDirectoryMentions(value) {
  const text = String(value || '').normalize('NFC')
  const foldedText = text.toLocaleLowerCase('vi')
  if (!foldedText) return []

  const candidates = []
  for (const matcher of DIRECTORY_MATCHERS) {
    let from = 0
    while (from < foldedText.length) {
      const start = foldedText.indexOf(matcher.key, from)
      if (start < 0) break
      const end = start + matcher.key.length

      const hasBoundary = matcher.looseBoundary
        || hasWordBoundary(foldedText, start, end)
        || (matcher.kind === 'employee'
          && hasJapaneseEmployeeBoundary(foldedText, start, end))

      if (hasBoundary) {
        candidates.push({
          start,
          end,
          text: text.slice(start, end),
          kind: matcher.kind,
          ...(matcher.employee ? { employee: matcher.employee } : {}),
          ...(matcher.locale ? { locale: matcher.locale } : {}),
        })
      }
      from = Math.max(end, start + 1)
    }
  }

  candidates.sort((a, b) => (
    a.start - b.start
    || (b.end - b.start) - (a.end - a.start)
    || (a.kind === 'employee' ? -1 : 1)
  ))

  const selected = []
  let coveredUntil = -1
  for (const candidate of candidates) {
    if (candidate.start < coveredUntil) continue
    selected.push(candidate)
    coveredUntil = candidate.end
  }
  return selected
}

/**
 * Resolve only verified, exact bylines. We deliberately keep accents and all
 * name characters significant so a misspelled person's name stays plain text.
 */
export function resolveAuthorLinkTarget(byline) {
  const key = normalizeByline(byline)
  if (!key) return null

  const employee = EMPLOYEE_BY_NAME.get(key)
  if (employee?.structureProfileId) {
    return { type: 'structure-profile', profileId: employee.structureProfileId }
  }
  if (employee) {
    return { type: 'people-profile', employeeId: employee.id, path: employee.peoplePath }
  }

  const profileId = PROFILE_BY_NAME.get(key)
  if (profileId) return { type: 'structure-profile', profileId }
  if (ORGANISATION_BYLINE_KEYS.has(key)) return { type: 'people' }
  return null
}
