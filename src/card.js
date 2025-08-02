const cards = [
  {
    id: "1",
    title: "📍 Điều chỉnh quy hoạch chung thành phố Lào Cai",
    description: "Tổng diện tích: 28.162,64 ha, dự kiến hoàn thành vào năm 2045. Kế hoạch tập trung vào tối ưu hóa sử dụng đất, cải thiện hạ tầng, định hướng tăng trưởng dân số và nâng cao vai trò của thành phố như một trung tâm kinh tế và giao thông trong khu vực.",
    images: [
      "public/pastProjects/project_1/pp_1a.png", 
      "public/pastProjects/project_1/pp_1b.png",
      "public/pastProjects/project_1/pp_1c.jpg", 
      "public/pastProjects/project_1/pp_1d.jpg",
      "public/pastProjects/project_1/pp_1e.jpg",
    ],
    year: "2024",
    location: "Thành phố Lào Cai"
  },
  {
    id: "2",
    title: "📍 Quy hoạch xây dựng chi tiết tỷ lệ 1/500",
    description: "Tổng diện tích: 2.693,3 ha. Quy hoạch xây dựng chi tiết tỷ lệ 1/500 cho xã Hợp Thành, thành phố Lào Cai, bao gồm 2.693,3 ha. Kế hoạch này đặt nền tảng cho sự phát triển đô thị trong tương lai, quy hoạch phân khu và điều chỉnh hạ tầng để hỗ trợ tăng trưởng bền vững đến năm 2025.",
    images: [
      "public/pastProjects/project_2/pp_2a.png",  
      "public/pastProjects/project_2/pp_2b.png", 
    ],
    year: "2025",
    location: "Xã Hợp Thành, thành phố Lào Cai"
  },
  {
    id: "3",
    title: "📍 QUY HOẠCH PHÂN KHU 6B (PHƯỜNG NGUYỄN ÁI QUỐC)",
    description: "Phân khu 6B đánh dấu một bước tiến chiến lược trong việc tái cấu trúc đô thị Hải Dương, nằm tại phường Nguyễn Ái Quốc. Với diện tích rộng lớn hơn 1,100 ha, quy hoạch này hướng đến phát triển đồng bộ hạ tầng kỹ thuật, mở rộng không gian sinh thái – đô thị và tạo lập các khu chức năng hiện đại. Dự án không chỉ góp phần thúc đẩy tăng trưởng đô thị bền vững mà còn định hình bộ mặt mới cho thành phố trong giai đoạn hậu 2025.",
    images: [
      "public/pastProjects/project_3/pp_3a.jpg",  
      "public/pastProjects/project_3/pp_3b.jpg", 
      "public/pastProjects/project_3/pp_3c.jpg",  
    ],
    year: "2025",
    location: "Thành Phố Hải Dương"
  },
  {
    id: "4",
    title: "📍 QUY HOẠCH PHÂN KHU XÂY DỰNG CỐC SAN",
    description: "Phân khu xây dựng Cốc San là một phần trọng điểm trong chiến lược mở rộng không gian đô thị của thành phố Lào Cai. Dự án không chỉ tập trung phát triển hạ tầng kỹ thuật tiên tiến mà còn khéo léo tích hợp các yếu tố cảnh quan tự nhiên để hình thành một đô thị sinh thái cân bằng. Đây là tiền đề để phát triển các khu dân cư chất lượng cao, khu thương mại – dịch vụ và các công trình công cộng liên kết chặt chẽ với trục giao thông liên vùng.",
    images: [
      "public/pastProjects/project_4/pp_4a.webp",  
      "public/pastProjects/project_4/pp_4b.webp",   
    ],
    year: "2025",
    location: "Thành Phố Lào Cai"
  },
  {
    id: "5",
    title: "📍 QUY HOẠCH CHUNG ĐÔ THỊ ĐÔNG YÊN, HUYỆN BẮC GIANG",
    description: "Đô thị Đông Yên là một quy hoạch tổng thể đầy tham vọng với quy mô gần 4,500 ha, mang trong mình tầm nhìn dài hạn đến năm 2050. Dự án nhắm đến việc xây dựng một đô thị vệ tinh thông minh, hội tụ đầy đủ các chức năng sống – làm việc – vui chơi. Với định hướng quy hoạch bài bản, Đông Yên kỳ vọng trở thành điểm đến hấp dẫn cho đầu tư, nơi khởi nguồn cho các mô hình đô thị hiện đại bền vững tại khu vực phía Bắc.",
    images: [
      "public/pastProjects/project_5/pp_5a.jpg",  
      "public/pastProjects/project_5/pp_5b.jpg", 
    ],
    year: "2025",
    location: "Xã Đồng Yên, TP Hà Giang"
  },
  {
    id: "6",
    title: "📍 QUY HOẠCH CHUNG ĐÔ THỊ NÀ CHÌ, HUYỆN XÍN MẦN",
    description: "Dự án đô thị Nà Chì là một trong những quy hoạch có quy mô lớn nhất tại khu vực miền núi phía Bắc. Với hơn 8,000 ha, đây là bước đi chiến lược giúp Xín Mần bứt phá về hạ tầng, dịch vụ và khả năng thu hút đầu tư. Đô thị được định hướng phát triển bền vững, kết hợp hài hòa giữa bảo tồn bản sắc vùng cao và đưa vào các mô hình hạ tầng thông minh. Một cánh cửa mới đang mở ra cho Hà Giang.",
    images: [
      "public/pastProjects/project_6/pp_6a.jpg",  
      "public/pastProjects/project_6/pp_6b.jpg", 
      "public/pastProjects/project_6/pp_6c.jpg",
    ],
    year: "2025",
    location: "Xã Nà Chì, Xín Màn, Hà Giang"
  },
  {
    id: "7",
    title: "📍 QUY HOẠCH CHUNG ĐÔ THỊ TÂN BẮC, HUYỆN QUANG BÌNH",
    description: "Tân Bắc đang từng bước trở thành trung tâm mới nổi của huyện Quang Bình. Quy hoạch đô thị với hơn 6,000 ha này tập trung vào việc phát triển không gian sống hiện đại, hệ sinh thái công nghệ xanh và các tiện ích công cộng đồng bộ. Tầm nhìn đến năm 2050 mang tính cách mạng, biến Tân Bắc thành mô hình điển hình về quy hoạch vùng cao mang bản sắc địa phương, nhưng vẫn bắt nhịp kịp với tốc độ đô thị hóa quốc gia.",
    images: [
      "public/pastProjects/project_7/pp_7a.jpg",  
      "public/pastProjects/project_7/pp_7b.jpg", 
      "public/pastProjects/project_7/pp_7c.jpg",  
      "public/pastProjects/project_7/pp_7d.jpg", 
    ],
    year: "2025",
    location: "Xã Tân Bắc, Quang Bình, Hà Giang"
  },
  {
    id: "8",
    title: "📍 QUY HOẠCH PHÂN KHU 5A (PHÂN KHU KHU VỰC PHƯỜNG NAM ĐỒNG) THÀNH PHỐ HẢI DƯƠNG",
    description: "Phân khu 5A là một phần cốt lõi trong chiến lược phát triển bền vững của Hải Dương. Với diện tích trên 330 ha, dự án đặt trọng tâm vào quy hoạch không gian đô thị hiện đại, tăng cường khả năng kết nối và tạo lập hệ sinh thái đô thị linh hoạt. Đây là nỗ lực cụ thể nhằm nâng cao chất lượng sống cho cư dân và tăng cường sức hút cho khu vực Nam Đồng trong giai đoạn phát triển tiếp theo.",
    images: [
      "public/pastProjects/project_8/pp_8a.jpg",  
      "public/pastProjects/project_8/pp_8b.jpg", 
      "public/pastProjects/project_8/pp_8c.jpg",  
      "public/pastProjects/project_8/pp_8d.jpg",   
      "public/pastProjects/project_8/pp_8f.jpg", 
      "public/pastProjects/project_8/pp_8g.jpg",  
      "public/pastProjects/project_8/pp_8h.jpg", 
      "public/pastProjects/project_8/pp_8i.jpg",  
    ],
    year: "2025",
    location: "TP HẢI DƯƠNG, TỈNH HẢI DƯƠNG"
  },
  {
    id: "9",
    title: "📍 QUY HOẠCH CHI TIẾT KHU ĐÔ THỊ SINH THÁI PARK CITY XUÂN AN",
    description: "Park City Xuân An là một khu đô thị sinh thái cao cấp với thiết kế tinh tế, diện tích gần 28 ha và mật độ phát triển hợp lý. Với định hướng \"sống xanh, sống khỏe\", dự án tích hợp không gian xanh rộng lớn, các tiện ích thương mại – dịch vụ hiện đại và hạ tầng đồng bộ. Đây là một điểm sáng mới của thị trường bất động sản Hà Tĩnh, hứa hẹn tạo nên làn sóng đô thị hóa cao cấp và bền vững tại khu vực miền Trung.",
    images: [
      "public/pastProjects/project_9/pp_9a.jpg",  
      "public/pastProjects/project_9/pp_9b.jpg", 
      "public/pastProjects/project_9/pp_9c.jpg",  
      "public/pastProjects/project_9/pp_9d.jpg", 
    ],
    year: "2025",
    location: "Thị trấn Xuân An, huyện Nghi Xuân, tỉnh Hà Tĩnh"
  },
];

if (!location.pathname.endsWith('/card.html')) {
// Fetch and render card.html for each card
cards.forEach(card => {
  fetch('../card.html')
    .then(response => response.text())
    .then(template => {
      // Create image HTML from array
      const imagesHTML = card.images
        .map(src => `<img src="${getAbsolutePath(src)}" alt="${card.title}" style="width:100%; margin-bottom: 10px;">`)
        .join('');
        
      // Helper to normalize path
      function getAbsolutePath(src) {
        // Remove leading slash if there is one, then prefix with root "/"
        return '/' + src.replace(/^\/+/, '');
      }
      const cardHTML = template
        .replace(/{{title}}/g, card.title)
        .replace(/{{description}}/g, card.description)
        .replace(/{{images}}/g, card.images)
        .replace(/{{year}}/g, card.year)
        .replace(/{{location}}/g, card.location);
      document.getElementById('card-container').innerHTML += cardHTML;
    });
});
}
