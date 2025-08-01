const cards = [
  {
    id: "1",
    title: "📍 Điều chỉnh quy hoạch chung thành phố Lào Cai",
    description: "Tổng diện tích: 28.162,64 ha, dự kiến hoàn thành vào năm 2045. Kế hoạch tập trung vào tối ưu hóa sử dụng đất, cải thiện hạ tầng, định hướng tăng trưởng dân số và nâng cao vai trò của thành phố như một trung tâm kinh tế và giao thông trong khu vực.",
    images: [
      "public/pastProjects/project_1/pp_1a.png", 
      "public/pastProjects/project_1/pp_1b.png",
    ],
    year: "2024",
    location: "Thành phố Lào Cai"
  },
  {
    id: "2",
    title: "📍 Quy hoạch xây dựng chi tiết tỷ lệ 1/500",
    description: "TTổng diện tích: 2.693,3 ha. Quy hoạch xây dựng chi tiết tỷ lệ 1/500 cho xã Hợp Thành, thành phố Lào Cai, bao gồm 2.693,3 ha. Kế hoạch này đặt nền tảng cho sự phát triển đô thị trong tương lai, quy hoạch phân khu và điều chỉnh hạ tầng để hỗ trợ tăng trưởng bền vững đến năm 2025.",
    images: [
      "public/pastProjects/project_2/pp_2a.png",  
      "public/pastProjects/project_2/pp_2b.png", 
    ],
    year: "2025",
    location: "Xã Hợp Thành, thành phố Lào Cai"
  },
  {
    id: "3",
    title: "📍 Quy hoạch chung  dựng chi tiết tỷ lệ 1/500",
    description: "TTổng diện tích: 2.693,3 ha. Quy hoạch xây dựng chi tiết tỷ lệ 1/500 cho xã Hợp Thành, thành phố Lào Cai, bao gồm 2.693,3 ha. Kế hoạch này đặt nền tảng cho sự phát triển đô thị trong tương lai, quy hoạch phân khu và điều chỉnh hạ tầng để hỗ trợ tăng trưởng bền vững đến năm 2025.",
    images: [
      "public/pastProjects/project_2/pp_2a.png",  
      "public/pastProjects/project_2/pp_2b.png", 
    ],
    year: "2025",
    location: "Xã Hợp Thành, thành phố Lào Cai"
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
