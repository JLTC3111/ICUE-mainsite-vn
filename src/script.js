window.attachProfileEvents = () => {
  const profileData = [
    {
      name: `<span class="intro-people">Tiến Sỹ Nguyễn Hồng Hạnh</span><br> Là một chuyên gia về phát triển đô thị và quản lý xây dựng, hiện đang giữ chức Viện trưởng Viện Nghiên cứu Kinh tế, Đô thị và Xây dựng thuộc Hội Xây dựng Việt Nam. Sự nghiệp lâu dài của tiến sỹ bao gồm chức Phó Viện trưởng tại cả Viện Nghiên cứu Kinh tế Đô thị và Xây dựng (2013–2018) và phó cục trưởng Cục Phát triển Đô thị thuộc Bộ Xây dựng (2008–2013). Công việc trải dài trên các khuôn khổ pháp lý, quy hoạch đô thị và thiết kế kiến ​​trúc, tập trung mạnh vào các thành phố bền vững và được quản lý tốt. Tiến sỹ đã lãnh đạo các sáng kiến ​​lớn về phát triển đô thị xanh, khả năng phục hồi khí hậu và tư vấn chính sách cho quy hoạch quốc gia và khu vực, với sự hỗ trợ của các đối tác quốc tế như Ngân hàng Thế giới và ADB.`,
      img: "public/profilePhotos/nguyenhonghanh.jpg"
    },
    {
      name: `<span class="intro-people">Ms. Hoàng Thu Hà</span><br> Chuyên gia kế toán giàu kinh nghiệm với hơn 10 năm trong quản lý tài chính, báo cáo và tuân thủ. Có bằng Cử nhân Kế toán và đã lãnh đạo thành công các phòng kế toán, quản lý các khoản thanh toán tài chính, tiến hành kiểm toán và lập báo cáo tài chính chính xác. Có kỹ năng giám sát các giao dịch tài chính, đảm bảo tuân thủ pháp luật và quy định, và hỗ trợ các hoạt động tài chính theo dự án. Thành thạo phần mềm kế toán và được biết đến với đạo đức nghề nghiệp mạnh mẽ, khả năng thích ứng và chú ý đến từng chi tiết. Mang đến các kỹ năng lãnh đạo và tổ chức mạnh mẽ, tập trung vào việc cung cấp những hiểu biết tài chính chính xác.`,
      img: "public/profilePhotos/hoangthuha.jpg"
    },
    {
      name: `<span class="intro-people">Ms. Lan Anh</span><br> Chuyên gia quy hoạch và phát triển đô thị với hơn 20 năm kinh nghiệm trong thiết kế đô thị chiến lược, hoạch định chính sách và phát triển bền vững. Có bằng Tiến sĩ và Thạc sĩ từ Đại học Tokyo, có nền tảng vững chắc về thích ứng với biến đổi khí hậu, luật phân loại đô thị và chiến lược phát triển quốc gia. Cựu Phó Tổng giám đốc Cơ quan Phát triển Đô thị Việt Nam, lãnh đạo các chương trình lớn về khả năng phục hồi và quy hoạch đô thị đến năm 2050. Một nhà nghiên cứu, nhà giáo dục đã xuất bản và là thành viên tích cực của các hiệp hội chuyên môn quan trọng. Có kỹ năng điều phối các dự án quy mô lớn, khuôn khổ pháp lý và hợp tác liên ngành. Thông thạo nhiều ngôn ngữ và đam mê định hình tương lai đô thị bền vững, đáng sống.`,
      img: "public/profilePhotos/tranthilananh.jpg"
    },
    {
      name: `<span class="intro-people">Chuyên Gia Trần Quốc Toản </span><br> Quy hoạch đô thị và Biến đổi khí hậu với hơn 25 năm kinh nghiệm trong lĩnh vực cơ sở hạ tầng bền vững, quy hoạch giao thông và khả năng phục hồi khí hậu. Có bằng Kỹ sư cầu đường và hầm và đã đảm nhiệm các vai trò lãnh đạo chủ chốt trong Bộ Giao thông vận tải Việt Nam và các hiệp hội kỹ thuật dân dụng. Có kỹ năng tư vấn chính sách, quy hoạch thành phố thông minh và phát triển chiến lược tăng trưởng xanh. Dẫn dắt các dự án quốc gia lớn tập trung vào tính di động của đô thị, tính bền vững của môi trường và cải cách pháp luật. Một giảng viên và chuyên gia đào tạo được kính trọng cho các tổ chức như Ngân hàng Thế giới và ADB, được biết đến với chuyên môn sâu rộng, tư duy chiến lược và cam kết xây dựng tương lai đô thị có khả năng phục hồi khí hậu.`,
      img: "public/profilePhotos/tranquoctoan.jpg"
    },
    {
      name: `<span class="intro-people"> Long Đỗ - Quản Lý Dự Án </span><br> Một Cán bộ Dự án tận tụy với bằng Thạc sĩ Quản lý Dự án từ Đại học Salford, Vương quốc Anh, cùng với các chứng chỉ CCNA và An ninh mạng. Có hơn 5 năm kinh nghiệm rộng rãi trong lĩnh vực ngân hàng, bán lẻ, quản lý hợp đồng (thông minh) và tài chính, với khả năng đã được chứng minh là có thể quản lý các dự án phức tạp và mang lại kết quả hiệu quả. Kết hợp các kỹ năng kỹ thuật mạnh mẽ với thực hiện thực tế, đảm bảo sự phối hợp nhịp nhàng giữa các nhóm và các bên liên quan. Có khả năng thích nghi cao và chú ý đến chi tiết, với niềm đam mê với phần cứng máy tính, mã hóa và trò chơi. Có kinh nghiệm thiết kế và giải quyết vấn đề sáng tạo. 🔧💬
      https://dobaolongicueltd.netlify.app/`,
      img: "public/profilePhotos/longdo.jpg"
    }
  ];

  let currentIndex = 0;
  let touchStartX = 0;
  let touchEndX = 0;
  const MIN_SWIPE_DISTANCE = 15;
  
  const textBox = document.getElementById('profile-text');
  const photo = document.getElementById('profile-photo');
  const container = document.querySelector('.image-container');

  
  window.updateProfile = (index, direction = 'right') => {
    if (!textBox || !photo) return;
  
    // Step 1: Add exit animation classes
    const isFirstLoad = (currentIndex === 0 && index === 0);

    if (!isFirstLoad) {
    textBox.classList.add(direction === 'right' ? 'slide-exit-left' : 'slide-exit-right');
    photo.classList.add(direction === 'right' ? 'slide-exit-left' : 'slide-exit-right');}
  
    setTimeout(() => {
      // Step 2: Update the content
      textBox.innerHTML = `<div>${profileData[index].name}</div>`;
      photo.src = profileData[index].img;
  
      // Step 3: Remove exit animation classes
      textBox.classList.remove('slide-exit-left', 'slide-exit-right');
      photo.classList.remove('slide-exit-left', 'slide-exit-right');
  
      // (Optional) remove old enter classes in case
      textBox.classList.remove('slide-enter-left', 'slide-enter-right');
      photo.classList.remove('slide-enter-left', 'slide-enter-right');
  
      // Step 4: Animate using GSAP (✅ after content is updated)
      const tl = gsap.timeline();
  
      tl.fromTo(photo, 
        { x: direction === 'right' ? 100 : -100, opacity: 0 }, 
        { x: 0, opacity: 1, duration: 7.5, ease: "power2.out" }
      );
  
      tl.fromTo(textBox, 
        { x: direction === 'right' ? 100 : -100, opacity: 0 }, 
        { x: 0, opacity: 1, duration: 7.5, ease: "power2.out" },
        "-=0.5" // Start slightly overlapping with photo animation
      );
  
    }, 500); // ← match exit animation duration (0.3s)
  }

  document.getElementById('next-btn')?.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % profileData.length;
    updateProfile(currentIndex, 'right');
  });

  document.getElementById('prev-btn')?.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + profileData.length) % profileData.length;
    updateProfile(currentIndex, 'left');
  });

  // Add touch support for mobile
  if (container) {
    container.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    container.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchEndX - touchStartX;
      
      if (Math.abs(swipeDistance) > MIN_SWIPE_DISTANCE) {
        if (swipeDistance > 0) {
          document.getElementById('prev-btn')?.click();
        } else {
          document.getElementById('next-btn')?.click();
        }
      }
    });
  }

  // Preload all profile images
