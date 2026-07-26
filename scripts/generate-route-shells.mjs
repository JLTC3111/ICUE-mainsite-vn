import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist-home')
const indexPath = path.join(dist, 'index.html')
const shellDir = path.join(dist, 'route-shells')
const siteUrl = 'https://icue.vn'
const previewImage = `${siteUrl}/preview.jpg`

const routes = [
  {
    key: 'home',
    path: '/',
    title: 'ICUE Vietnam | Kinh tế Xây dựng và Phát triển Đô thị',
    description:
      'Trang chính thức của ICUE Vietnam — nghiên cứu, tư vấn và đổi mới trong kinh tế xây dựng, quy hoạch và phát triển đô thị bền vững.',
    heading: 'ICUE Vietnam',
    content:
      'Viện Nghiên Cứu Kinh Tế Xây Dựng và Đô Thị kết nối nghiên cứu, quy hoạch, đổi mới và thực tiễn để kiến tạo những đô thị bền vững.',
  },
  {
    key: 'contact',
    path: '/contact',
    title: 'Liên hệ | ICUE Vietnam',
    description:
      'Liên hệ ICUE Vietnam để trao đổi về nghiên cứu, tư vấn quy hoạch, phát triển đô thị, hợp tác chuyên môn và truyền thông.',
    heading: 'Liên hệ ICUE Vietnam',
    content:
      'Kết nối với ICUE Vietnam về dự án, nghiên cứu, hợp tác chuyên môn, tư vấn phát triển đô thị hoặc yêu cầu truyền thông.',
  },
  {
    key: 'about-us',
    path: '/about-us',
    title: 'Về chúng tôi | ICUE Vietnam',
    description:
      'Tìm hiểu sứ mệnh, kinh nghiệm, đội ngũ và định hướng đổi mới của Viện Nghiên Cứu Kinh Tế Xây Dựng và Đô Thị.',
    heading: 'Về ICUE Vietnam',
    content:
      'ICUE là đội ngũ chuyên gia quy hoạch và phát triển đô thị, cùng theo đuổi các giải pháp thích ứng khí hậu, bảo vệ môi trường và nâng cao chất lượng sống.',
  },
  {
    key: 'our-work',
    path: '/our-work',
    title: 'Lĩnh vực hoạt động | ICUE Vietnam',
    description:
      'Khám phá các lĩnh vực nghiên cứu, tư vấn, quy hoạch, chuyển giao công nghệ và phát triển đô thị của ICUE Vietnam.',
    heading: 'Lĩnh vực hoạt động',
    content:
      'ICUE thực hiện nghiên cứu khoa học, tư vấn quy hoạch, kinh tế đô thị, chuyển giao công nghệ và các chương trình phát triển bền vững.',
  },
  {
    key: 'past-projects',
    path: '/past-projects',
    title: 'Dự án đã thực hiện | ICUE Vietnam',
    description:
      'Xem các dự án nghiên cứu, quy hoạch, phát triển đô thị và hoạt động chuyên môn tiêu biểu đã được ICUE Vietnam thực hiện.',
    heading: 'Dự án đã thực hiện',
    content:
      'Danh mục dự án giới thiệu kinh nghiệm của ICUE trong quy hoạch, nghiên cứu ứng dụng, kinh tế xây dựng và phát triển đô thị.',
  },
  {
    key: 'recruitment',
    path: '/recruitment',
    title: 'Tuyển dụng | ICUE Vietnam',
    description:
      'Cơ hội nghề nghiệp và cộng tác chuyên môn tại ICUE Vietnam trong nghiên cứu, quy hoạch, kinh tế xây dựng và phát triển đô thị.',
    heading: 'Cơ hội tại ICUE Vietnam',
    content:
      'Khám phá các vị trí tuyển dụng và cơ hội cộng tác cùng đội ngũ nghiên cứu, quy hoạch và phát triển đô thị của ICUE.',
  },
  {
    key: 'news-archive',
    path: '/news-archive',
    title: 'Kho tin tức | ICUE Vietnam',
    description:
      'Kho tin tức, bài viết, sự kiện và cập nhật hoạt động chuyên môn của ICUE Vietnam.',
    heading: 'Kho tin tức ICUE',
    content:
      'Theo dõi các bài viết, sự kiện, nghiên cứu và cập nhật mới từ Viện Nghiên Cứu Kinh Tế Xây Dựng và Đô Thị.',
  },
  {
    key: 'notable-awards',
    path: '/notable-awards',
    title: 'Giải thưởng nổi bật | ICUE Vietnam',
    description:
      'Những giải thưởng, ghi nhận và dấu mốc chuyên môn nổi bật của ICUE Vietnam.',
    heading: 'Giải thưởng nổi bật',
    content:
      'Các giải thưởng và ghi nhận phản ánh đóng góp chuyên môn của ICUE trong nghiên cứu, quy hoạch và phát triển đô thị.',
  },
  {
    key: 'community-activities',
    path: '/community-activities',
    title: 'Hoạt động cộng đồng | ICUE Vietnam',
    description:
      'Các chương trình, sáng kiến và hoạt động cộng đồng do ICUE Vietnam tổ chức hoặc đồng hành.',
    heading: 'Hoạt động cộng đồng',
    content:
      'ICUE kết nối tri thức với cộng đồng thông qua các chương trình chia sẻ, sáng kiến môi trường và hoạt động phát triển đô thị.',
  },
  {
    key: 'faqs',
    path: '/faqs',
    title: 'Câu hỏi thường gặp | ICUE Vietnam',
    description:
      'Giải đáp những câu hỏi thường gặp về ICUE Vietnam, lĩnh vực hoạt động, dự án, hợp tác và liên hệ.',
    heading: 'Câu hỏi thường gặp',
    content:
      'Tìm câu trả lời nhanh về hoạt động, dự án, quy trình hợp tác, tuyển dụng và cách liên hệ với ICUE Vietnam.',
  },
  {
    key: 'privacy',
    path: '/privacy',
    title: 'Chính sách quyền riêng tư | ICUE Vietnam',
    description:
      'Chính sách quyền riêng tư và cách ICUE Vietnam thu thập, sử dụng và bảo vệ thông tin cá nhân.',
    heading: 'Chính sách quyền riêng tư',
    content:
      'Thông tin về dữ liệu được thu thập, mục đích xử lý, biện pháp bảo vệ và quyền riêng tư của người sử dụng website ICUE.',
  },
  {
    key: 'terms',
    path: '/terms',
    title: 'Điều khoản sử dụng | ICUE Vietnam',
    description:
      'Điều khoản và điều kiện áp dụng khi truy cập, sử dụng website và nội dung của ICUE Vietnam.',
    heading: 'Điều khoản sử dụng',
    content:
      'Các điều kiện điều chỉnh việc truy cập website, sử dụng nội dung và tương tác với các dịch vụ trực tuyến của ICUE Vietnam.',
  },
  {
    key: 'gdpr',
    path: '/gdpr',
    title: 'Quyền dữ liệu GDPR | ICUE Vietnam',
    description:
      'Thông tin về quyền dữ liệu cá nhân theo GDPR và cách gửi yêu cầu liên quan đến dữ liệu cho ICUE Vietnam.',
    heading: 'Quyền dữ liệu GDPR',
    content:
      'Tìm hiểu các quyền truy cập, chỉnh sửa, xóa, hạn chế và phản đối xử lý dữ liệu cá nhân theo GDPR.',
  },
  {
    key: 'cookies',
    path: '/cookies',
    title: 'Chính sách cookie | ICUE Vietnam',
    description:
      'Chính sách cookie giải thích cách website ICUE Vietnam sử dụng cookie và các công nghệ lưu trữ tương tự.',
    heading: 'Chính sách cookie',
    content:
      'Thông tin về các loại cookie, mục đích sử dụng và lựa chọn kiểm soát cookie khi truy cập website ICUE Vietnam.',
  },
]

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function replaceTag(html, pattern, replacement) {
  if (!pattern.test(html)) {
    throw new Error(`Route shell template is missing expected tag: ${pattern}`)
  }
  return html.replace(pattern, replacement)
}

