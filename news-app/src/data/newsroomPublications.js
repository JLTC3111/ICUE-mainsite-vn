import publicationMedia from './publicationMedia.json'

// Original publisher names and locally cached identification/preview assets.
// Media provenance and credits are retained in publicationMedia.json.
const publication = (id, name, url) => ({ id, name, url, focusKey: id, ...publicationMedia[id] })

export const NEWSROOM_PARTNERS = [
  publication('nguoiDoThi', 'Người Đô Thị', 'https://nguoidothi.net.vn/'),
  publication('nguoiLaoDong', 'Báo Người Lao Động', 'https://nld.com.vn/'),
  publication('doThiMoi', 'Đô Thị Mới', 'https://dothi.reatimes.vn/'),
  publication('iucn', 'IUCN', 'https://iucn.org/'),
  publication('kienTruc', 'Tạp chí Kiến trúc', 'https://www.tapchikientruc.com.vn/'),
  // Ashui's journal profile includes archived issues; avoid the compromised legacy domain.
  publication('quyHoachDoThi', 'Tạp chí Quy hoạch Đô thị', 'https://ashui.com/tap-chi-quy-hoach-do-thi/'),
  publication('quyHoachXayDung', 'Tạp chí Quy hoạch Xây dựng', 'https://www.viup.vn/vn/Tap-chi-Quy-hoach-xay-dung-n106.html'),
  publication('xayDung', 'Tạp chí Xây dựng', 'https://tapchixaydung.vn/'),
  publication('kienTrucVietNam', 'Tạp chí Kiến trúc Việt Nam', 'https://vietnamarchi.vn/'),
  publication('reatimes', 'Tạp chí Bất động sản Việt Nam (Reatimes)', 'https://reatimes.vn/'),
]

export const RELATED_PUBLICATIONS = [
  publication('archDaily', 'ArchDaily', 'https://www.archdaily.com/'),
  publication('planetizen', 'Planetizen', 'https://www.planetizen.com/'),
  publication('urbanLand', 'Urban Land', 'https://www.urbanland.uli.org/'),
  publication('nextCity', 'Next City', 'https://nextcity.org/'),
  publication('placesJournal', 'Places Journal', 'https://placesjournal.org/'),
  publication('landscapeArchitecture', 'Landscape Architecture Magazine', 'https://landscapearchitecturemagazine.org/'),
]
