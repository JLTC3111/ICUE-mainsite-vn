const articles = [
    {
      id: "1",
      title: "Lễ Khánh Thành, Bàn Giao Công Viên Âu Cơ",
      lead: "Với Sự Tham Dự Của Chủ Tịch UBND Tỉnh Quảng Nam - Ông Lê Văn Dũng",
      author: "Bởi ICUE-IKI-Giz & Thành Phố Hội An",
      date: "2025-05-16",
      image: {
        src: "/public/news/articles/article_1/all_together.jpg",
        caption: "Các Bên Tham Gia"
      },
      bodyHTML: `
        <p>Vào ngày 16 tháng 5 năm 2025, Viện Nghiên Cứu Kinh tế Xây dựng và Đô thị (ICUE), phối hợp cùng UBND thành phố Hội An, tổ chức một sự kiện đặc biệt là Khánh thành và bàn giao Không gian xanh và công viện ven biển (đã được đặt tên là Công viên Âu Cơ), nhằm đánh dấu sự kết thúc thành công của dự án mang tên “Preventing erosion on Cua Dai beach through green corridors and park” nhằmTăng Cường Năng Lực và Hành Động Khí Hậu, đa dạng sinh học ở cấp quốc gia và cấp địa phương (CBF). 

        Sáng kiến này được triển khai theo thỏa thuận tài trợ của Sáng kiến Khí hậu Quốc tế (IKI), ICUE là đơn vị nhận tài trợ và triển khai thực hiện dự án, Tổ chức Hợp tác Phát triển Đức (GIZ) GmbH là đơn vị quản lý dự án. Dự án này đóng vai trò then chốt trong việc hỗ trợ các nỗ lực hành động vì khí hậu và bảo vệ đa dạng sinh học tại Việt Nam. 
        Sự kiện này vừa là dịp để tổng kết và đóng dự án, vừa là cơ hội để nhìn lại những tiến bộ đạt được nhờ cam kết chung của các đối tác. Sự có mặt của các bên liên quan, các chuyên gia và những người đóng góp cho dự án sẽ càng làm nổi bật tính hợp tác trong sáng kiến này, cũng như tác động tích cực của nó đối với phát triển đô thị bền vững tại khu vực Cửa Đại, thành phố Hội An. 
        Trong những tháng vừa qua, dự án không chỉ củng cố năng lực kỹ thuật và thể chế mà còn thúc đẩy sự hợp tác sâu sắc hơn giữa chính quyền trung ương và địa phương trong các vấn đề liên quan đến biến đổi khí hậu. ICUE và chính quyền địa phương thành phố Hội An rất vinh dự khi được đóng góp vào nỗ lực đầy ý nghĩa này, phản ánh một tầm nhìn chung về một tương lai thích ứng tốt hơn với biến đổi khí hậu và có trách nhiệm hơn với môi trường. 
        Tất cả những điều này sẽ không thể thực hiện được nếu không có sự hỗ trợ hào phóng từ IKI và sự hỗ trợ nhiệt tình của GIZ trong việc triển khai thực hiện dự án, cũng như việc tạo điều kiện thuận lợi của UBND tỉnh Quảng Nam, sự phối hợp nhịp nhàng UBND thành phố Hội An, UBND phường Cửa Đại và sự cộng tác của cộng đồng dân cư cũng như các tổ chức xã hội ở đây. 
        Niềm tin và nguồn tài trợ của họ (IKI và GIZ) đã giúp dự án trở thành hiện thực và mang lại những lợi ích thiết thực cho cộng đồng địa phương. Chúng tôi xin gửi lời cảm ơn chân thành đến GIZ và IKI vì sự hỗ trợ liên tục và niềm tin mà họ dành cho chúng tôi. Sự kiện khánh thành và bàn giao này không phải là kết thúc, mà là một sự khởi đầu mới cho các hợp tác trong tương lai, hướng đến việc xây dựng những đô thị xanh hơn, bền vững hơn tại Việt Nam và xa hơn nữa.</p>
        <h2>Thank You 🤝</h2>
        <blockquote>"We Hope You Enjoyed The Ceremony - Thanks for Coming!"</blockquote>
      `,
      pdf: "/public/files/speech.pdf"
    }
    // Add more articles here...
];

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const article = articles.find(a => a.id === id);

  if (!article) {
    document.getElementById("content").innerHTML = `<h2 style="text-align:center;">🚫 Article not found.</h2>`;
    return;
  }

  // Populate HTML
  document.title = article.title;
  document.getElementById("article-title").textContent = article.title;
  document.getElementById("article-lead").textContent = article.lead;
  document.getElementById("article-author").textContent = `By ${article.author}`;
  document.getElementById("article-date").textContent = new Date(article.date).toDateString();
  document.getElementById("article-date").setAttribute("datetime", article.date);
  document.getElementById("article-image").src = article.image.src;
  document.getElementById("article-caption").textContent = article.image.caption;
  document.getElementById("article-body").innerHTML = article.bodyHTML;

  if (article.pdf) {
    const dlBtn = document.getElementById("article-download");
    dlBtn.href = article.pdf;
    dlBtn.style.display = "inline-block";
  }
});
