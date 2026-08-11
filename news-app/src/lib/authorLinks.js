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

export function getStructureAuthorProfile(profileId) {
  return PROFILE_BY_ID.get(profileId) || null
}

/**
 * Resolve only verified, exact bylines. We deliberately keep accents and all
 * name characters significant so a misspelled person's name stays plain text.
 */
export function resolveAuthorLinkTarget(byline) {
  const key = normalizeByline(byline)
  if (!key) return null

  const profileId = PROFILE_BY_NAME.get(key)
  if (profileId) return { type: 'structure-profile', profileId }
  if (ORGANISATION_BYLINE_KEYS.has(key)) return { type: 'people' }
  return null
}
