/** Org chart profile data (photos + bios for the modal). */
export const orgProfiles = [
  {
    id: 'hanh',
    name: 'Nguyễn Hồng Hạnh',
    displayName: 'Tiến Sỹ. Nguyễn Hồng Hạnh',
    searchNames: ['Nguyễn Hồng Hạnh'],
    img: '/public/profilePhotos/hanhnguyenorgstructure.png',
    title: 'Viện Trưởng',
    bio: 'Tiến Sỹ Nguyễn Hồng Hạnh — Viện trưởng Viện Nghiên cứu Kinh tế Xây Dựng và Đô thị. Chuyên gia tư vấn quy hoạch, phát triển đô thị và quản lý xây dựng.',
  },
  {
    id: 'lan-anh',
    name: 'Trần Thị Lan Anh',
    displayName: 'TS. KTS Trần Thị Lan Anh',
    searchNames: ['TS. KTS Trần Thị Lan Anh', 'Trần Thị Lan Anh'],
    img: '/public/profilePhotos/tranthilananhorgstructure.png',
    title: 'Phó Viện Trưởng',
    bio: 'TS.KTS Trần Thị Lan Anh — Chuyên gia quy hoạch và phát triển đô thị. Tiến Sỹ từ Đại học Tokyo.',
  },
  {
    id: 'toan',
    name: 'Trần Quốc Toản',
    displayName: 'KS. Trần Quốc Toản',
    searchNames: ['KS Trần Quốc Toản', 'Trần Quốc Toản'],
    img: '/public/profilePhotos/tranquoctoanorgstructure.png',
    title: 'Phó Viện Trưởng',
    bio: 'KS. Trần Quốc Toản — Kinh nghiệm trong lĩnh vực Hạ tầng kỹ thuật giao thông.',
  },
  {
    id: 'tam',
    name: 'Nguyễn Thanh Tâm',
    displayName: 'Kiến Trúc Sư. Nguyễn Thanh Tâm',
    searchNames: ['Nguyễn Thanh Tâm'],
    img: '/public/profilePhotos/tamorgstructure.png',
    title: 'Giám Đốc Vận Hành',
    bio: 'KTS. Nguyễn Thanh Tâm — Công tác trong lĩnh vực quy hoạch đô thị.',
  },
  {
    id: 'long',
    name: 'Đỗ Bảo Long',
    displayName: 'Thạc Sỹ. Đỗ Bảo Long',
    searchNames: ['Đỗ Bảo Long'],
    img: '/public/profilePhotos/longdoorgstructure.png',
    title: 'Giám Đốc Công Nghệ',
    bio: 'Đỗ Bảo Long — Thạc sỹ Quản Lý Dự Án từ Đại học Salford, Vương quốc Anh.',
  },
  {
    id: 'hien',
    name: 'Phan Thị Hiến',
    displayName: 'Cử Nhân. Phan Thị Hiến',
    searchNames: ['Phan Thị Hiến'],
    img: '/public/profilePhotos/hienorgstructure.png',
    title: 'Kế Toán Trưởng',
    bio: 'Phan Thị Hiến — Kế toán trưởng với nhiều năm kinh nghiệm trong lĩnh vực tài chính và kế toán.',
  },
  {
    id: 'tinh',
    name: 'Trịnh Thị Tình',
    displayName: 'Trịnh Thị Tình',
    searchNames: ['Trịnh Thị Tình'],
    img: '/public/profilePhotos/tinhorgstructure.png',
    title: 'Trưởng Phòng Hành Chính',
    bio: 'Trịnh Thị Tình — Trưởng phòng Hành chính với nhiều năm kinh nghiệm trong lĩnh vực quản lý nhân sự và hành chính.',
  },
  {
    id: 'quynh-ly',
    name: 'Nguyễn Quỳnh Ly',
    displayName: 'Nguyễn Quỳnh Ly',
    searchNames: ['Nguyễn Quỳnh Ly'],
    img: '/public/profilePhotos/lyicueorgstructure.png',
    title: 'Quản Lý Hồ Sơ Dự Án',
    bio: 'Nguyễn Quỳnh Ly — Quản lý hồ sơ dự án với nhiều năm kinh nghiệm trong lĩnh vực đấu thầu.',
  },
  {
    id: 'thi-ly',
    name: 'Nguyễn Thị Ly',
    displayName: 'Nguyễn Thị Ly',
    searchNames: ['Nguyễn Thị Ly'],
    img: '/public/profilePhotos/lylyorgstructure.png',
    title: 'Trưởng Phòng CSKH',
    bio: 'Nguyễn Thị Ly — Hỗ trợ dự án với các kĩ năng quản lý và phối hợp.',
  },
  {
    id: 'duong',
    name: 'Đinh Tùng Dương',
    displayName: 'Đinh Tùng Dương',
    searchNames: ['Đinh Tùng Dương'],
    img: '/public/profilePhotos/duongorgstructure.png',
    title: 'Cán Bộ Nghiên Cứu',
    bio: 'Đinh Tùng Dương — Cán bộ dự án với các kĩ năng quản lý và phối hợp.',
  },
]

/** Org chart levels — person ids matching orgProfiles. */
export const orgChartLevels = [
  {
    id: 'directors',
    connectors: false,
    people: ['lan-anh', 'hanh', 'toan'],
  },
  {
    id: 'managers',
    connectors: true,
    people: ['long', 'tam', 'hien'],
  },
  {
    id: 'staff',
    connectors: true,
    people: ['tinh', 'quynh-ly', 'thi-ly', 'duong'],
  },
]

export function findProfile(query) {
  const search = (query || '').trim().toLowerCase()
  if (!search) return null
  return (
    orgProfiles.find(
      (p) =>
        p.id === search ||
        p.name.toLowerCase().includes(search) ||
        search.includes(p.name.toLowerCase()) ||
        p.searchNames.some(
          (n) => n.toLowerCase().includes(search) || search.includes(n.toLowerCase()),
        ),
    ) || null
  )
}