profileData.forEach(profile => {
  const img = new Image();
  img.src = profile.img;
});
  // Start first profile
  updateProfile(0);
}

window.loadPage = (page) => {
  const content = document.getElementById('content');
  const landing = document.getElementById('landing-page');
  const progressBar = document.querySelector('.progress-bar');
  const progressText = document.getElementById('progress-text');
  const radius = 90;
  const circumference = 2 * Math.PI * radius;

  let progress = 0;
  progressBar.style.strokeDasharray = `${circumference}`;

  const setProgress = (percent) => {
    const offset = circumference - (percent / 100) * circumference;
    progressBar.style.strokeDashoffset = offset;
    progressText.textContent = `${Math.round(percent)}%`;
  };

  landing.style.display = 'grid';
  landing.style.opacity = 1;
  landing.style.pointerEvents = 'all';

  let fakeProgress = setInterval(() => {
    progress += Math.random() * 1.5;
    if (progress > 90) progress = 90;
    setProgress(progress);
  }, 80);

  fetch(`/src/pages/${page}.html`)
    .then(response => response.text())
    .then(data => {
      content.innerHTML = data;

      clearInterval(fakeProgress);

      let finalize = setInterval(() => {
        progress += 2;
        setProgress(progress);
        if (progress >= 100) {
          clearInterval(finalize);
          landing.style.opacity = 0;
          landing.style.pointerEvents = 'none';

          setTimeout(() => {
            landing.style.display = 'none';

            // ✅ Delay script activation *after* loader is gone
            requestAnimationFrame(() => {
              if (page === 'meetOurExperts') {
                attachProfileEvents();
              }
              if (page === 'coreTeam') {
                attachProfileEvents_coreTeam();
              }
              if (page === 'Home') {
                initHomeTextSlider();
                attachHomeButtonEvents();
              }
              if (page === 'News') {
                initLogoSlider();
                initMobileNewsSlider();
              }
              if (page === 'aboutUs') {
                createBalloons();
              }
              if (page === 'Contact') {
                initPostMethod();
              }
            });

          }, 400); // After fade-out
        }
      },);
    });
}

