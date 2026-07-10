const cards = [
  {
    id: "1",
    title: "📍 Điều chỉnh quy hoạch chung thành phố Lào Cai",
    description: "Tổng diện tích quy hoạch lên đến 28.162,64 ha, với mục tiêu hoàn thành vào năm 2045. Đây là một chiến lược phát triển dài hạn, hướng đến việc tái cấu trúc không gian đô thị một cách hiệu quả, nhằm tận dụng tối đa tiềm năng sử dụng đất theo hướng linh hoạt, bền vững và thích ứng với biến đổi khí hậu. Kế hoạch đặt trọng tâm vào việc tối ưu hóa sử dụng đất đai, từ đất ở, đất thương mại, công nghiệp cho đến không gian công cộng và mảng xanh – tất cả được phân bổ khoa học, phục vụ cho sự phát triển cân bằng giữa kinh tế, xã hội và môi trường. Bên cạnh đó, quy hoạch cũng bao gồm các giải pháp cải thiện và mở rộng hệ thống hạ tầng giao thông, cấp thoát nước, năng lượng và công nghệ thông tin, tạo nền tảng vững chắc cho sự tăng trưởng bền vững.Đồng thời, kế hoạch cũng định hướng rõ ràng cho sự tăng trưởng dân số và phát triển các khu dân cư mới, phù hợp với nhu cầu về nhà ở, việc làm và dịch vụ đô thị. Mục tiêu cuối cùng là nâng cao vai trò và vị thế của thành phố như một trung tâm kinh tế – giao thông chiến lược trong khu vực, kết nối hiệu quả với các địa phương lân cận và hành lang kinh tế trọng điểm.",
    images: [
      "/public/pastProjects/project_1/pp_1a.jpg", 
      "/public/pastProjects/project_1/pp_1b.jpg",
      "/public/pastProjects/project_1/pp_1c.jpg", 
      "/public/pastProjects/project_1/pp_1d.jpg",
      "/public/pastProjects/project_1/pp_1e.jpg",
    ],
    year: "2024",
    location: "Thành phố Lào Cai"
  },
  {
    id: "2",
    title: "📍 Quy hoạch xây dựng chi tiết xã Hợp Thành tỷ lệ 1/500",
    description: "Tổng diện tích quy hoạch là 2.693,3 ha, thuộc địa bàn xã Hợp Thành, thành phố Lào Cai. Đây là đồ án quy hoạch xây dựng chi tiết tỷ lệ 1/500, nhằm cụ thể hóa các định hướng phát triển đã được xác lập trong quy hoạch chung, đồng thời xác định rõ ràng các khu chức năng, mạng lưới giao thông, hệ thống hạ tầng kỹ thuật và xã hội. Mục tiêu của quy hoạch này là đặt nền tảng cho quá trình đô thị hóa bền vững, hướng tới việc hình thành một đô thị hiện đại, đồng bộ, thân thiện với môi trường và có khả năng thích ứng linh hoạt với nhu cầu phát triển kinh tế - xã hội trong tương lai. Kế hoạch cũng bao gồm việc phân khu chức năng hợp lý, cải tạo và nâng cấp hạ tầng hiện hữu, từ đó đáp ứng nhu cầu dân sinh và thu hút đầu tư. Dự kiến, toàn bộ hệ thống quy hoạch sẽ được triển khai theo lộ trình, với tầm nhìn đến năm 2025, phù hợp với định hướng phát triển đô thị của tỉnh Lào Cai nói chung và thành phố Lào Cai nói riêng.",
    images: [
      "/public/pastProjects/project_2/pp_2a.jpg",  
      "/public/pastProjects/project_2/pp_2b.jpg", 
      "/public/pastProjects/project_2/pp_2c.jpg",  
      "/public/pastProjects/project_2/pp_2d.jpg", 
      "/public/pastProjects/project_2/pp_2e.jpg",  
    ],
    year: "2025",
    location: "Xã Hợp Thành, thành phố Lào Cai"
  },
  {
    id: "3",
    title: "📍 QUY HOẠCH PHÂN KHU 6B (PHƯỜNG NGUYỄN ÁI QUỐC)",
    description: "Phân khu 6B đánh dấu một bước tiến chiến lược trong việc tái cấu trúc đô thị Hải Dương, nằm tại phường Nguyễn Ái Quốc. Với diện tích rộng lớn hơn 1,100 ha, quy hoạch này hướng đến phát triển đồng bộ hạ tầng kỹ thuật, mở rộng không gian sinh thái – đô thị và tạo lập các khu chức năng hiện đại. Dự án không chỉ góp phần thúc đẩy tăng trưởng đô thị bền vững mà còn định hình bộ mặt mới cho thành phố trong giai đoạn hậu 2025.",
    images: [
      "/public/pastProjects/project_3/pp_3a.jpg",  
      "/public/pastProjects/project_3/pp_3b.jpg", 
      "/public/pastProjects/project_3/pp_3c.jpg",  
      "/public/pastProjects/project_3/pp_3d.jpg",  
    ],
    year: "2025",
    location: "Thành Phố Hải Dương"
  },
  {
    id: "4",
    title: "📍 QUY HOẠCH PHÂN KHU XÂY DỰNG CỐC SAN",
    description: "Phân khu xây dựng Cốc San là một phần trọng điểm trong chiến lược mở rộng không gian đô thị của thành phố Lào Cai. Dự án không chỉ tập trung phát triển hạ tầng kỹ thuật tiên tiến mà còn khéo léo tích hợp các yếu tố cảnh quan tự nhiên để hình thành một đô thị sinh thái cân bằng. Đây là tiền đề để phát triển các khu dân cư chất lượng cao, khu thương mại – dịch vụ và các công trình công cộng liên kết chặt chẽ với trục giao thông liên vùng.",
    images: [
      "/public/pastProjects/project_4/pp_4a.webp",  
      "/public/pastProjects/project_4/pp_4b.webp",
      "/public/pastProjects/project_4/pp_4c.webp",   
    ],
    year: "2025",
    location: "Thành Phố Lào Cai"
  },
  {
    id: "5",
    title: "📍 QUY HOẠCH CHUNG ĐÔ THỊ ĐÔNG YÊN, HUYỆN BẮC GIANG",
    description: "Đô thị Đông Yên là một quy hoạch tổng thể đầy tham vọng với quy mô gần 4,500 ha, mang trong mình tầm nhìn dài hạn đến năm 2050. Dự án nhắm đến việc xây dựng một đô thị vệ tinh thông minh, hội tụ đầy đủ các chức năng sống – làm việc – vui chơi. Với định hướng quy hoạch bài bản, Đông Yên kỳ vọng trở thành điểm đến hấp dẫn cho đầu tư, nơi khởi nguồn cho các mô hình đô thị hiện đại bền vững tại khu vực phía Bắc.",
    images: [
      "/public/pastProjects/project_5/pp_5a.jpg",  
      "/public/pastProjects/project_5/pp_5b.jpg",
      "/public/pastProjects/project_5/pp_5c.jpg",  
      "/public/pastProjects/project_5/pp_5d.jpg",
      "/public/pastProjects/project_5/pp_5e.jpg",   
    ],
    year: "2025",
    location: "Xã Đồng Yên, TP Hà Giang"
  },
  {
    id: "6",
    title: "📍 QUY HOẠCH CHUNG ĐÔ THỊ NÀ CHÌ, HUYỆN XÍN MẦN",
    description: "Dự án đô thị Nà Chì là một trong những quy hoạch có quy mô lớn nhất tại khu vực miền núi phía Bắc. Với hơn 8,000 ha, đây là bước đi chiến lược giúp Xín Mần bứt phá về hạ tầng, dịch vụ và khả năng thu hút đầu tư. Đô thị được định hướng phát triển bền vững, kết hợp hài hòa giữa bảo tồn bản sắc vùng cao và đưa vào các mô hình hạ tầng thông minh. Một cánh cửa mới đang mở ra cho Hà Giang.",
    images: [
      "/public/pastProjects/project_6/pp_6a.jpg",  
      "/public/pastProjects/project_6/pp_6b.jpg", 
      "/public/pastProjects/project_6/pp_6c.jpg", 
      "/public/pastProjects/project_6/pp_6d.jpg",  
      "/public/pastProjects/project_6/pp_6e.jpg", 
      "/public/pastProjects/project_6/pp_6f.jpg",
    ],
    year: "2025",
    location: "Xã Nà Chì, Xín Màn, Hà Giang"
  },
  {
    id: "7",
    title: "📍 QUY HOẠCH CHUNG ĐÔ THỊ TÂN BẮC, HUYỆN QUANG BÌNH",
    description: "Tân Bắc đang từng bước trở thành trung tâm mới nổi của huyện Quang Bình. Quy hoạch đô thị với hơn 6,000 ha này tập trung vào việc phát triển không gian sống hiện đại, hệ sinh thái công nghệ xanh và các tiện ích công cộng đồng bộ. Tầm nhìn đến năm 2050 mang tính cách mạng, biến Tân Bắc thành mô hình điển hình về quy hoạch vùng cao mang bản sắc địa phương, nhưng vẫn bắt nhịp kịp với tốc độ đô thị hóa quốc gia.",
    images: [
      "/public/pastProjects/project_7/pp_7a.jpg",  
      "/public/pastProjects/project_7/pp_7b.jpg", 
      "/public/pastProjects/project_7/pp_7c.jpg",  
      "/public/pastProjects/project_7/pp_7d.jpg", 
    ],
    year: "2025",
    location: "Xã Tân Bắc, Quang Bình, Hà Giang"
  },
  {
    id: "8",
    title: "📍 QUY HOẠCH PHÂN KHU 5A (PHÂN KHU KHU VỰC PHƯỜNG NAM ĐỒNG) THÀNH PHỐ HẢI DƯƠNG",
    description: "Phân khu 5A là một phần cốt lõi trong chiến lược phát triển bền vững của Hải Dương. Với diện tích trên 330 ha, dự án đặt trọng tâm vào quy hoạch không gian đô thị hiện đại, tăng cường khả năng kết nối và tạo lập hệ sinh thái đô thị linh hoạt. Đây là nỗ lực cụ thể nhằm nâng cao chất lượng sống cho cư dân và tăng cường sức hút cho khu vực Nam Đồng trong giai đoạn phát triển tiếp theo.",
    images: [
      "/public/pastProjects/project_8/pp_8a.jpg",  
      "/public/pastProjects/project_8/pp_8b.jpg", 
      "/public/pastProjects/project_8/pp_8c.jpg",  
      "/public/pastProjects/project_8/pp_8d.jpg",   
      "/public/pastProjects/project_8/pp_8f.jpg", 
      "/public/pastProjects/project_8/pp_8g.jpg",  
      "/public/pastProjects/project_8/pp_8h.jpg", 
      "/public/pastProjects/project_8/pp_8i.jpg",  
    ],
    year: "2025",
    location: "TP HẢI DƯƠNG, TỈNH HẢI DƯƠNG"
  },
  {
    id: "9",
    title: "📍 QUY HOẠCH CHI TIẾT KHU ĐÔ THỊ SINH THÁI PARK CITY XUÂN AN",
    description: "Park City Xuân An là một khu đô thị sinh thái cao cấp với thiết kế tinh tế, diện tích gần 28 ha và mật độ phát triển hợp lý. Với định hướng \"sống xanh, sống khỏe\", dự án tích hợp không gian xanh rộng lớn, các tiện ích thương mại – dịch vụ hiện đại và hạ tầng đồng bộ. Đây là một điểm sáng mới của thị trường bất động sản Hà Tĩnh, hứa hẹn tạo nên làn sóng đô thị hóa cao cấp và bền vững tại khu vực miền Trung.",
    images: [
      "/public/pastProjects/project_9/pp_9a.jpg",  
      "/public/pastProjects/project_9/pp_9b.jpg", 
      "/public/pastProjects/project_9/pp_9c.jpg",  
      "/public/pastProjects/project_9/pp_9d.jpg", 
    ],
    year: "2025",
    location: "Thị trấn Xuân An, huyện Nghi Xuân, tỉnh Hà Tĩnh"
  },
];
