import { articleUrl, projectCardUrl } from '../lib/siteLinks'
import { ROUTE_PATHS } from '../lib/routes'

export const HERO = {
  bannerLabel: 'Tin tức mới nhất',
  bannerHref: '/newsroom/',
  title: 'Viện Nghiên Cứu Kinh Tế, Xây Dựng và Đô Thị',
  subtitle:
    'Sáng kiến cộng đồng và các giải pháp thực tiễn vì một tương lai tốt đẹp hơn.',
  actions: [
    { label: 'Liên hệ', href: ROUTE_PATHS.contact, variant: 'primary' },
    { label: 'Dự Án & Đề Tài', href: ROUTE_PATHS.pastProjects, variant: 'ghost' },
  ],
}

export const HOME_SECTIONS = [
  {
    id: 'home-past-projects',
    title: 'Dự án tiêu biểu',
    description:
      'Điểm nổi bật từ các hợp tác liên ngành và sáng kiến phát triển do cộng đồng khởi xướng.',
    linkLabel: 'Xem tất cả dự án →',
    linkHref: ROUTE_PATHS.pastProjects,
    cards: [
      {
        image: '/pastProjects/pp_1.jpg',
        imageAlt: 'Project preview 1',
        href: projectCardUrl(1),
        title: 'Điều chỉnh quy hoạch chung thành phố Lào Cai',
        description:
          'Tổng diện tích quy hoạch lên đến 28.162,64 ha, với mục tiêu hoàn thành vào năm 2045.',
      },
      {
        image: '/pastProjects/pp_3.jpg',
        imageAlt: 'Project preview 2',
        href: projectCardUrl(3),
        title: 'Quy Hoạch Phân Khu 6B (Phường Nguyễn Ái Quốc)',
        description:
          'Quy hoạch này hướng đến phát triển đồng bộ hạ tầng kỹ thuật, mở rộng không gian sinh thái.',
      },
      {
        image: '/pastProjects/pp_5.jpg',
        imageAlt: 'Project preview 3',
        href: projectCardUrl(5),
        title: 'Quy Hoạch Chung Đô Thị Đông Yên, Huyện Bắc Giang',
        description:
          'Dự án nhắm đến việc xây dựng một đô thị vệ tinh thông minh, hội tụ đầy đủ các chức năng.',
      },
    ],
  },
  {
    id: 'home-our-work',
    alt: true,
    title: 'Nghiên cứu & Báo cáo Kỹ thuật',
    description:
      'Cung cấp phân tích chuyên sâu và báo cáo kỹ thuật về hạ tầng đô thị và dữ liệu hoạt động, kèm đề xuất giải pháp thực tiễn.',
    linkLabel: 'Xem tất cả công việc →',
    linkHref: ROUTE_PATHS.ourWork,
    cards: [
      {
        image: '/work/ourWork_img1.jpg',
        imageAlt: 'Our work preview 1',
        href: ROUTE_PATHS.ourWork,
        title: 'Đánh Giá, Báo Cáo Công Trình',
        description:
          'Thiết kế và đánh giá dữ liệu cho hạ tầng số đáng tin cậy. Các báo cáo tổng hợp dữ liệu, xác định điểm thiếu sót và đưa ra giải pháp.',
      },
      {
        image: '/work/ourWork_img2.jpg',
        imageAlt: 'Our work preview 2',
        href: ROUTE_PATHS.ourWork,
        title: 'Khảo Sát Đo Lường',
        description:
          'Cung cấp các dịch vụ chuyên biệt để hỗ trợ việc phát triển, đánh giá và triển khai các dự án hạ tầng và xây dựng',
      },
      {
        image: '/work/ourWork_img3.jpg',
        imageAlt: 'Our work preview 3',
        href: ROUTE_PATHS.ourWork,
        title: 'Phân Tích Cơ Sở Hạ Tầng',
        description:
          'Ước tính chi phí chính xác và kiểm soát ngân sách từ giai đoạn lập kế hoạch đến khi hoàn thành dự án.',
      },
      {
        image: '/work/ourWork_img4.jpg',
        imageAlt: 'Our work preview 4',
        href: ROUTE_PATHS.ourWork,
        title: 'Chụp Ảnh Kiến Trúc Không Gian',
        description:
          'Chụp ảnh trên không – Hình ảnh và bản đồ từ thiết bị bay không người lái (Mavis Pro) phục vụ đánh giá và giám sát đất đai.',
      },
    ],
  },
  {
    id: 'home-news',
    title: 'Tin tức mới nhất',
    description: 'Thông báo, sự kiện và góc nhìn từ iCUE Vietnam.',
    linkLabel: 'Đọc tất cả tin tức →',
    linkHref: '/newsroom/',
    cards: [
      {
        image: '/news/articles/Card_1.jpg',
        imageAlt: 'News preview 1',
        href: articleUrl(1),
        title: 'Lễ Khánh Thành, Bàn Giao Công Viên Âu Cơ',
        description:
          'Viện Nghiên Cứu Kinh tế Xây dựng và Đô thị (ICUE), phối hợp cùng UBND thành phố Hội An. Với Sự Tham Dự Của Chủ Tịch UBND Tỉnh Quảng Nam - Ông Lê Văn Dũng',
      },
      {
        image: '/news/articles/Card_2.jpg',
        imageAlt: 'News preview 2',
        href: articleUrl(2),
        title: 'Diễn đàn Bảo tồn Khu vực Châu Á',
        description:
          'Liên minh Bảo tồn Thiên nhiên Quốc tế (IUCN) đã khai mạc tại Bangkok, Thái Lan. Sự kiện quy tụ gần 600 nhà lãnh đạo trong lĩnh vực bảo tồn từ khắp khu vực, bao gồm đại diện chính phủ, tổ chức phi chính phủ, nhà tài trợ và đối tác, học viện và khu vực tư nhân, cùng nhiều bên liên quan.',
      },
      {
        image: '/news/articles/Card_3.jpg',
        imageAlt: 'News preview 3',
        href: articleUrl(3),
        title: 'Giúp đỡ đồng bào ảnh hưởng do bão Yagi',
        description:
          'Làm theo lời kêu gọi của Uỷ ban Trung ương Mặt trận Tổ quốc Việt Nam, Viện NCKTXD&ĐT đã có thông báo kêu gọi cán bộ và các đối tác cùng các nhà hảo tâm chung tay đóng góp, giúp đỡ đồng bào bị ảnh hưởng bởi bão Yagi.',
      },
    ],
  },
  {
    id: 'home-recruitment',
    alt: true,
    title: 'Tuyển dụng',
    description: 'Tham gia đội ngũ theo sứ mệnh, tập trung vào đổi mới và tác động xã hội.',
    linkLabel: 'Xem vị trí tuyển dụng →',
    linkHref: ROUTE_PATHS.recruitment,
    cards: [
      {
        image: '/recruitment/office.jpg',
        imageAlt: 'Recruitment preview 1',
        href: ROUTE_PATHS.recruitment,
        title: 'Văn Hóa Hợp tác',
        description: 'Làm việc cùng nhà nghiên cứu, nhà thiết kế và người xây dựng cộng đồng.',
        imageOnly: true,
      },
      {
        image: '/recruitment/event.jpg',
        imageAlt: 'Recruitment preview 2',
        href: ROUTE_PATHS.recruitment,
        title: 'Học Hỏi & Phát triển',
        description: 'Học tập liên tục qua hội thảo và chương trình cố vấn.',
        imageOnly: true,
      },
      {
        image: '/recruitment/survey.jpg',
        imageAlt: 'Recruitment preview 3',
        href: ROUTE_PATHS.recruitment,
        title: 'Tạo Ra Khác biệt',
        description: 'Góp phần vào các chương trình tạo ra thay đổi thực sự.',
        imageOnly: true,
      },
    ],
  },
]