window.attachHomeButtonEvents = () => {
  document.querySelectorAll('.home-button').forEach(button => {
    button.addEventListener('click', () => {
      console.log('Button clicked:', button.textContent);
      // Add your button logic here
    });
  });
}

window.initHomeTextSlider = () => {
  // Clean up existing event listeners and intervals
  const sliderContainer = document.querySelector("#homeTextSlider");
  const dotsContainer = document.querySelector("#sliderDots");
  
  // Remove existing event listeners
  if (window.homeSliderIntervalId) {
    clearInterval(window.homeSliderIntervalId);
  }
  
  // Remove existing event listeners from dots
  if (dotsContainer) {
    const newDotsContainer = dotsContainer.cloneNode(true);
    dotsContainer.parentNode.replaceChild(newDotsContainer, dotsContainer);
  }

  const messages = [
    "⏳ 20 năm quản lý đô thị xuất sắc. Với hai thập kỷ kinh nghiệm, nhóm 10 chuyên gia tận tụy của chúng tôi đam mê quy hoạch đô thị, xây dựng và biến đổi khí hậu. Chúng tôi thiết kế các thành phố phát triển mạnh mẽ trong một thế giới đang phát triển nhanh chóng — cân bằng giữa chức năng, khả năng phục hồi và nhu cầu của cộng đồng.",
    "🤝 Được xây dựng trên sự thống nhất, thúc đẩy bởi giá trị Chúng tôi tin vào việc đền đáp, thực hành sự thống nhất, làm việc chăm chỉ và không ngừng phấn đấu để tự hoàn thiện. Những giá trị cốt lõi này định hình cách tiếp cận của chúng tôi và truyền cảm hứng cho quan hệ đối tác của chúng tôi với các chuyên gia địa phương, cơ quan chính phủ và chuyên gia pháp lý.",
    "💡 Thành phố thông minh, Giải pháp thông minh hơn. Từ tích hợp thành phố thông minh đến các chiến lược thích ứng với khí hậu, chúng tôi sử dụng công nghệ và thông tin chi tiết dựa trên dữ liệu để nâng cao hiệu quả đô thị, khả năng kết nối và tính bền vững — xây dựng các thành phố sẵn sàng cho tương lai.",
    "🏆 Thành tựu lớn nhất của chúng tôi. Chúng tôi đã lãnh đạo sáng kiến ​​quy hoạch toàn thành phố Đà Nẵng cho cả thành phố loại 1 và loại 2 — một dự án chuyển đổi tiếp tục tác động đến cuộc sống hàng ngày của hàng nghìn người. Nó phản ánh sự tận tâm của chúng tôi đối với chiến lược toàn cảnh và kết quả thực tế.",
    "🌱 Định hình thành phố, cải thiện cuộc sống. Mỗi giải pháp chúng tôi cung cấp đều bắt nguồn từ một sứ mệnh: tạo ra tương lai đô thị tốt đẹp hơn. Từ gốc rễ, chúng tôi giúp định hình không gian bao trùm, bền vững và lấy con người làm trung tâm.",
    "💥 Tạo ra những trải nghiệm trường tồn mãi mãi."
  ];

  const textElement = document.querySelector("#homeSliderText .highlight-text");
  const dots = document.querySelectorAll("#sliderDots .dot");

  if (!textElement || dots.length === 0 || !sliderContainer) {
    console.warn("Slider elements not found. Skipping slider init.");
    return;
  }

  let index = 0;
  let isPaused = true;

  function updateText(newIndex) {
    index = newIndex;
    const textElement = document.getElementById("homeSliderText").querySelector(".highlight-text");
    
    if (!textElement) {
      console.error("highlight-text element not found!");
      return;
    }
  
    textElement.classList.add("transitioning");
    textElement.classList.remove("fade-In");
    
    setTimeout(() => {
      textElement.textContent = messages[index];
      textElement.classList.remove("transitioning");
      textElement.classList.add("fade-In");
      
      // Update dot states
      dots.forEach((dot, i) => {
        if (i === index) {
          dot.classList.add("active");
        } else {
          dot.classList.remove("active");
        }
      });
    }, 300);
  }

  function nextText() {
    if (!isPaused) {
      index = (index + 1) % messages.length;
      updateText(index);
    }
  }

  function prevText() {
    if (!isPaused) {
      index = (index - 1 + messages.length) % messages.length;
      updateText(index);
    }
  }

  function restartInterval() {
    clearInterval(window.homeSliderIntervalId);
    if (!isPaused) {
      window.homeSliderIntervalId = setInterval(nextText, 4000);
    }
  }

  // Initialize the slider
  updateText(index);
  window.homeSliderIntervalId = setInterval(nextText, 4000);

  // Add event listeners to dots
  dots.forEach((dot, i) => {
    // Add hover effect
    dot.style.transition = "transform 0.2s ease";
    
    dot.addEventListener("mouseenter", () => {
      dot.style.transform = "scale(1.25)";
    });
    
    dot.addEventListener("mouseleave", () => {
      dot.style.transform = "scale(1)";
    });

    // Click handler
    dot.addEventListener("click", () => {
      isPaused = true;
      clearInterval(window.homeSliderIntervalId);
      updateText(i);
      
      // Add resume functionality after 5 seconds
      setTimeout(() => {
        isPaused = false;
        restartInterval();
      }, 15000);
    });
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      prevText();
      restartInterval();
    } else if (e.key === "ArrowRight") {
      nextText();
      restartInterval();
    }
  });

  // Pause on hover
  sliderContainer.addEventListener("mouseenter", () => {
    clearInterval(window.homeSliderIntervalId);
  });

  sliderContainer.addEventListener("mouseleave", () => {
    if (!isPaused) {
      window.homeSliderIntervalId = setInterval(nextText, 4000);
    }
  });

  console.log("✅ Slider initialized with enhanced features");  
}


