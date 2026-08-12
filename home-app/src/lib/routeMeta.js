/**
 * Per-route title/description metadata.
 *
 * Single source of truth for the client-side tab title/meta description:
 *  - home-app/src/components/RouteHead.jsx: keeps document.title and the
 *    meta description tag in sync during client-side SPA navigation, since
 *    the static shell's <title>/<meta> (route-shells/*.html) only apply to
 *    the page that was actually requested from the server — React Router
 *    navigation between routes afterwards never touches the DOM head on
 *    its own.
 *
 * Titles/descriptions here mirror route-shells/*.html verbatim — keep them
 * in sync if the shells change. Keep pageFile in sync with LEGACY_PAGE_FILES
 * in ./routes.js.
 *
 * /our-work, /contact and /legal/* are absent on purpose: standalone apps own
 * their <head>. This list covers client-side navigation inside home-app only.
 */
export const ROUTE_META = [
  {
    slug: 'about-us',
    path: '/about-us',
    pageName: 'aboutUs',
    pageFile: 'aboutUs.html',
    title: 'Về chúng tôi | ICUE Vietnam',
    description: 'Tìm hiểu sứ mệnh, kinh nghiệm, đội ngũ và định hướng đổi mới của Viện Nghiên Cứu Kinh Tế Xây Dựng và Đô Thị.',
  },
  {
    slug: 'past-projects',
    path: '/past-projects',
    pageName: 'pastProjects',
    pageFile: 'pastProjects.html',
    title: 'Dự án đã thực hiện | ICUE Vietnam',
    description: 'Xem các dự án nghiên cứu, quy hoạch, phát triển đô thị và hoạt động chuyên môn tiêu biểu đã được ICUE Vietnam thực hiện.',
  },
  {
    slug: 'recruitment',
    path: '/recruitment',
    pageName: 'recruitment',
    pageFile: 'recruitment.html',
    title: 'Tuyển dụng | ICUE Vietnam',
    description: 'Cơ hội nghề nghiệp và cộng tác chuyên môn tại ICUE Vietnam trong nghiên cứu, quy hoạch, kinh tế xây dựng và phát triển đô thị.',
  },
  {
    slug: 'news-archive',
    path: '/news-archive',
    pageName: 'newsArchive',
    pageFile: 'News.html',
    title: 'Kho tin tức | ICUE Vietnam',
    description: 'Kho tin tức, bài viết, sự kiện và cập nhật hoạt động chuyên môn của ICUE Vietnam.',
  },
  {
    slug: 'notable-awards',
    path: '/notable-awards',
    pageName: 'notableAwards',
    pageFile: 'notableAwards.html',
    title: 'Giải thưởng nổi bật | ICUE Vietnam',
    description: 'Những giải thưởng, ghi nhận và dấu mốc chuyên môn nổi bật của ICUE Vietnam.',
  },
  {
    slug: 'community-activities',
    path: '/community-activities',
    pageName: 'communityActivities',
    pageFile: 'communityActivities.html',
    title: 'Hoạt động cộng đồng | ICUE Vietnam',
    description: 'Các chương trình, sáng kiến và hoạt động cộng đồng do ICUE Vietnam tổ chức hoặc đồng hành.',
  },
  {
    slug: 'faqs',
    path: '/faqs',
    pageName: 'FAQs',
    pageFile: 'FAQs.html',
    title: 'Câu hỏi thường gặp | ICUE Vietnam',
    description: 'Giải đáp những câu hỏi thường gặp về ICUE Vietnam, lĩnh vực hoạt động, dự án, hợp tác và liên hệ.',
  },
]

export const ROUTE_META_BY_PATH = Object.fromEntries(
  ROUTE_META.map((entry) => [entry.path, entry]),
)

export const DEFAULT_META = {
  title: 'ICUE Vietnam | Kinh tế Xây dựng và Phát triển Đô thị',
  description: 'Trang chính thức của ICUE Vietnam — nghiên cứu, tư vấn và đổi mới trong kinh tế xây dựng, quy hoạch và phát triển đô thị bền vững.',
}
