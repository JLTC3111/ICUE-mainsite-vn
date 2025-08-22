const articles = [
    {
      id: "1",
      title: "Hội nghị tổng kết đề án phát triển đô thị thông minh và bền vững VN giai đoạn 2018-2025 vag định hướng 2030",
      lead: "Sáng Kiến Đô Thị Thông Minh của Việt Nam: Thành Tựu và Lộ Trình 2025-2030",
      author: "Bởi ICUE",
      date: "13 Tháng 8, 2025",
      image: {
        src: "/public/news/articles/article_4/conference.jpg",
        caption: "Các Thành Viên Buổi Họp"
      },
      bodyHTML: `
        <p>
        Chặng đường phát triển đô thị thông minh của Việt Nam đã đạt được những bước tiến đáng kể kể từ khi triển khai Đề án “Phát triển đô thị thông minh bền vững Việt Nam giai đoạn 2018 - 2025” vào năm 2018. Mục tiêu của đề án là tận dụng công nghệ để cải thiện công tác quản lý, nâng cao chất lượng sống của người dân và thúc đẩy sự phát triển bền vững. Chính phủ cam kết chuyển đổi cảnh quan đô thị bằng các công nghệ dựa trên dữ liệu và tiếp cận lấy người dân làm trung tâm, hướng tới việc hoàn thành vào năm 2030.
        Sau 7 năm triển khai, đất nước đã đạt được những bước tiến lớn trong hướng đi này, với nhiều thành phố đã bắt đầu triển khai các công nghệ đô thị thông minh một cách thành công.
        Những Thành Tựu Chính:
        1. Giải Pháp Lấy Người Dân Làm Trung Tâm: Huế
        Một ví dụ điển hình cho triết lý "người dân là trung tâm" là thành phố Huế, nơi đã triển khai nền tảng Hue-S, cho phép công dân báo cáo trực tiếp các vấn đề như sửa chữa đường xá, vệ sinh, và cơ sở hạ tầng. Ứng dụng này đã tạo ra một kênh giao tiếp hai chiều giữa người dân và chính quyền, đảm bảo tính minh bạch và trách nhiệm trong công tác quản lý đô thị. Hue-S đã trở thành một phần quan trọng trong hệ thống đô thị thông minh của Huế, giúp cải thiện các dịch vụ như y tế, giáo dục và quản lý giao thông. Thành phố cũng đang triển khai các dịch vụ thông minh tiên tiến hơn như kiểm soát giao thông bằng AI và chiếu sáng thông minh.
        2. Quản Lý Đô Thị Dựa Trên Dữ Liệu: Đà Nẵng
        Đà Nẵng là một ví dụ điển hình khác, nơi thành phố đã tích hợp hạ tầng thông minh và dịch vụ số. Trung tâm Điều hành Thông minh (IOC) là trung tâm tập hợp và quản lý dữ liệu từ các lĩnh vực như giao thông, quản lý rác thải, dịch vụ công cộng và y tế. Đà Nẵng đã hợp tác với các công ty công nghệ địa phương để triển khai GIS và BIM (Mô hình Thông tin Xây dựng) nhằm tối ưu hóa công tác quy hoạch đô thị. Thông qua các nền tảng này, thành phố có thể dự đoán và quản lý nhu cầu đô thị hiệu quả, đặc biệt là trong các mùa du lịch cao điểm.
        3. Hệ Thống Giao Thông Thông Minh: TP.HCM
        Tại TP.HCM, quản lý giao thông đã được cải thiện đáng kể thông qua hệ thống AI giám sát giao thông, camera giám sát, và thu phí tự động. Thành phố cũng đã triển khai các giải pháp đỗ xe thông minh và nghiên cứu xe tự lái, giúp thành phố trở thành một trong những nơi tiên phong trong vận hành đô thị thông minh. Các sáng kiến của TP.HCM phù hợp với mục tiêu lớn hơn của thành phố trong việc nâng cao phát triển bền vững bằng cách giảm tắc nghẽn giao thông và giảm thiểu phát thải carbon.
        4. Dịch Vụ Công Tích Hợp: Hà Nội
        Hà Nội đang tích hợp các trung tâm dữ liệu đám mây để mang đến một trải nghiệm mượt mà cho cư dân khi tiếp cận các dịch vụ chính quyền. Thành phố đã xây dựng nền tảng thống nhất cho các ứng dụng dịch vụ công, cho phép công dân nộp đơn khiếu nại, thanh toán thuế và tiếp cận thông tin chính quyền qua một cổng duy nhất. Bằng cách kết nối các sở, ngành thông qua hệ thống cơ sở dữ liệu chia sẻ, Hà Nội đang tối ưu hóa việc cung cấp dịch vụ và tăng cường hiệu quả trong cơ cấu hành chính.
        5. Đô Thị Xanh và Thông Minh: Bình Định
        Tại Bình Định, thành phố tập trung vào quá trình đô thị hóa xanh kết hợp với công nghệ thông minh. Tỉnh đã triển khai nhiều sáng kiến bền vững môi trường, như hệ thống quản lý rác thải thông minh và giải pháp năng lượng tái tạo cho các tòa nhà đô thị. Thành phố cũng đã áp dụng chiếu sáng thông minh bằng năng lượng mặt trời để giảm tiêu thụ năng lượng và giảm sự phụ thuộc vào nhiên liệu hóa thạch, đồng thời phù hợp với mục tiêu của chính phủ về phát triển bền vững trong các đô thị.
        Những Thách Thức và Rào Cản:
        Mặc dù đạt được nhiều thành tựu, quá trình phát triển đô thị thông minh ở Việt Nam vẫn gặp phải không ít khó khăn:
        Thiếu khung pháp lý và cơ chế chính sách đồng bộ: Mặc dù đã có một số hướng dẫn được ban hành, các quy định vẫn chưa được thống nhất giữa các địa phương.
        Vấn đề bảo mật dữ liệu và quyền riêng tư: Các thành phố như Hà Nội và TP.HCM đang thu thập lượng lớn dữ liệu để cải thiện dịch vụ, nhưng bảo mật và quyền riêng tư vẫn là mối quan tâm lớn.
        Thiếu nguồn lực tài chính: Nhiều thành phố nhỏ gặp khó khăn trong việc huy động vốn đầu tư cho các dự án hạ tầng số lớn. Do đó, một số thành phố đã chọn triển khai các dự án thử nghiệm hoặc dự án một phần với các dịch vụ cơ bản.
        Định Hướng Giai Đoạn 2025-2030:
        Khi bước sang giai đoạn tiếp theo của phát triển đô thị thông minh, Chính phủ Việt Nam đã đặt ra 7 ưu tiên chiến lược cho giai đoạn 2025-2030:
        Cải thiện hệ thống pháp lý và mô hình kiến trúc dữ liệu và hạ tầng công nghệ.
        Xây dựng cơ sở dữ liệu đô thị dùng chung, liên thông giữa các bộ, ngành.
        Lấy người dân làm trung tâm, cung cấp dịch vụ thiết yếu và khuyến khích tham gia giám sát.
        Phát triển nguồn nhân lực chất lượng cao, phổ cập kỹ năng số.
        Đổi mới mô hình quản trị, ứng dụng công nghệ vào điều hành và xây dựng chính quyền số.
        Tăng cường hợp tác quốc tế, thúc đẩy ứng dụng công nghệ mới.
        Huy động nguồn lực xã hội hóa thông qua hợp tác công-tư.
        Nhìn Về Tương Lai:
        Năm năm tới sẽ rất quan trọng đối với nỗ lực xây dựng đô thị thông minh tại Việt Nam. Đến năm 2030, Chính phủ dự kiến sẽ tạo ra một mạng lưới đô thị thông minh toàn quốc, hoạt động liên kết và đồng bộ giữa các thành phố. Các thành phố như Huế, Đà Nẵng, và TP.HCM sẽ là những hình mẫu để các thành phố khác học hỏi, chứng minh rằng với các đầu tư hợp lý và kế hoạch chi tiết, đô thị thông minh có thể trở thành động lực quan trọng cho tăng trưởng kinh tế, sự bền vững và quản lý đô thị hiệu quả.
        Mục tiêu phát triển đô thị thông minh bền vững sẽ không chỉ là mục tiêu phát triển, mà là yêu cầu tất yếu để Việt Nam thích ứng với thời đại số, nâng cao chất lượng sống và tăng năng lực cạnh tranh quốc gia trong những thập niên tới.</p>
        <h2></h2>
        <blockquote>""</blockquote>
      `,
      pdf: "",
      pdfButtonText: ""
    },
    {
      id: "2",
      title: "Lễ Khánh Thành, Bàn Giao Công Viên Âu Cơ",
      lead: "Với Sự Tham Dự Của Chủ Tịch UBND Tỉnh Quảng Nam - Ông Lê Văn Dũng",
      author: "Bởi ICUE-IKI-Giz & Thành Phố Hội An",
      date: "16 Tháng 5, 2025",
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
        <h2>Xin Chân Thành Cám Ơn!</h2>
        <blockquote>"Xin kính chúc quý vị đại biểu có nhiều Sức Khỏe - An Vui - Hạnh Phúc - và Thành Công. - T.S. Nguyễn Hồng Hạnh"</blockquote>
      `,
      pdf: "/public/files/speech.pdf",
      pdfButtonText: "Tải Về - Bài Phát Biểu ⇲"
    },
    {
      id: "3",
      title: "Chung tay đóng góp, ủng hộ, giúp đỡ đồng bào ảnh hưởng do bão Yagi",
      lead: "Làm theo lời kêu gọi của Uỷ ban Trung ương Mặt trận Tổ quốc Việt Nam, Viện NCKTXD&ĐT đã có thông báo kêu gọi cán bộ và các đối tác cùng các nhà hảo tâm chung tay đóng góp, giúp đỡ đồng bào bị ảnh hưởng bởi bão Yagi.",
      author: "Bởi ICUE",
      date: "26 Tháng 9, 2024",
      image: {
        src: "/public/news/articles/article_3/area_affected.png",
        caption: "Nhóm Tình Nguyện (ICUE)"
      },
      bodyHTML: `
        <p>Trong những ngày qua, do ảnh hưởng của cơn bão số 3 (bão Yagi), trên địa bản huyện Bảo Yên liên tục hứng chịu mưa lớn, lũ chồng lũ khiến nhiều xã trong huyện bị thiệt hại nặng nề. Đặc biệt trong 03 ngày: Từ 08-10/9/2024 mưa lớn kéo dài cùng nước nước lũ dâng cao, gây ngập úng, sạt lở đất đá nhiều nơi. Mưa lũ, sạt lở đất đá đến thời điểm hiện tại đã có 71 người chết, 29 người bị thương và chưa xác định được 11 người; hệ thống giao thông hư hỏng nghiêm trọng; nhà cửa, tài sản, hoa màu bị thiệt hại nặng nề, nhiều nhà bị mất trắng (đã có 4.825 nhà bị ảnh hưởng, thiệt hại khoảng 820 tỷ đồng). Đây là đợt lũ lụt lớn chưa từng thấy trên địa bàn huyện Bảo Yên. Ngày 25/9/2024, Đoàn cứu trợ Viện ICUE cùng các nhà hảo tâm đã thực hiện chuyến đi nghĩa tình hướng về bà con huyện  Bảo Yên. Theo sự điều phối, hướng dẫn của ban tiếp nhận UBND, UBMTTQ VN huyện Bảo Yên do đồng chí Đoàn Xuân Hưng chỉ đạo đã hướng dẫn Đoàn tới bản Chom – xã Yên Sơn để trao 100 phần quà tới tay bà con. Mỗi phần quà bao gồm: 10kg gạo đài thơm, dầu ăn, lạc rang sẵn, thịt chưng mắm tép, bột canh Hải Châu… cùng với quần áo, chăn màn. Tại bản Chom thiệt hại nhiều về tài sản, hoa màu, gia súc, gia cầm,… trong đó có 03 hộ gia đình bị sập đổ hoàn toàn nhưng may mắn không có thiệt hại về người gồm có gia đình: Bà Hoàng Thị Bốn, Ông Hoàng Văn Bản, Ông Nguyễn Bá Quán – được trao số quà gấp 4 lần các hộ khác.</p>
        <h2></h2>
        <blockquote>"Mong bà con sớm ổn định cuộc sống, vượt qua khó khăn, chung tay xây dựng và phát triển vững mạnh"</blockquote>
      `,
      pdf: "/public/files/photos.zip",
      pdfButtonText: "Tải Về - Ảnh Tư Liệu ⇲"
    },
    {
      id: "4",
      title: "Khai mạc Diễn đàn Bảo tồn Khu vực Châu Á lần thứ 8 tại Thái Lan",
      lead: "Ngày 3/9, Diễn đàn Bảo tồn Khu vực Châu Á (RCF) lần thứ 8 của Liên minh Bảo tồn Thiên nhiên Quốc tế (IUCN) đã khai mạc tại Bangkok, Thái Lan. Sự kiện quy tụ gần 600 nhà lãnh đạo trong lĩnh vực bảo tồn từ khắp khu vực, bao gồm đại diện chính phủ, tổ chức phi chính phủ, nhà tài trợ và đối tác, học viện và khu vực tư nhân, cùng nhiều bên liên quan.",
      author: "Bởi ICUE",
      date: "03 Tháng 9, 2024",
      image: {
        src: "/public/news/articles/article_2/conference.png",
        caption: "Phái đoàn Việt Nam tham gia hoạt động trong khuôn khổ RCF 2024"
      },
      bodyHTML: `
        <p>Về phía Việt Nam, đại diện phái đoàn tham dự Diễn đàn có các thành viên của IUCN Việt Nam, trong đó đại diện Viện Nghiên cứu Kinh tế Xây dựng và Đô thị (ICUE) - Viện trưởng TS.Nguyễn Hồng Hạnh tham dự diễn đàn. ICUE là 1 trong các thành viên đã tham dự và có các trình bày về bảo tồn biển, phát triển bền vững nông thôn. ICUE đã có báo cáo tóm tắt một phần trong dự án "Hỗ trợ phòng chống xói lở bờ biển Cửa Đại thông qua hành lang xanh và công viên sinh thái ven biển". 
        Diễn đàn Bảo tồn Khu vực Châu Á (RCF) diễn ra trong ba ngày với chủ đề 'Tái hiện Bảo tồn tại Châu Á: Tương lai tích cực cho Thiên nhiên', hướng tới đánh giá tiến độ bảo tồn, xem xét lại các mục tiêu ưu tiên và đề xuất các định hướng chiến lược để giải quyết hiệu quả các thách thức về môi trường và đa dạng sinh học trong 20 năm tới.
        Trong khuôn khổ RCF 2024, Diễn đàn Lãnh đạo Thanh niên đầu tiên, do thanh niên từ 23 quốc gia tổ chức, hướng tới nhấn mạnh vai trò của chuyên gia trẻ cũng như đóng góp ngày càng tăng của họ cho công tác bảo tồn thiên nhiên.
        Bên cạnh các cuộc thảo luận cấp cao về những thách thức trong khu vực của nhiều bên liên quan, IUCN Châu Á RCF lần thứ 8 sẽ có tám phiên họp chuyên đề về các ưu tiên chương trình mới và hiện có, cũng như 17 sự kiện bên lề do các Thành viên, Ủy ban và đối tác của IUCN tổ chức. Địa điểm này cũng cung cấp các gian hàng triển lãm để giới thiệu công tác bảo tồn.
        TS.Nguyễn Hồng Hạnh cùng chuyên gia Pornphrom Vikitsreth là nhà phân tích chính sách tại đảng Dân chủ Thái Lan và là người ủng hộ mạnh mẽ các chương trình nghị sự về biến đổi khí hậu của đảng, sử dụng cả các phương pháp giảm thiểu và thích ứng. Ông cũng đã nâng cao nhận thức về các vấn đề biến đổi khí hậu trong các mạng lưới thanh niên và cộng đồng địa phương trên khắp đất nước và có bằng Thạc sĩ về các vấn đề toàn cầu của Đại học New York.
        Ngoài ra còn kết nối với Viện Môi trường Thái Lan (Thailand Environment Instutite) Trở thành tổ chức hàng đầu về môi trường theo tiêu chuẩn quốc tế, tuân thủ nguyên tắc phi đảng phái , góp phần thúc đẩy phát triển bền vững. 
        CBCGDF là một quỹ gây quỹ công cộng quốc gia tại Trung Quốc. Trong những năm qua, quỹ đã đóng vai trò quan trọng trong lĩnh vực bảo tồn đa dạng sinh học và phát triển xanh. Để thích ứng với sự phát triển của thời đại, quỹ đã được đổi tên thành “Quỹ bảo tồn đa dạng sinh học và phát triển xanh Trung Quốc”. Việc đổi tên đã kết hợp hữu cơ bảo tồn đa dạng sinh học với phát triển xanh, mở rộng hàm ý và biểu thị của bảo tồn đa dạng sinh học, thể hiện bản chất của đa dạng sinh học “phát triển trong bảo tồn và được bảo tồn trong phát triển”, và đóng vai trò tích cực trong việc thúc đẩy tái cấu trúc kinh tế tại Trung Quốc.    
        Trong sự kiện kéo dài ba ngày, một sự kiện học tập chuyên dụng sẽ được tổ chức, bao gồm các buổi chia sẻ kiến ​​thức và đào tạo ngắn hạn do Học viện IUCN tổ chức. Những người tham gia cũng sẽ có cơ hội dự triển lãm, tham khảo nhiều nỗ lực hợp tác khác nhau để bảo tồn thiên nhiên và đa dạng sinh học.</p>
        <h2></h2>
        <blockquote></blockquote>
      `,
      pdf: ""
    },
];

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  let currentID = params.get("id");

  function renderCard(id) {
    const article = articles.find(a => a.id === id);

    if (!article) {
      document.getElementById("content").innerHTML =
        `<h2 style="text-align:center;">🚫 Article not found.</h2>`;
      return;
    }

    // Populate HTML
    document.title = article.title;
    document.getElementById("article-title").textContent = article.title;
    document.getElementById("article-lead").textContent = article.lead;
    document.getElementById("article-author").textContent = `By ${article.author}`;
    document.getElementById("article-date").textContent = article.date;
    document.getElementById("article-date").setAttribute("datetime", article.date);
    document.getElementById("article-image").src = article.image.src;
    document.getElementById("article-caption").textContent = article.image.caption;
    document.getElementById("article-body").innerHTML = article.bodyHTML;

    if (article.pdf) {
      const dlBtn = document.getElementById("article-download");
      dlBtn.href = article.pdf;
      dlBtn.textContent = article.pdfButtonText || "Download PDF ⇲";
      dlBtn.style.display = "inline-block";
    } else {
      document.getElementById("article-download").style.display = "none";
    }
  }

  // Initial render
  renderCard(currentID);

  // Prev button
  document.getElementById('prev-card').onclick = () => {
    const idx = articles.findIndex(c => c.id === currentID);
    if (idx > 0) {
      currentID = articles[idx - 1].id;
      window.history.replaceState({}, '', `?id=${currentID}`);
      renderCard(currentID);
    }
  };

  // Next button
  document.getElementById('next-card').onclick = () => {
    const idx = articles.findIndex(c => c.id === currentID);
    if (idx < articles.length - 1) {
      currentID = articles[idx + 1].id;
      window.history.replaceState({}, '', `?id=${currentID}`);
      renderCard(currentID);
    }
  };
});