let currentPage = 'Home'; // default
window.addEventListener('DOMContentLoaded', router);
window.addEventListener('hashchange', router);

function router() {
  const hash = window.location.hash || '#/Home';
  const page = hash.replace('#/', '') || 'Home';

  window.loadPage(page);
}

window.toggleDrawerMenu = () => {
  const drawerMenu = document.getElementById('drawerMenu');
  const menuIcon = document.getElementById('menuIcon');
  const isOpen = drawerMenu.classList.contains('open');

  // Start fade out
  menuIcon.classList.remove('fade-in');
  menuIcon.classList.add('fade-out');

  // Wait for fade-out to finish, then swap the icon and fade in
  setTimeout(() => {
    menuIcon.src = isOpen ? '/public/logoIcons/menu-icon.png' : '/public/logoIcons/close-icon.png';
    menuIcon.classList.remove('fade-out');
    menuIcon.classList.add('fade-in');
  }, 200); // Timing should match CSS transition duration

  // Toggle menu state
  if (isOpen) {
    drawerMenu.classList.remove('open');
    removeOverlayListener();
  } else {
    drawerMenu.classList.add('open');
    addOverlayListener();
  }
}

window.closeDrawerMenu = () => {
  const drawerMenu = document.getElementById('drawerMenu');
  const menuIcon = document.getElementById('menuIcon');

  drawerMenu.classList.remove('open');
  removeOverlayListener();

  // Animate icon switch
  menuIcon.classList.remove('fade-in');
  menuIcon.classList.add('fade-out');

  setTimeout(() => {
    menuIcon.src = '/public/logoIcons/menu-icon.png';
    menuIcon.classList.remove('fade-out');
    menuIcon.classList.add('fade-in');
  }, 200);
}

