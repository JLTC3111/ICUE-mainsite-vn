/** Org chart profile data (photos + ids). Copy via i18n (`orgChart.people.<id>`). */
export const orgProfiles = [
  {
    id: 'hanh',
    name: 'Nguyễn Hồng Hạnh',
    searchNames: ['Nguyễn Hồng Hạnh'],
    img: '/public/profilePhotos/hanhnguyenorgstructure.png',
    handle: 'hanh',
  },
  {
    id: 'lan-anh',
    name: 'Trần Thị Lan Anh',
    searchNames: ['TS. KTS Trần Thị Lan Anh', 'Trần Thị Lan Anh'],
    img: '/public/profilePhotos/tranthilananhorgstructure.png',
    handle: 'lananh',
  },
  {
    id: 'toan',
    name: 'Trần Quốc Toản',
    searchNames: ['KS Trần Quốc Toản', 'Trần Quốc Toản'],
    img: '/public/profilePhotos/tranquoctoanorgstructure.png',
    handle: 'toan',
  },
  {
    id: 'tam',
    name: 'Nguyễn Thanh Tâm',
    searchNames: ['Nguyễn Thanh Tâm'],
    img: '/public/profilePhotos/tamorgstructure.png',
    handle: 'tam',
  },
  {
    id: 'long',
    name: 'Đỗ Bảo Long',
    searchNames: ['Đỗ Bảo Long'],
    img: '/public/profilePhotos/longdoorgstructure.png',
    handle: 'long',
  },
  {
    id: 'hien',
    name: 'Phan Thị Hiến',
    searchNames: ['Phan Thị Hiến'],
    img: '/public/profilePhotos/hienorgstructure.png',
    handle: 'hien',
  },
  {
    id: 'tinh',
    name: 'Trịnh Thị Tình',
    searchNames: ['Trịnh Thị Tình'],
    img: '/public/profilePhotos/tinhorgstructure.png',
    handle: 'tinh',
  },
  {
    id: 'quynh-ly',
    name: 'Nguyễn Quỳnh Ly',
    searchNames: ['Nguyễn Quỳnh Ly'],
    img: '/public/profilePhotos/lyicueorgstructure.png',
    handle: 'quynhly',
  },
  {
    id: 'thi-ly',
    name: 'Nguyễn Thị Ly',
    searchNames: ['Nguyễn Thị Ly'],
    img: '/public/profilePhotos/lylyorgstructure.png',
    handle: 'thily',
  },
  {
    id: 'duong',
    name: 'Đinh Tùng Dương',
    searchNames: ['Đinh Tùng Dương'],
    img: '/public/profilePhotos/duongorgstructure.png',
    handle: 'duong',
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
