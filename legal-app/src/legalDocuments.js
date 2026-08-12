export const LEGAL_DOCUMENTS = [
  {
    slug: 'privacy',
    tabLabel: 'Quyền riêng tư',
    eyebrow: 'Bảo vệ dữ liệu',
    title: 'Chính sách quyền riêng tư',
    summary:
      'Cách ICUE thu thập, sử dụng, lưu trữ và bảo vệ thông tin cá nhân khi bạn làm việc với chúng tôi hoặc sử dụng website.',
    description:
      'Chính sách quyền riêng tư và cách ICUE Vietnam thu thập, sử dụng và bảo vệ thông tin cá nhân.',
    updated: '18 tháng 8, 2025',
    icon: 'shield',
    accent: '#2563eb',
    accentSoft: '#dbeafe',
    sections: [
      {
        id: 'overview',
        title: 'Tổng quan',
        blocks: [
          {
            type: 'paragraph',
            text: 'Viện Nghiên cứu Kinh tế, Đô thị và Xây dựng (ICUE) cam kết bảo vệ quyền riêng tư và thông tin cá nhân của bạn. Chính sách này giải thích cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu.',
          },
          {
            type: 'callout',
            text: 'ICUE áp dụng các quy định bảo vệ dữ liệu cá nhân của Việt Nam và các yêu cầu GDPR có liên quan.',
          },
        ],
      },
      {
        id: 'collection',
        title: 'Thông tin chúng tôi thu thập',
        blocks: [
          {
            type: 'list',
            intro: 'Tùy theo cách bạn tương tác với ICUE, dữ liệu có thể bao gồm:',
            items: [
              ['Thông tin cá nhân', 'Họ tên, email, số điện thoại và địa chỉ.'],
              ['Thông tin nghề nghiệp', 'Kinh nghiệm làm việc, học vấn và kỹ năng.'],
              ['Thông tin kỹ thuật', 'Địa chỉ IP, loại trình duyệt và thiết bị sử dụng.'],
              ['Thông tin tương tác', 'Trang đã xem, thời điểm và cách bạn sử dụng website.'],
              ['Cookie và dữ liệu tương tự', 'Dữ liệu cần thiết để vận hành và cải thiện trải nghiệm.'],
            ],
          },
          {
            type: 'table',
            label: 'Thời gian lưu trữ dữ liệu',
            headers: ['Loại dữ liệu', 'Mục đích', 'Thời gian lưu trữ'],
            rows: [
              ['Thông tin liên hệ', 'Phản hồi yêu cầu, cập nhật dự án', '3 năm hoặc đến khi có yêu cầu xóa'],
              ['CV và hồ sơ ứng tuyển', 'Đánh giá và quản lý ứng viên', '2 năm sau khi ứng tuyển'],
              ['Dữ liệu website', 'Phân tích và cải thiện website', '12 tháng'],
            ],
          },
        ],
      },
      {
        id: 'use',
        title: 'Cách chúng tôi sử dụng thông tin',
        blocks: [
          {
            type: 'list',
            items: [
              'Cung cấp dịch vụ tư vấn và hỗ trợ khách hàng.',
              'Xử lý hồ sơ ứng tuyển và quản lý nhân sự.',
              'Gửi thông tin về dự án, sự kiện và cơ hội hợp tác.',
              'Cải thiện chất lượng website và dịch vụ.',
              'Phân tích xu hướng và thống kê sử dụng.',
              'Tuân thủ yêu cầu pháp luật và quy định hiện hành.',
            ],
          },
        ],
      },
      {
        id: 'security',
        title: 'Bảo mật thông tin',
        blocks: [
          {
            type: 'list',
            intro: 'Các biện pháp tổ chức và kỹ thuật được áp dụng gồm:',
            items: [
              'Mã hóa TLS cho dữ liệu truyền qua website.',
              'Kiểm soát truy cập và xác thực phù hợp với vai trò.',
              'Sao lưu dữ liệu và quy trình khôi phục.',
              'Đào tạo nhân sự về an ninh thông tin.',
              'Rà soát và cập nhật các biện pháp bảo mật định kỳ.',
            ],
          },
        ],
      },
      {
        id: 'sharing',
        title: 'Chia sẻ thông tin',
        blocks: [
          {
            type: 'list',
            intro: 'Thông tin chỉ được chia sẻ khi cần thiết:',
            items: [
              ['Đối tác dự án', 'Khi cần để thực hiện dự án hoặc dịch vụ đã thỏa thuận.'],
              ['Cơ quan có thẩm quyền', 'Khi pháp luật yêu cầu.'],
              ['Nhà cung cấp dịch vụ', 'Khi hỗ trợ vận hành website hoặc dịch vụ của ICUE.'],
              ['Thay đổi tổ chức', 'Trong trường hợp sáp nhập, chuyển giao hoặc mua lại hợp pháp.'],
            ],
          },
          {
            type: 'callout',
            tone: 'warning',
            text: 'ICUE không bán hoặc cho thuê thông tin cá nhân cho bên thứ ba vì mục đích thương mại.',
          },
        ],
      },
      {
        id: 'rights',
        title: 'Quyền của bạn',
        blocks: [
          {
            type: 'list',
            items: [
              ['Truy cập', 'Yêu cầu bản sao dữ liệu cá nhân mà ICUE đang lưu trữ.'],
              ['Chỉnh sửa', 'Cập nhật thông tin không chính xác hoặc chưa đầy đủ.'],
              ['Xóa dữ liệu', 'Yêu cầu xóa dữ liệu khi điều kiện pháp lý cho phép.'],
              ['Hạn chế xử lý', 'Tạm dừng một số hoạt động xử lý trong trường hợp phù hợp.'],
              ['Di chuyển dữ liệu', 'Nhận dữ liệu ở định dạng có cấu trúc và có thể đọc được.'],
              ['Phản đối', 'Phản đối xử lý dữ liệu, đặc biệt cho tiếp thị trực tiếp.'],
            ],
          },
          {
            type: 'link',
            text: 'Xem quy trình thực hiện đầy đủ tại trang Quyền GDPR.',
            href: '/legal/gdpr',
            label: 'Mở tài liệu GDPR',
          },
        ],
      },
      {
        id: 'tracking',
        title: 'Cookie và công nghệ tương tự',
        blocks: [
          {
            type: 'list',
            intro: 'Website có thể dùng cookie để:',
            items: [
              'Ghi nhớ tùy chọn của bạn.',
              'Phân tích lưu lượng và hành vi sử dụng.',
              'Cải thiện hiệu suất và trải nghiệm website.',
              'Đo lường nội dung và chiến dịch khi có sự đồng ý.',
            ],
          },
          {
            type: 'link',
            text: 'Bạn có thể xem danh mục cookie và quản lý tùy chọn bất cứ lúc nào.',
            href: '/legal/cookies',
            label: 'Quản lý cookie',
          },
        ],
      },
    ],
    contact: {
      title: 'Liên hệ về quyền riêng tư',
      response: 'ICUE sẽ phản hồi yêu cầu hợp lệ trong vòng 30 ngày.',
    },
  },
  {
    slug: 'terms',
    tabLabel: 'Điều khoản',
    eyebrow: 'Quy tắc sử dụng',
    title: 'Điều khoản sử dụng',
    summary:
      'Các điều kiện áp dụng khi truy cập website, sử dụng nội dung và làm việc với các dịch vụ trực tuyến của ICUE.',
    description:
      'Điều khoản và điều kiện áp dụng khi truy cập, sử dụng website và nội dung của ICUE Vietnam.',
    updated: '18 tháng 8, 2025',
    version: '2.1',
    icon: 'file',
    accent: '#7c3aed',
    accentSoft: '#ede9fe',
    sections: [
      {
        id: 'acceptance',
        title: 'Chấp nhận điều khoản',
        blocks: [
          {
            type: 'paragraph',
            text: 'Khi truy cập website hoặc sử dụng dịch vụ của ICUE, bạn đồng ý tuân thủ các điều khoản này. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ.',
          },
          {
            type: 'callout',
            text: 'Điều khoản có thể được cập nhật theo thời gian. Việc tiếp tục sử dụng sau khi nội dung mới có hiệu lực đồng nghĩa với việc bạn chấp nhận thay đổi.',
          },
        ],
      },
      {
        id: 'services',
        title: 'Dịch vụ và phạm vi',
        blocks: [
          {
            type: 'list',
            items: [
              ['Nghiên cứu và tư vấn', 'Kinh tế, phát triển đô thị, xây dựng và bền vững.'],
              ['Đào tạo', 'Khóa học và chương trình nâng cao năng lực.'],
              ['Thông tin', 'Báo cáo, nghiên cứu và dữ liệu chuyên ngành.'],
              ['Sự kiện', 'Hội thảo, tọa đàm và hoạt động chuyên môn.'],
              ['Website', 'Nền tảng thông tin và tương tác trực tuyến.'],
            ],
          },
          {
            type: 'table',
            label: 'Điều kiện theo loại dịch vụ',
            headers: ['Loại dịch vụ', 'Điều kiện', 'Thời hạn'],
            rows: [
              ['Tư vấn chuyên nghiệp', 'Theo hợp đồng đã ký', 'Theo thỏa thuận'],
              ['Đào tạo', 'Đăng ký và hoàn thành học phí', 'Thời gian khóa học'],
              ['Truy cập website', 'Tuân thủ điều khoản sử dụng', 'Không giới hạn'],
            ],
          },
        ],
      },
      {
        id: 'responsibilities',
        title: 'Quyền và trách nhiệm người dùng',
        blocks: [
          {
            type: 'cards',
            items: [
              {
                title: 'Quyền của bạn',
                items: [
                  'Truy cập dịch vụ đúng mục đích.',
                  'Nhận dịch vụ theo cam kết đã thỏa thuận.',
                  'Được bảo vệ dữ liệu cá nhân.',
                  'Khiếu nại và yêu cầu giải quyết tranh chấp.',
                  'Hủy dịch vụ theo điều kiện áp dụng.',
                ],
              },
              {
                title: 'Trách nhiệm của bạn',
                items: [
                  'Cung cấp thông tin chính xác.',
                  'Tuân thủ pháp luật và bảo mật tài khoản.',
                  'Hoàn thành nghĩa vụ tài chính đúng hạn.',
                  'Không lạm dụng dịch vụ.',
                  'Tôn trọng quyền sở hữu trí tuệ.',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'prohibited',
        title: 'Hành vi bị cấm',
        blocks: [
          {
            type: 'list',
            items: [
              'Sử dụng dịch vụ cho mục đích trái pháp luật.',
              'Phát tán mã độc hoặc gây gián đoạn hệ thống.',
              'Truy cập trái phép hệ thống, mạng lưới hoặc dữ liệu.',
              'Sao chép, chỉnh sửa hoặc phân phối nội dung khi chưa được phép.',
              'Quấy rối, đe dọa hoặc gây hại cho người khác.',
              'Thu thập thông tin cá nhân khi chưa có căn cứ hợp pháp.',
              'Dùng bot hoặc công cụ tự động theo cách gây ảnh hưởng đến dịch vụ.',
            ],
          },
          {
            type: 'callout',
            tone: 'warning',
            text: 'Vi phạm có thể dẫn đến đình chỉ hoặc chấm dứt quyền truy cập mà không cần thông báo trước.',
          },
        ],
      },
      {
        id: 'payment',
        title: 'Thanh toán và hoàn tiền',
        blocks: [
          {
            type: 'cards',
            items: [
              {
                title: 'Thanh toán',
                items: [
                  'Hoàn tất trước khi sử dụng dịch vụ, trừ khi có thỏa thuận khác.',
                  'Hình thức được chấp nhận tùy hợp đồng.',
                  'Phí được tính bằng VND nếu không có quy định khác.',
                  'Hóa đơn được cung cấp theo pháp luật.',
                ],
              },
              {
                title: 'Hoàn tiền',
                items: [
                  'Tư vấn: trong 7 ngày nếu công việc chưa bắt đầu.',
                  'Đào tạo: theo chính sách hủy của chương trình.',
                  'Tài liệu số: không hoàn sau khi đã tải hoặc truy cập.',
                  'Sự kiện: theo chính sách riêng của từng sự kiện.',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'intellectual-property',
        title: 'Quyền sở hữu trí tuệ',
        blocks: [
          {
            type: 'paragraph',
            text: 'Logo, thương hiệu, thiết kế, báo cáo nghiên cứu, tài liệu chuyên môn, phương pháp và cơ sở dữ liệu của ICUE được bảo vệ theo pháp luật sở hữu trí tuệ.',
          },
          {
            type: 'list',
            intro: 'Bạn có thể:',
            items: [
              'Xem nội dung cho mục đích cá nhân.',
              'Tải tài liệu khi được cấp phép.',
              'Chia sẻ liên kết đến website.',
              'Trích dẫn trong giới hạn hợp lý và ghi nguồn đầy đủ.',
            ],
          },
        ],
      },
      {
        id: 'liability',
        title: 'Giới hạn trách nhiệm',
        featured: true,
        blocks: [
          {
            type: 'list',
            intro: 'Trong giới hạn pháp luật cho phép, ICUE không chịu trách nhiệm cho:',
            items: [
              'Thiệt hại gián tiếp như mất lợi nhuận hoặc cơ hội kinh doanh.',
              'Gián đoạn do bảo trì, sự cố kỹ thuật hoặc bất khả kháng.',
              'Độ chính xác của thông tin do bên thứ ba cung cấp.',
              'Quyết định kinh doanh dựa trên thông tin tham khảo.',
              'Nội dung do người dùng tạo hoặc chia sẻ.',
            ],
          },
          {
            type: 'callout',
            tone: 'warning',
            text: 'Tổng trách nhiệm của ICUE không vượt quá giá trị dịch vụ đã thanh toán, trừ trường hợp pháp luật không cho phép giới hạn.',
          },
        ],
      },
      {
        id: 'termination',
        title: 'Chấm dứt dịch vụ',
        blocks: [
          {
            type: 'paragraph',
            text: 'ICUE có thể chấm dứt dịch vụ khi người dùng vi phạm điều khoản, không thanh toán, sử dụng dịch vụ trái pháp luật, gây thiệt hại hoặc cung cấp thông tin gian lận.',
          },
          {
            type: 'paragraph',
            text: 'Người dùng có thể chấm dứt khi không còn nhu cầu hoặc khi dịch vụ không đáp ứng cam kết theo thỏa thuận. Nghĩa vụ tài chính phát sinh trước thời điểm chấm dứt vẫn phải được hoàn thành.',
          },
        ],
      },
      {
        id: 'disputes',
        title: 'Luật áp dụng và tranh chấp',
        blocks: [
          {
            type: 'steps',
            items: [
              ['Thương lượng', 'Các bên thiện chí trao đổi trực tiếp.'],
              ['Hòa giải', 'Sử dụng tổ chức hòa giải phù hợp nếu cần.'],
              ['Trọng tài', 'Đệ trình lên Trung tâm Trọng tài Quốc tế Việt Nam khi có thỏa thuận.'],
              ['Tòa án', 'Đưa vụ việc đến tòa án có thẩm quyền tại Hà Nội.'],
            ],
          },
        ],
      },
      {
        id: 'other',
        title: 'Điều khoản khác',
        blocks: [
          {
            type: 'list',
            items: [
              ['Hiệu lực từng phần', 'Nếu một điều khoản vô hiệu, phần còn lại vẫn có hiệu lực.'],
              ['Ngôn ngữ', 'Phiên bản tiếng Việt là bản chính thức; bản dịch chỉ để tham khảo.'],
              ['Thông báo', 'Thông báo chính thức được gửi qua email hoặc đăng trên website.'],
              ['Điều khoản riêng', 'Hợp đồng cụ thể có thể bổ sung hoặc thay đổi nội dung áp dụng.'],
            ],
          },
        ],
      },
    ],
    contact: {
      title: 'Liên hệ pháp lý',
      response: 'ICUE sẽ phản hồi trong vòng 5 ngày làm việc.',
    },
  },
  {
    slug: 'gdpr',
    tabLabel: 'GDPR',
    eyebrow: 'Quyền dữ liệu',
    title: 'Quyền của bạn theo GDPR',
    summary:
      'Tìm hiểu tám quyền dữ liệu cơ bản và cách gửi yêu cầu đến ICUE theo Quy định Bảo vệ Dữ liệu Chung của Liên minh Châu Âu.',
    description:
      'Thông tin về quyền dữ liệu cá nhân theo GDPR và cách gửi yêu cầu liên quan đến dữ liệu cho ICUE Vietnam.',
    updated: '18 tháng 8, 2025',
    icon: 'scale',
    accent: '#059669',
    accentSoft: '#d1fae5',
    sections: [
      {
        id: 'about-gdpr',
        title: 'GDPR là gì?',
        blocks: [
          {
            type: 'paragraph',
            text: 'Quy định Bảo vệ Dữ liệu Chung (GDPR) là luật về quyền riêng tư và bảo vệ dữ liệu của Liên minh Châu Âu, có hiệu lực từ ngày 25 tháng 5 năm 2018.',
          },
          {
            type: 'callout',
            text: 'GDPR có thể áp dụng cho tổ chức xử lý dữ liệu cá nhân của cá nhân tại EU, kể cả khi tổ chức đặt trụ sở ngoài EU.',
          },
          {
            type: 'paragraph',
            text: 'ICUE áp dụng các yêu cầu GDPR phù hợp, đặc biệt trong hoạt động hợp tác quốc tế với đối tác và cá nhân tại EU.',
          },
        ],
      },
      {
        id: 'your-rights',
        title: 'Tám quyền GDPR',
        blocks: [
          {
            type: 'cards',
            numbered: true,
            items: [
              {
                title: 'Quyền được thông tin',
                text: 'Biết dữ liệu nào được thu thập, mục đích, thời gian lưu trữ và bên có thể tiếp cận.',
              },
              {
                title: 'Quyền truy cập',
                text: 'Yêu cầu xác nhận hoạt động xử lý và nhận bản sao dữ liệu cá nhân.',
              },
              {
                title: 'Quyền chỉnh sửa',
                text: 'Sửa dữ liệu không chính xác, bổ sung thông tin thiếu hoặc cập nhật dữ liệu lỗi thời.',
              },
              {
                title: 'Quyền xóa dữ liệu',
                text: 'Yêu cầu xóa khi dữ liệu không còn cần thiết, sự đồng ý bị rút lại hoặc việc xử lý không hợp pháp.',
              },
              {
                title: 'Quyền hạn chế xử lý',
                text: 'Tạm dừng xử lý khi có tranh chấp về độ chính xác hoặc căn cứ pháp lý.',
              },
              {
                title: 'Quyền di chuyển dữ liệu',
                text: 'Nhận dữ liệu ở định dạng phổ biến, có cấu trúc và chuyển đến đơn vị khác khi phù hợp.',
              },
              {
                title: 'Quyền phản đối',
                text: 'Phản đối tiếp thị trực tiếp hoặc hoạt động xử lý dựa trên lợi ích hợp pháp.',
              },
              {
                title: 'Quyền đối với quyết định tự động',
                text: 'Yêu cầu can thiệp của con người và phản đối quyết định hoàn toàn tự động có ảnh hưởng đáng kể.',
              },
            ],
          },
        ],
      },
      {
        id: 'request-process',
        title: 'Cách thực hiện quyền',
        blocks: [
          {
            type: 'steps',
            items: [
              ['Xác định yêu cầu', 'Chọn quyền bạn muốn thực hiện và dữ liệu liên quan.'],
              ['Gửi yêu cầu', 'Email đến info@icue.vn với tiêu đề “[GDPR Request]”.'],
              ['Xác minh danh tính', 'ICUE có thể yêu cầu thông tin cần thiết để bảo vệ dữ liệu.'],
              ['Xử lý', 'Yêu cầu được đánh giá và xử lý theo thời hạn áp dụng.'],
              ['Nhận phản hồi', 'Bạn nhận kết quả và thông tin về bước tiếp theo nếu có.'],
            ],
          },
        ],
      },
      {
        id: 'send-request',
        title: 'Gửi yêu cầu GDPR',
        blocks: [
          {
            type: 'request',
          },
        ],
      },
      {
        id: 'timing',
        title: 'Thời gian xử lý và phí',
        blocks: [
          {
            type: 'cards',
            items: [
              {
                title: '30 ngày',
                text: 'Thời gian phản hồi tiêu chuẩn kể từ khi nhận được yêu cầu hợp lệ.',
              },
              {
                title: 'Gia hạn khi cần',
                text: 'Với yêu cầu phức tạp, thời hạn có thể được gia hạn và ICUE sẽ thông báo lý do.',
              },
              {
                title: 'Thông thường miễn phí',
                text: 'Phí chỉ có thể áp dụng cho yêu cầu rõ ràng là quá mức hoặc lặp lại.',
              },
            ],
          },
        ],
      },
      {
        id: 'complaints',
        title: 'Giám sát và khiếu nại',
        blocks: [
          {
            type: 'list',
            items: [
              ['Khiếu nại nội bộ', 'Liên hệ đầu mối bảo vệ dữ liệu của ICUE.'],
              ['Cơ quan giám sát', 'Gửi khiếu nại đến cơ quan bảo vệ dữ liệu có thẩm quyền.'],
              ['Khởi kiện', 'Thực hiện biện pháp tư pháp theo pháp luật áp dụng.'],
            ],
          },
          {
            type: 'external-link',
            text: 'Danh sách cơ quan bảo vệ dữ liệu tại EU',
            href: 'https://edpb.europa.eu/about-edpb/board/members_en',
          },
        ],
      },
    ],
    contact: {
      title: 'Liên hệ đầu mối bảo vệ dữ liệu',
      response: 'ICUE cam kết xử lý yêu cầu minh bạch và trong thời hạn áp dụng.',
    },
  },
  {
    slug: 'cookies',
    tabLabel: 'Cookie',
    eyebrow: 'Lưu trữ trên thiết bị',
    title: 'Chính sách cookie',
    summary:
      'Cookie là gì, những nhóm cookie website có thể sử dụng và cách bạn kiểm soát lựa chọn của mình.',
    description:
      'Chính sách cookie giải thích cách website ICUE Vietnam sử dụng cookie và các công nghệ lưu trữ tương tự.',
    updated: '18 tháng 8, 2025',
    icon: 'cookie',
    accent: '#d97706',
    accentSoft: '#fef3c7',
    sections: [
      {
        id: 'what-are-cookies',
        title: 'Cookie là gì?',
        blocks: [
          {
            type: 'paragraph',
            text: 'Cookie là tệp nhỏ được lưu trên máy tính, điện thoại hoặc máy tính bảng khi bạn truy cập website. Cookie giúp website ghi nhớ thông tin về lần truy cập và cung cấp trải nghiệm nhất quán hơn.',
          },
          {
            type: 'callout',
            text: 'Cookie không tự chạy chương trình, chứa virus hoặc đọc tệp cá nhân trên thiết bị của bạn.',
          },
        ],
      },
      {
        id: 'cookie-types',
        title: 'Các loại cookie',
        blocks: [
          {
            type: 'cards',
            numbered: true,
            items: [
              {
                title: 'Cookie cần thiết',
                text: 'Phục vụ bảo mật, phiên làm việc và các chức năng cốt lõi. Không thể tắt bằng công cụ tùy chọn.',
              },
              {
                title: 'Cookie hiệu suất',
                text: 'Giúp hiểu lưu lượng, hiệu suất trang và lỗi kỹ thuật để cải thiện website.',
              },
              {
                title: 'Cookie chức năng',
                text: 'Ghi nhớ lựa chọn như ngôn ngữ, giao diện hoặc thiết lập cá nhân.',
              },
              {
                title: 'Cookie marketing',
                text: 'Đo lường chiến dịch và cung cấp nội dung phù hợp khi có căn cứ đồng ý.',
              },
            ],
          },
          {
            type: 'table',
            label: 'Ví dụ về cookie',
            headers: ['Tên', 'Loại', 'Mục đích', 'Thời hạn'],
            rows: [
              ['icue_session', 'Cần thiết', 'Quản lý phiên', 'Phiên làm việc'],
              ['language_pref', 'Chức năng', 'Ghi nhớ ngôn ngữ', '1 năm'],
              ['_ga', 'Hiệu suất', 'Phân biệt người dùng trong Analytics', '2 năm'],
              ['_gat', 'Hiệu suất', 'Giới hạn tần suất yêu cầu', '1 phút'],
              ['_fbp', 'Marketing', 'Đo lường chuyển đổi', '3 tháng'],
              ['cookie_preferences', 'Cần thiết', 'Ghi nhớ lựa chọn cookie', '1 năm'],
            ],
          },
        ],
      },
      {
        id: 'preferences',
        title: 'Quản lý tùy chọn cookie',
        blocks: [
          {
            type: 'preferences',
          },
        ],
      },
      {
        id: 'browser-controls',
        title: 'Quản lý trong trình duyệt',
        blocks: [
          {
            type: 'cards',
            items: [
              {
                title: 'Chrome',
                text: 'Cài đặt → Quyền riêng tư và bảo mật → Cookie và dữ liệu trang web.',
              },
              {
                title: 'Firefox',
                text: 'Cài đặt → Quyền riêng tư & Bảo mật → Cookie và Dữ liệu Trang web.',
              },
              {
                title: 'Safari',
                text: 'Cài đặt → Quyền riêng tư → Quản lý dữ liệu website.',
              },
              {
                title: 'Edge',
                text: 'Cài đặt → Cookie và quyền trang web → Quản lý và xóa cookie.',
              },
            ],
          },
        ],
      },
      {
        id: 'third-parties',
        title: 'Dịch vụ bên thứ ba',
        blocks: [
          {
            type: 'table',
            label: 'Dịch vụ có thể đặt cookie bên thứ ba',
            headers: ['Dịch vụ', 'Mục đích', 'Kiểm soát'],
            rows: [
              ['Google Analytics', 'Phân tích website', 'Google Analytics Opt-out'],
              ['Meta Pixel', 'Đo lường quảng cáo', 'Meta Ad Preferences'],
              ['YouTube', 'Hiển thị video nhúng', 'Không phát video'],
              ['Google Fonts', 'Hiển thị phông chữ', 'Kiểm soát qua trình duyệt'],
            ],
          },
          {
            type: 'callout',
            tone: 'warning',
            text: 'ICUE không kiểm soát chính sách cookie của bên thứ ba. Vui lòng tham khảo chính sách riêng tư của từng dịch vụ.',
          },
        ],
      },
      {
        id: 'impact',
        title: 'Ảnh hưởng khi tắt cookie',
        blocks: [
          {
            type: 'table',
            label: 'Ảnh hưởng theo nhóm cookie',
            headers: ['Nhóm bị tắt', 'Mức ảnh hưởng', 'Chức năng có thể mất'],
            rows: [
              ['Cần thiết', 'Nghiêm trọng', 'Phiên làm việc và chức năng bảo mật'],
              ['Chức năng', 'Trung bình', 'Ngôn ngữ, giao diện và tùy chọn'],
              ['Hiệu suất', 'Thấp', 'Dữ liệu hỗ trợ cải thiện website'],
              ['Marketing', 'Rất thấp', 'Đo lường chiến dịch và cá nhân hóa quảng cáo'],
            ],
          },
        ],
      },
      {
        id: 'cookie-security',
        title: 'Bảo mật và quyền riêng tư',
        blocks: [
          {
            type: 'list',
            items: [
              'Cookie nhạy cảm được bảo vệ bằng thuộc tính bảo mật phù hợp.',
              'Dữ liệu được truyền qua kết nối HTTPS.',
              'Cookie có thời hạn và được rà soát định kỳ.',
              'Quyền truy cập dữ liệu được giới hạn theo vai trò.',
              'ICUE không bán thông tin cá nhân thu thập từ cookie.',
            ],
          },
        ],
      },
    ],
    contact: {
      title: 'Liên hệ về cookie',
      response: 'ICUE sẽ phản hồi trong vòng 5 ngày làm việc.',
    },
  },
]

export const LEGAL_DOCUMENT_BY_SLUG = Object.fromEntries(
  LEGAL_DOCUMENTS.map((document) => [document.slug, document]),
)