window.handleOutsideClick = (e) => {
  const drawer = document.getElementById('drawerMenu');
  const toggle = document.querySelector('.menu-toggle');

  if (!drawer.contains(e.target) && !toggle.contains(e.target)) {
    closeDrawerMenu();
  }
}

window.handleEscKey = (e) => {
  if (e.key === 'Escape') {
    closeDrawerMenu();
  }
}

window.addOverlayListener = () => {
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleEscKey);
}

window.removeOverlayListener = () => {
  document.removeEventListener('click', handleOutsideClick);
  document.removeEventListener('keydown', handleEscKey);
}

// Navigation handler + page loader
window.navigateToPage = (page) => {
  currentPage = page;
  loadPage(page); // Your existing page loader
  highlightActiveLink(page);
  closeDrawerMenu();
}

// Highlight active link
window.highlightActiveLink = (page) => {
  const links = document.querySelectorAll('#drawerMenu a');
  links.forEach(link => {
    link.classList.remove('active');
    if (link.textContent.toLowerCase().includes(page.toLowerCase())) {
      link.classList.add('active');
    }
  });
}

window.toggleSubmenu = (e) => {
  e.preventDefault(); // prevent page from jumping
  const submenu = document.getElementById('ourPeopleSubmenu');
  submenu.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', () => {
  const submenuTrigger = document.querySelector('.has-submenu');
  const submenu = document.querySelector('.submenu');

  submenuTrigger.addEventListener('click', (e) => {
    e.preventDefault();

    if (submenu.classList.contains('open')) {
      // Trigger slide-up animation
      submenu.classList.remove('open');
      submenu.classList.add('closing');

      // Wait for animation to finish, then clean up
      setTimeout(() => {
        submenu.classList.remove('closing');
      }, 400); // match the CSS transition duration
    } else {
      submenu.classList.add('open');
    }
  });
});