function renderFallback(route) {
  const primaryLinks = routes
    .filter((item) => ['home', 'about-us', 'our-work', 'past-projects', 'recruitment', 'contact'].includes(item.key))
    .map(
      (item) =>
        `<a href="${escapeHtml(item.path)}">${escapeHtml(item.heading)}</a>`,
    )
    .join('\n          ')

  return `<div id="root">
      <main class="route-shell-fallback">
        <p class="route-shell-fallback__brand">ICUE Vietnam</p>
        <h1>${escapeHtml(route.heading)}</h1>
        <p>${escapeHtml(route.content)}</p>
        <nav aria-label="Các trang chính">
          ${primaryLinks}
        </nav>
      </main>
    </div>`
}

function renderShell(baseHtml, route) {
  const canonicalPath = route.canonicalPath || route.path
  const canonical = `${siteUrl}${canonicalPath === '/' ? '/' : canonicalPath}`
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: route.title,
    description: route.description,
    inLanguage: 'vi-VN',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: 'ICUE Vietnam',
    },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: previewImage,
    },
  }

  let html = baseHtml
  html = replaceTag(
    html,
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(route.title)}</title>`,
  )
  html = replaceTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(route.description)}" />`,
  )
  html = replaceTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonical}" />`,
  )
  html = replaceTag(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${canonical}" />`,
  )
  html = replaceTag(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
  )
  html = replaceTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
  )
  html = replaceTag(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
  )
  html = replaceTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
  )
  html = html.replace(
    '</head>',
    `    <meta name="icue:route" content="${escapeHtml(route.path)}" />
    <script type="application/ld+json">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>
    <style>
      .route-shell-fallback{max-width:760px;margin:0 auto;padding:clamp(5rem,12vw,9rem) 1.5rem 4rem;font-family:system-ui,sans-serif;line-height:1.65;color:#172033}
      .route-shell-fallback__brand{font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#47715f}
      .route-shell-fallback h1{font-size:clamp(2rem,6vw,4rem);line-height:1.08;margin:.5rem 0 1rem}
      .route-shell-fallback nav{display:flex;flex-wrap:wrap;gap:.75rem 1.25rem;margin-top:2rem}
      .route-shell-fallback a{color:#185b89;text-underline-offset:.2em}
    </style>
  </head>`,
  )
  html = replaceTag(
    html,
    /<div\s+id="root">[\s\S]*?<\/div>/i,
    renderFallback(route),
  )
  return html
}

if (!fs.existsSync(indexPath)) {
  throw new Error('dist-home/index.html is missing. Run the Home Vite build first.')
}

const baseHtml = fs.readFileSync(indexPath, 'utf8')
fs.rmSync(shellDir, { recursive: true, force: true })
fs.mkdirSync(shellDir, { recursive: true })

for (const route of routes) {
  const html = renderShell(baseHtml, route)
  if (route.path === '/') {
    fs.writeFileSync(indexPath, html)
  } else {
    fs.writeFileSync(path.join(shellDir, `${route.key}.html`), html)
  }
}

const sitemapUrls = routes
  .filter((route) => !['privacy', 'terms', 'gdpr', 'cookies'].includes(route.key))
  .map((route) => {
    const pathname = route.canonicalPath || route.path
    const url = `${siteUrl}${pathname === '/' ? '/' : pathname}`
    return `  <url><loc>${escapeHtml(url)}</loc></url>`
  })
  .join('\n')

fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>
`,
)

fs.writeFileSync(
  path.join(dist, 'robots.txt'),
  `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`,
)

console.log(`Generated ${routes.length} route-specific HTML shells, sitemap.xml, and robots.txt.`)