// Auto-highlight on initial load
/*window.onload = () => {
  loadPage('Home');
  highlightActiveLink('Home');
};*/

window.attachProfileEvents_coreTeam = () => {
  const profileData_coreTeam = [
    {name: 
      `<span class="intro-core"> Nguyễn Thị Ly </span> Có nền tảng học thuật vững chắc về quy hoạch đô thị, phát triển đô thị bền vững, quản lý cơ sở hạ tầng và thiết kế không gian công cộng. Đóng góp vào nhiều dự án nghiên cứu và hỗ trợ kỹ thuật tập trung vào không gian công cộng, phát triển cộng đồng và các chương trình phát triển đô thị. Thể hiện tinh thần làm việc nhóm tuyệt vời, kỹ năng tổ chức rõ ràng và tinh thần trách nhiệm cao. Chủ động, ham học hỏi và cam kết thúc đẩy chuyên môn thông qua việc tham gia vào các dự án đô thị ưu tiên các giải pháp bền vững và thân thiện với môi trường.`, 
      img: "public/profilePhotos/lyly.png"
    },
    {
      name: `<span class="intro-core">Đinh Tùng Dương</span> Tôi có bằng Quản lý Đô thị của Đại học Kiến trúc Hà Nội, nơi tôi vinh dự được vinh danh là Thủ khoa của Hà Nội năm 2023. Trong hai năm qua, tôi đã tích cực đóng góp vào các dự án phát triển đô thị tập trung vào quy hoạch không gian, cải thiện cảnh quan và cuộc sống đô thị bền vững. Tôi có khả năng phân tích và tổ chức mạnh mẽ, cùng với sự thành thạo trong cả phần mềm văn phòng và phần mềm kỹ thuật. Tôi cam kết phát triển chuyên môn liên tục và đặt mục tiêu đóng góp hiệu quả cho một tổ chức tiến bộ, có uy tín. `,
      img: "public/profilePhotos/duong.png"
    },
    {
      name: `<span class="intro-core">Nguyễn Thanh Tâm</span> Chuyên gia tận tụy chuyên về khảo sát số lượng, lập kế hoạch chi tiết và vẽ kỹ thuật. Với kỹ năng làm việc nhóm mạnh mẽ và cách tiếp cận đáng tin cậy, chăm chỉ, tôi đóng góp hiệu quả vào các dự án hợp tác và hoạt động văn phòng. Là một đối tác tích cực của ICUE, tôi đã xây dựng được mạng lưới mạnh mẽ với các chính quyền địa phương, đảm bảo giao tiếp suôn sẻ và hỗ trợ dự án. Tôi rất thành thạo trong các nhiệm vụ hành chính thường xuyên, lập tài liệu dự án và điều phối tại chỗ. Tôi đam mê đóng góp cho nhóm và hỗ trợ sự phát triển và thành công của tổ chức`,  
      img: "public/profilePhotos/tam.png"
    },
    {
      name: `<span class="intro-core">Trịnh Thị Tình </span> Tốt nghiệp chuyên ngành Quản trị kinh doanh tại trường Cao đẳng Du lịch Hà Nội. Ngoài việc quản lý các công việc hành chính văn phòng, tôi còn đóng góp và hỗ trợ nhiều dự án nghiên cứu khoa học khác nhau. Tôi là một cá nhân năng động và có trách nhiệm, luôn khao khát học hỏi và phát triển. Với tinh thần chi tiết và trách nhiệm cao, tôi coi trọng tinh thần làm việc nhóm và áp dụng kinh nghiệm tích lũy được để mang lại kết quả chất lượng. Tôi mong muốn phát triển sự nghiệp của mình hơn nữa trong một môi trường chuyên nghiệp, nơi tôi có thể đóng góp tích cực vào thành công của tổ chức.`,
      img: "public/profilePhotos/tinh.png"
    },
    {
      name: `<span class="intro-core">Nguyễn Quỳnh Ly </span> Tôi tốt nghiệp Đại học Kinh tế Quốc dân, được đào tạo bài bản và có tinh thần trách nhiệm cao trong công việc. Tôi có kinh nghiệm đấu thầu các dự án máy móc thiết bị, cũng như các dự án liên quan đến quy hoạch đô thị. Ngoài ra, tôi có khả năng xử lý nhiều công việc hành chính khác nhau. Những vai trò này đã giúp tôi xây dựng được các kỹ năng chuyên môn và làm việc nhóm mạnh mẽ. Tôi mong muốn được làm việc trong một môi trường chuyên nghiệp, nơi tôi có thể áp dụng các khả năng của mình và đóng góp vào sự phát triển của tổ chức.`,
      img: "public/profilePhotos/lyicue.png"
    },
    {
      name: `<span class="intro-core">Phan Thị Hiến </span> Tốt nghiệp chuyên ngành kế toán tại trường Đại học Mở Hà Nội. Hiện tại tôi đang làm việc trong lĩnh vực kế toán. Với kinh nghiệm, tôi đã tích lũy được nhiều kiến ​​thức và kỹ năng về kế toán, báo cáo tài chính và phân tích dữ liệu. Tôi luôn chú trọng đến tính chính xác và minh bạch trong công việc. Ngoài ra, tôi còn có khả năng làm việc nhóm, giúp tôi phối hợp hiệu quả với các phòng ban khác. Tôi hy vọng sẽ tiếp tục phát triển sự nghiệp kế toán và đóng góp vào sự thành công của công ty.`,
      img: "public/profilePhotos/hien.png"
    },
    
    
  ];

  let currentIndex = 0;
  let touchStartX = 0;
  let touchEndX = 0;
  const MIN_SWIPE_DISTANCE = 15;
  
  const textBox = document.getElementById('profile-text-coreTeam');
  const photo = document.getElementById('profile-photo-coreTeam');
  const container = document.querySelector('.image-container'); // Fixed class name here

  window.updateProfile_coreTeam = (index, direction = 'right') => {
    if (!textBox || !photo) return;
  
    // Step 1: Add exit animation classes
    const isFirstLoad = (currentIndex === 0 && index === 0);

    if (!isFirstLoad) {
    textBox.classList.add(direction === 'right' ? 'slide-exit-left' : 'slide-exit-right');
    photo.classList.add(direction === 'right' ? 'slide-exit-left' : 'slide-exit-right');}
  
    setTimeout(() => {
      // Step 2: Update the content
      textBox.innerHTML = `<div>${profileData_coreTeam[index].name}</div>`;
      photo.src = profileData_coreTeam[index].img;
  
      // Step 3: Remove exit animation classes
      textBox.classList.remove('slide-exit-left', 'slide-exit-right');
      photo.classList.remove('slide-exit-left', 'slide-exit-right');
  
      // (Optional) remove old enter classes in case
      textBox.classList.remove('slide-enter-left', 'slide-enter-right');
      photo.classList.remove('slide-enter-left', 'slide-enter-right');
  
      // Step 4: Animate using GSAP (✅ after content is updated)
      const tl = gsap.timeline();
  
      if (isFirstLoad) {
        // 👑 First time opening animation
        tl.fromTo(photo, 
          { y: 100, scale: 0.8, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 1, ease: "power3.out" }
        );
  
        tl.fromTo(textBox,
          { y: -50, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: "bounce.out" },
          "-=0.8" // overlap a bit
        );
  
      } else {
        // 👉 Normal sliding between profiles
        tl.fromTo(photo, 
          { x: direction === 'right' ? 100 : -100, opacity: 0 }, 
          { x: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
        );
  
        tl.fromTo(textBox, 
          { x: direction === 'right' ? 100 : -100, opacity: 0 }, 
          { x: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
          "-=0.5"
        );
      }
  
    }, isFirstLoad ? 0 : 800); // No delay if first load
  };

  document.getElementById('next-btn')?.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % profileData_coreTeam.length;
    updateProfile_coreTeam(currentIndex, 'right');
  });

  document.getElementById('prev-btn')?.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + profileData_coreTeam.length) % profileData_coreTeam.length;
    updateProfile_coreTeam(currentIndex, 'left');
  });

  // Add touch support for mobile
  if (container) {
    container.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    container.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchEndX - touchStartX;
      
      if (Math.abs(swipeDistance) > MIN_SWIPE_DISTANCE) {
        if (swipeDistance > 0) {
          document.getElementById('prev-btn')?.click();
        } else {
          document.getElementById('next-btn')?.click();
        }
      }
    });
  }

  // Preload all profile images
profileData_coreTeam.forEach(profile => {
  const img = new Image();
  img.src = profile.img;
});
  // Start first profile
  updateProfile_coreTeam(0); // Fixed here
}

attachProfileEvents_coreTeam(); // Initialize the function


window.initLogoSlider = () => {
  const logoList = document.getElementById('logoList');
  if (!logoList) return;

  let position = 0;
  let speed = 1;
  let isPaused = false;

  const loop = () => {
    if (!isPaused) {
      position -= speed;
      const listWidth = logoList.scrollWidth;
      const containerWidth = logoList.parentElement.offsetWidth;

      // Reset when it scrolls out of view
      if (-position >= listWidth) {
        position = containerWidth;
      }

      logoList.style.transform = `translateX(${position}px)`;
    }
    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);

  // Pause on hover
  logoList.parentElement.addEventListener('mouseenter', () => isPaused = true);
  logoList.parentElement.addEventListener('mouseleave', () => isPaused = false);

  const arrowLeft = document.getElementById('arrowLeft');
  const arrowRight = document.getElementById('arrowRight');

  if (arrowLeft) arrowLeft.addEventListener('click', () => { speed = 1; isPaused = false; });
  if (arrowRight) arrowRight.addEventListener('click', () => { speed = -1; isPaused = false; });
};

// ===================
// News Slider (Mobile Only)
// ===================
window.initMobileNewsSlider = () => {
  if (window.innerWidth <= 1366) {

  const containers = document.querySelectorAll(".news-container");
  const leftArrow = document.getElementById("arrowNewsLeft");
  const rightArrow = document.getElementById("arrowNewsRight");

  if (!containers.length || !leftArrow || !rightArrow) return;

  let currentIndex = 0;

  function updateSlider() {
    containers.forEach((container, index) => {
      container.style.display = index === currentIndex ? "block" : "none";
    });
  }

  leftArrow.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + containers.length) % containers.length;
    updateSlider();
  });

  rightArrow.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % containers.length;
    updateSlider();
  });

  updateSlider();
}};

// Call when DOM is ready
document.addEventListener("DOMContentLoaded", initMobileNewsSlider);


window.createBalloons = () => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeead', '#d4a5a5', '#9b5de5'];
    const container = document.body;
    
    // Create 15 balloons
    for (let i = 0; i < 15; i++) {
        const balloon = document.createElement('div');
        balloon.className = 'balloon';
        balloon.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        balloon.style.left = `${Math.random() * 80 + 10}%`; // Random position between 10% and 90%
        balloon.style.animationDelay = `${i * 0.2}s`; // Stagger the animations
        
        container.appendChild(balloon);
        
        // Remove balloon after animation completes
        balloon.addEventListener('animationend', () => {
            balloon.remove();
        });
    }
}

// Initialize balloon button when the page loads
document.addEventListener('DOMContentLoaded', function() {
    const balloonButton = document.getElementById('balloonButton');
    if (balloonButton) {
        balloonButton.addEventListener('click', function() {
            createBalloons();
        });
    }
});

window.initPostMethod = () => {
const form = document.getElementById("contactForm");
    const thankYou = document.getElementById("thankYouMessage");

    form.addEventListener("submit", function (e) {
      e.preventDefault(); // Stop regular submission
      const formData = new FormData(form);

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(formData).toString()
      })
      .then(() => {
        form.style.display = "none";
        thankYou.style.display = "block";
      })
      .catch((error) => alert("Something went wrong. Please try again."));
    });
  }