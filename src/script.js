console.log('[script.js] Loaded ✅');
// Enhanced touch device detection that excludes laptops with trackpads

function isTruelyTouchDevice() {
   
    const isProbablyMac = (() => {
        // Check User Agent for macOS indicators
        const userAgent = navigator.userAgent.toLowerCase();
        if (/mac os x|macos|macintosh/.test(userAgent)) return true;
        
        // Check userAgentData if available (modern browsers)
        if (navigator.userAgentData?.platform) {
            return navigator.userAgentData.platform.toLowerCase() === 'macos';
        }
        
        // Fallback: Check for Mac-specific features
        try {
            // Mac-specific CSS media query
            return window.matchMedia('(-webkit-device-pixel-ratio: 1)').matches && 
                   /safari/i.test(navigator.userAgent) && 
                   !/chrome/i.test(navigator.userAgent);
        } catch (e) {
            return false;
        }
    })();
    
    // Basic touch capability check
    const hasBasicTouch = (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
    
    if (!hasBasicTouch) return false;
    
    const screenWidth = screen.width;
    const screenHeight = screen.height;
    const maxDimension = Math.max(screenWidth, screenHeight);
    const minDimension = Math.min(screenWidth, screenHeight);
    
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (isProbablyMac) {
        const isMacOS = /mac os x/.test(userAgent);
        const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
        
        if (isMacOS && !hasCoarsePointer) return false;
        
        if (minDimension >= 800 && maxDimension >= 1200) return false;
    }
    
    if (/windows/.test(userAgent)) {
        const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
        
        if (hasFinePointer && !hasCoarsePointer) return false;
        
        if (minDimension >= 768 && maxDimension >= 1024) {
            if (navigator.maxTouchPoints <= 5) return false;
        }
    }
    
    const canHover = window.matchMedia('(hover: hover)').matches;
    if (canHover) return false;
    
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    if (!hasCoarsePointer) return false;
    
    const supportsOrientation = 'orientation' in window;
    
    const isLikelyMobileSize = (
        (minDimension <= 768 && maxDimension <= 1024) || 
        (minDimension <= 414 && maxDimension <= 896) ||  
        (window.innerWidth <= 768) 
    );
    
    const devicePixelRatio = window.devicePixelRatio || 1;
    const hasHighDPR = devicePixelRatio > 1.5;
    
    return hasBasicTouch && 
           hasCoarsePointer && 
           !canHover && 
           (isLikelyMobileSize || supportsOrientation || hasHighDPR);
}

function isTouchPrimaryDevice() {
    const hasTouchCapability = (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0
    );
    
    if (!hasTouchCapability) return false;
    
    const primaryPointerCoarse = window.matchMedia('(pointer: coarse)').matches;
    if (!primaryPointerCoarse) return false;

    const canHover = window.matchMedia('(hover: hover)').matches;
    return !canHover;
}

let isAnimating = false;

function typeHTMLString(
  targetElement, 
  htmlString, 
  baseSpeed = 50, // average speed (ms per char)
  onComplete = null, 
  typingSessionObj = null
) {
  targetElement.innerHTML = "";

  const tempContainer = document.createElement("div");
  tempContainer.innerHTML = htmlString;
  const nodes = Array.from(tempContainer.childNodes);
  let nodeIndex = 0;

  // Cursor setup
  const cursor = document.createElement("span");
  cursor.className = "svg-blinking-cursor";
  targetElement.appendChild(cursor);

  const svgCursor = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgCursor.setAttribute("width", "24");
  svgCursor.setAttribute("height", "24");
  svgCursor.setAttribute("viewBox", "0 0 24 24");
  svgCursor.setAttribute("class", "svg-blinking-cursor");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "black");
  path.setAttribute("d", "M12,13 L10.5,13 C10.2238576,13 10,12.7761424 10,12.5 C10,12.2238576 10.2238576,12 10.5,12 L12,12 L12,5.5 C12,4.67157288 11.3284271,4 10.5,4 L9.5,4 C9.22385763,4 9,3.77614237 9,3.5 C9,3.22385763 9.22385763,3 9.5,3 L10.5,3 C11.3177995,3 12.0438856,3.39267155 12.5,3.99975627 C12.9561144,3.39267155 13.6822005,3 14.5,3 L15.5,3 C15.7761424,3 16,3.22385763 16,3.5 C16,3.77614237 15.7761424,4 15.5,4 L14.5,4 C13.6715729,4 13,4.67157288 13,5.5 L13,12 L14.5,12 C14.7761424,12 15,12.2238576 15,12.5 C15,12.7761424 14.7761424,13 14.5,13 L13,13 L13,19.5 C13,20.3284271 13.6715729,21 14.5,21 L15.5,21 C15.7761424,21 16,21.2238576 16,21.5 C16,21.7761424 15.7761424,22 15.5,22 L14.5,22 C13.6822005,22 12.9561144,21.6073285 12.5,21.0002437 C12.0438856,21.6073285 11.3177995,22 10.5,22 L9.5,22 C9.22385763,22 9,21.7761424 9,21.5 C9,21.2238576 9.22385763,21 9.5,21 L10.5,21 C11.3284271,21 12,20.3284271 12,19.5 L12,13 Z");
  svgCursor.appendChild(path);
  targetElement.appendChild(svgCursor);

  let burstMode = false;
  let burstCounter = 0;

  function randomSpeed(baseSpeed, lastChar = "") {
      if (/[.,!?]/.test(lastChar)) {
          return baseSpeed * (5 + Math.random() * 3);
      }
      
      if (burstMode) {
          if (--burstCounter <= 0) burstMode = false;
          return baseSpeed * (0.4 + Math.random() * 0.4);
      }
      
      if (Math.random() < 0.1) {
          burstMode = true;
          burstCounter = Math.floor(Math.random() * 5) + 3;
      }
      
      return baseSpeed * (1.5 + Math.random() * 1.5);
  }

      function calculateSpeeds(baseSpeed = null) {
        const speed = baseSpeed || parseInt(document.getElementById('baseSpeed')?.value) || 100;

        const normalSpeed = speed * 3.75;
        const burstSpeed = speed * 0.6;
        const punctuationSpeed = speed * 6.5;

        const charsPerMinute = 60000 / speed;
        const normalWPM = Math.round((60000 / normalSpeed) / 6);
        const burstWPM = Math.round((60000 / burstSpeed) / 6);
        const overallWPM = Math.round(charsPerMinute / 6);
        const punctuationWPM = Math.round((60000 / punctuationSpeed) / 6);

        const realisticAverage = Math.round((normalWPM * 0.8) + (burstWPM * 0.1) + (punctuationWPM * 0.1));

        const speedData = {
          baseSpeed: speed,
          overallWPM: overallWPM,
          normalWPM: normalWPM,
          burstWPM: burstWPM,
          punctuationWPM: punctuationWPM,
          realisticAverage: realisticAverage
        };

        const resultsElement = document.getElementById('speedResults');
        if (resultsElement) {
          const results = `
            <div class="result">
              <h4>Your Typing Speeds:</h4>
              <p><strong>Base Speed:</strong> ${speed}ms between characters</p>
              <p><strong>Overall WPM:</strong> <span class="highlight">${overallWPM} WPM</span></p>
              <p><strong>Normal Typing:</strong> ${normalWPM} WPM (80% of time)</p>
              <p><strong>Burst Mode:</strong> <span class="highlight">${burstWPM} WPM</span> (10% of time - FAST!)</p>
              <p><strong>After Punctuation:</strong> ${punctuationWPM} WPM (10% of time - thinking pauses)</p>

              <div style="margin-top: 15px; padding: 10px; background: #0f2419; border-radius: 4px;">
                <strong>Realistic Average: ${realisticAverage} WPM</strong>
              </div>
            </div>
          `;
          resultsElement.innerHTML = results;
        }

        return speedData;
      }

  function getTypingSpeed(baseSpeed, lastChar = "", showAnalysis = false) {
      const delay = randomSpeed(baseSpeed, lastChar);
      
      if (showAnalysis) {
          const analysis = calculateSpeeds(baseSpeed);
          console.log('Current typing analysis:', analysis);
      }
      
      return delay;
  }

  function typeNextNode() {
    if ((typingSessionObj && typingSessionObj.skip) || nodeIndex >= nodes.length) {
      for (; nodeIndex < nodes.length; nodeIndex++) {
        const node = nodes[nodeIndex];
        targetElement.insertBefore(node.cloneNode(true), cursor);
      }
      if (typeof onComplete === "function") onComplete();
      return;
    }

    const node = nodes[nodeIndex++];
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const span = document.createElement("span");
      targetElement.insertBefore(span, cursor);

      let charIndex = 0;
      function typeChar() {
        if (typingSessionObj?.skip) {
          span.textContent = text;
          typeNextNode();
          return;
        }
        if (charIndex < text.length) {
          span.textContent += text.charAt(charIndex++);
          const lastChar = span.textContent.slice(-2, -1); // Get previous character
          setTimeout(typeChar, randomSpeed(baseSpeed, lastChar));
        } else {
          typeNextNode();
        }
      }
      typeChar();

    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const wrapper = node.cloneNode(false);
      targetElement.insertBefore(wrapper, cursor);

      const childNodes = Array.from(node.childNodes);
      let childIndex = 0;

      function typeChildNode() {
        if (typingSessionObj?.skip) {
          wrapper.innerHTML = node.innerHTML;
          typeNextNode();
          return;
        }
        if (childIndex >= childNodes.length) {
          typeNextNode();
          return;
        }

        const child = childNodes[childIndex++];
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent;
          const span = document.createElement("span");
          wrapper.appendChild(span);

          let charIndex = 0;
          function typeChar() {
            if (typingSessionObj?.skip) {
              span.textContent = text;
              typeChildNode();
              return;
            }
            if (charIndex < text.length) {
              span.textContent += text.charAt(charIndex++);
              const lastChar = span.textContent.slice(-2, -1); // Get previous character
              setTimeout(typeChar, randomSpeed(baseSpeed, lastChar));
            } else {
              typeChildNode();
            }
          }
          typeChar();

        } else {
          wrapper.appendChild(child.cloneNode(true));
          typeChildNode();
        }
      }
      typeChildNode();

    } else {
      targetElement.insertBefore(node.cloneNode(true), cursor);
      typeNextNode();
    }
  }

  typeNextNode();
}

const homeMobileObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in');
      entry.target.classList.remove('animate-out');
    }
    else {
      entry.target.classList.remove('animate-in');
      entry.target.classList.add('animate-out');
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

const initHomeMobileObserver = () => {
  homeMobileObserver.disconnect();
  document.querySelectorAll('.home-section__header').forEach(el => {
    homeMobileObserver.observe(el);
  });
};

const destroyHomeMobileObserver = () => {
  homeMobileObserver.disconnect();
};

document.addEventListener('DOMContentLoaded', () => {
  initHomeMobileObserver();
});

const homeMobileCardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in-card');
      entry.target.classList.remove('animate-out-card');
    }
    else {
      entry.target.classList.remove('animate-in-card');
      entry.target.classList.add('animate-out-card');
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

const initHomeMobileCardObserver = () => {
  homeMobileCardObserver.disconnect();
  document.querySelectorAll('.home-card').forEach(el => {
    homeMobileCardObserver.observe(el);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  initHomeMobileCardObserver();
});

const destroyHomeMobileCardObserver = () => {
  homeMobileCardObserver.disconnect();
};

window.makeItRainText = () => {
  const el = document.querySelector("#rainText");
  if (!el) return;

  const text = el.textContent.trim();
  el.textContent = "";

  text.split("").forEach((char, i) => {
    const span = document.createElement("span");
    span.textContent = char === " " ? "\u00A0" : char;
    span.style.display = "inline-block";
    span.style.opacity = 0;
    el.appendChild(span);

    gsap.fromTo(
      span,
      { y: "-40vh", opacity: 0 },
      {
        y: 0,
        opacity: 1,
        delay: i * 0.25,
        duration: 3,
        ease: "bounce.out"
      }
    );
  });
};

window.addEventListener("DOMContentLoaded", () => {
  window.makeItRainText();
});

window.attachProfileEvents_moe = () => {
  const profileData_moe = [
    {
      name: `<span class="intro-people">Tiến Sỹ Nguyễn Hồng Hạnh</span><br> Viện trưởng Viện Nghiên cứu Kinh tế Xây Dựng và Đô thị thuộc Tổng Hội Xây Dựng Việt Nam; là chuyên gia về tư vấn quy hoạch, phát triển đô thị và quản lý xây dựng. Nguyên là phó cục trưởng Cục Phát Triển Đô thị thuộc Bộ Xây Dựng (2008-2013); Phó Viện Trưởng thường trực Viện Nghiên Cứu Kinh Tế Xây Dựng và Đô Thị (2013-2018); Viện Trưởng Viện Nghiên Cứu Kinh Tế Xây Dựng và Đô Thị (3/2018 - nay). Có những sáng kiến lớn về phát triển đô thị xanh, biến đổi khí hậu và đa dạng sinh học; chuyển giao ứng dụng khoa học công nghệ vào chuyển đổi xanh trong kinh tế nông nghiệp và đô thị; tư vấn pháp luật, chính sách cho quy hoạch quốc gia và khu vực.`,
      img: "public/profilePhotos/hanhnguyen.jpg"
    },
    {
      name: `<span class="intro-people">Phó Viện Trưởng TS.KTS Trần Thị Lan Anh</span><br> Chuyên gia quy hoạch và phát triển đô thị; xây dựng chiến lược, hoạch định chính sách và phát triển bền vững. Tiến Sỹ và Thạc Sỹ từ Đại học Tokyo, nền tảng vững chắc về thích ứng với biến đổi khí hậu, phân lại đô thị và chiến lược phát triển quốc gia. Nguyên Phó cục trưởng Cục Phát triển Đô thị-Bộ xây dựng, tham gia các chương trình lớn về phát triển đô thị và quy hoạch đô thị`,
      img: "public/profilePhotos/tranthilananh.jpg"
    },
    {
      name: `<span class="intro-people">Phó Viện Trưởng KS. Trần Quốc Toản </span><br> Kinh nghiệm trong lĩnh vực Hạ tầng kỹ thuật giao thông. Phó cục trưởng Cục giám định-Bộ Giao thông vận tải và các hiệp hội kỹ thuật. Tư vấn chính sách, quy hoạch thông minh và phát triển chiến lược tăng trưởng xanh, các dự án quốc gia lớn`,
      img: "public/profilePhotos/tranquoctoan.jpg"
    },
    {
      name: `<span class="intro-people">Phó Viện Trưởng KTS. Nguyễn Thanh Tâm </span><br> Công tác trong lĩnh vực quy hoạch đô thị, tham gia nghiên cứu và quản lý các đồ án quy hoạch, phục vụ công tác quản lý nhà nước và định hướng phát triển không gian đô thị theo quy định`,
      img: "public/profilePhotos/tam.png"
    },
    {
      name: `<span class="intro-people"> Đỗ Bảo Long - Quản Lý Dự Án </span><br> Một cán bộ dự án tận tụy với bằng Thạc sỹ-Quản Lý Dự Án từ đại học Salford, vương quốc Anh, cùng với chứng chỉ CCNA và An ninh mạng. Có hơn 5 năm kinh nghiệm trong lĩnh vực ngân hàng, bán lẻ, <span class="highlight-text-phrase-moe">quản lý hợp đồng (thông minh)</span> và tài chính. Có thể quản lý các dự án phức tạp và mang lại kết quả hiệu quả. Kết hợp các kỹ năng kỹ thuật mạnh mẽ với thực hiện thực tế, đảm bảo sự phối hợp nhịp nhàng giữa các nhóm và các bên liên quan. Có khả năng thích nghi cao và chú ý đến chi tiết, với niềm đam mê với phần cứng máy tính, mã hóa và trò chơi. Có kinh nghiệm <span class="highlight-text-phrase-moe">thiết kế</span> và <span class="highlight-text-phrase-moe">giải quyết vấn đề sáng tạo</span>. 🔧💬 <a href="https://longd.tech/" target="_blank">Trang cá nhân</a>`,
      img: "public/profilePhotos/giaminh.jpg"
    }
  ];

  let currentIndex = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  const MIN_SWIPE_DISTANCE = 15;
  
  const textBox = document.getElementById('profile-text');
  const photo = document.getElementById('profile-photo');
  const container = document.querySelector('.image-container');

  // Visual cues: add left/right overlays
  if (textBox && !document.getElementById('profile-cue-left')) {
    const leftCue = document.createElement('div');
    leftCue.id = 'profile-cue-left';
    leftCue.style.position = 'absolute';
    leftCue.style.left = 0;
    leftCue.style.top = 0;
    leftCue.style.width = '40%';
    leftCue.style.height = '100%';
    leftCue.style.pointerEvents = 'none';
    leftCue.style.display = 'flex';
    leftCue.style.alignItems = 'center';
    leftCue.style.justifyContent = 'flex-start';
    leftCue.style.zIndex = 2;
    leftCue.innerHTML = '<span style="font-size:2rem;opacity:0.25;margin-left:8px;user-select:none;">&#8592;</span>';
    textBox.style.position = 'relative';
    textBox.appendChild(leftCue);
    const rightCue = document.createElement('div');
    rightCue.id = 'profile-cue-right';
    rightCue.style.position = 'absolute';
    rightCue.style.right = 0;
    rightCue.style.top = 0;
    rightCue.style.width = '40%';
    rightCue.style.height = '100%';
    rightCue.style.pointerEvents = 'none';
    rightCue.style.display = 'flex';
    rightCue.style.alignItems = 'center';
    rightCue.style.justifyContent = 'flex-end';
    rightCue.style.zIndex = 2;
    rightCue.innerHTML = '<span style="font-size:2rem;opacity:0.25;margin-right:8px;user-select:none;">&#8594;</span>';
    textBox.appendChild(rightCue);
  }

  let typingSessionObj = { skip: false };
  let isTyping = false;
  let skipOnNextClick = false;

  function updateProfile_moe (index, direction = 'right') {
    if (!textBox || !photo) return;
    const isFirstLoad = (currentIndex === 0 && index === 0);
    if (!isFirstLoad) {
      textBox.classList.add(direction === 'right' ? 'slide-exit-right' : 'slide-exit-left');
      photo.classList.add(direction === 'right' ? 'slide-exit-left' : 'slide-exit-right');
    }
    
    setTimeout(() => {
      textBox.innerHTML = "";
      const message = profileData_moe[index].name;
      const containerDiv = document.createElement("div");
      textBox.appendChild(containerDiv);
      typingSessionObj = { skip: false };
      isTyping = true;
      skipOnNextClick = false;
      typeHTMLString(containerDiv, message, 50, () => {
        gsap.fromTo(containerDiv, 
          { opacity: 0, y: 10, scale: 0.98 }, 
          { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power1.out" }
        );
        isTyping = false;
        skipOnNextClick = false;
      }, typingSessionObj);
      
      photo.src = profileData_moe[index].img;
      textBox.classList.remove('slide-exit-left', 'slide-exit-right');
      photo.classList.remove('slide-exit-left', 'slide-exit-right');
      const tl = gsap.timeline();
      tl.fromTo(photo, 
        { x: direction === 'right' ? -100 : 100, scale: 0.5, opacity: 0 }, 
        { x: 0, opacity: 1, duration: 1.5, scale: 1, ease: "power2.out" }
      );
      tl.fromTo(textBox, 
        { x: direction === 'right' ? 100 : -100, scale: 1.5, opacity: 0 }, 
        { x: 0, opacity: 1, duration: 1.5, scale: 1, ease: "power2.out" },
        "-=0.5"
      );
    }, 300);
  };

  document.getElementById('moe-next-btn')?.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % profileData_moe.length;
    updateProfile_moe(currentIndex, 'right');
  });
  document.getElementById('moe-prev-btn')?.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + profileData_moe.length) % profileData_moe.length;
    updateProfile_moe(currentIndex, 'left');
  });

  
  updateProfile_moe(0);

  if (textBox) {
      const handleClick = (e) => {
        if (isTyping) {
          typingSessionObj.skip = true;
          return;
        }
      };
      textBox.addEventListener('click', handleClick);
    }

  if (textBox && isTruelyTouchDevice()) {
  const swipeElements = [container, textBox];
  let swipeLocked = false;
  
  const prevBtn = document.getElementById('moe-prev-btn');
  const nextBtn = document.getElementById('moe-next-btn');
  if (prevBtn) prevBtn.style.display = 'none';
  if (nextBtn) nextBtn.style.display = 'none';

  swipeElements.forEach(el => {
    el.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;  // Track vertical position
    });

    el.addEventListener('touchend', (e) => {
      if (swipeLocked) return;

      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;  // Track vertical position

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Ignore diagonal or mostly vertical swipes
      if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE || Math.abs(deltaY) > Math.abs(deltaX)) {
        return;  // Vertical or diagonal swipe
      }

      const swipeDistance = deltaX;

      if (Math.abs(swipeDistance) > MIN_SWIPE_DISTANCE) {
        swipeLocked = true;
          // Right swipe (next)
            if (swipeDistance > 0) {
                currentIndex = (currentIndex - 1 + profileData_moe.length) % profileData_moe.length;
                updateProfile_moe(currentIndex, 'left');
              }
              // Left swipe (previous)
              else {
                currentIndex = (currentIndex + 1) % profileData_moe.length;
                updateProfile_moe(currentIndex, 'right');
              }

              setTimeout(() => swipeLocked = false, 500); // Debounce
            }
          });
        });
      }
  }

window.calendarModal = () => {
    const calendarIcon = document.querySelector('.calendar-icon svg');
    const calendarLink = document.querySelector('.calendar-icon');
    const calendarModal = document.getElementById('calendar-modal');
    const calendarModalContent = document.getElementById('calendar-modal-content');
    const calendarModalSvg = document.getElementById('calendar-modal-svg');
    const calendarModalClose = document.getElementById('calendar-modal-close');

if (calendarIcon && calendarLink && calendarModal && calendarModalSvg && calendarModalClose) {
        calendarLink.addEventListener('click', function(e) {
            // Clone the calendar SVG
            const clone = calendarIcon.cloneNode(true);
            // Clear previous
            calendarModalSvg.innerHTML = '';
            calendarModalSvg.appendChild(clone);
            // Style the SVG
            clone.style.width = '340px';
            clone.style.height = '340px';
            clone.style.display = 'block';
            calendarModal.style.display = 'flex';
        });
        calendarModalClose.addEventListener('click', function() {
            calendarModal.style.display = 'none';
        });
        // Close modal when clicking outside modal content
        calendarModal.addEventListener('click', function(e) {
            if (e.target === calendarModal) {
                calendarModal.style.display = 'none';
      }
  });
}}

window.setNavLinkContrast = (useLightLinks = false) => {
  const nav = document.querySelector('.menu-bar');
  const menuToggle = document.querySelector('.menu-toggle');
  const menuIcon = document.getElementById('menuIcon');
  const contactLink = document.getElementById('contactLink');
  const shouldUseLight = !!useLightLinks;

  if (nav) nav.classList.toggle('nav-on-dark', shouldUseLight);
  if (menuToggle) menuToggle.classList.toggle('nav-on-dark', shouldUseLight);
  if (menuIcon) menuIcon.classList.toggle('nav-icon-on-dark', shouldUseLight);
  if (contactLink) contactLink.classList.toggle('nav-link-on-dark', shouldUseLight);
};

const HomeBackgroundVideoManager = (() => {
  const STORAGE_KEY_ENABLED = 'home_bg_video_enabled';
  let _enabled = false; // In-memory state

  const initEnabledState = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_ENABLED);
        // Default OFF when user has never set a preference.
        if (raw === null) _enabled = false;
        else _enabled = (raw === '1' || raw === 'true' || raw === 'on');
      } catch (e) {
        _enabled = false;
      }
  };

  const getUserEnabled = () => _enabled;

  const setUserEnabled = (enabled) => {
    _enabled = enabled;
    try {
      localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? '1' : '0');
    } catch (e) {
      // ignore
    }
  };

  // Initialize state immediately
  initEnabledState();

  const videoPlaylist = [
    {
      id: 'momentum',
      desktop: 'public/bgVideos/home_bg_1.mp4',
      mobile: 'public/bgVideos/home_bg_1_mobile.mp4',
      prefersLightNav: true
    },
    {
      id: 'harmony',
      desktop: 'public/bgVideos/home_bg_2.mp4',
      mobile: 'public/bgVideos/home_bg_2_mobile.mp4',
      prefersLightNav: true
    },
    {
      id: 'luminous',
      desktop: 'public/bgVideos/home_bg_3.mp4',
      mobile: 'public/bgVideos/home_bg_3_mobile.mp4',
      prefersLightNav: true
    },
    {
      id: 'kaleidoscope',
      desktop: 'public/bgVideos/home_bg_4.mp4',
      mobile: 'public/bgVideos/home_bg_4_mobile.mp4',
      prefersLightNav: true
    },
  ];

  const preloadedSources = new Set();
  let videoEl = null;
  let resizeHandler = null;
  let visibilityHandler = null;
  let endFallbackHandler = null;
  let isTransitioning = false;
  let watchdogTimer = null;
  let lastProgressTime = 0;
  let lastCurrentTime = 0;
  let playRetryTimer = null;
  let playHandler = null;
  let pauseHandler = null;
  let waitingHandler = null;
  let stalledHandler = null;
  let errorHandler = null;
  let activeMeta = null;
  let errorSwapAttempted = false;
  let currentIndex = -1;
  let warmupVideo = null;

  const logHomeBg = (...args) => console.log('[HomeBackgroundVideo]', ...args);

  const debounce = (fn, delay = 200) => {
    let timer;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  const scheduleIdleTask = (task) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(task, { timeout: 2000 });
    } else {
      setTimeout(task, 100); // Small delay instead of 0 to avoid blocking main thread
    }
  };

  const isMobileViewport = () => window.matchMedia('(max-width: 767px)').matches;

  const getConnection = () => navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  const canPlayVideosInThisContext = () => {
    const connection = getConnection();
    const slowNetwork = connection && (connection.saveData || /(slow-2g|2g)/i.test(connection.effectiveType || ''));
    // Mobile is allowed: keep video available and let the user toggle.
    // Still respect reduced-motion and data-saver/slow-network.
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !slowNetwork;
  };

  const shouldKeepStatic = () => {
    if (!getUserEnabled()) return true;
    return !canPlayVideosInThisContext();
  };

  const syncRootVideoStateAttr = () => {
    if (!document?.documentElement) return;
    const shouldHide = shouldKeepStatic();
    
    // Safety check: ensure we have the element reference even if internal state is cleared
    const el = videoEl || document.getElementById('bgVideo');

    if (shouldHide) {
      document.documentElement.setAttribute('data-home-bg-video', 'off');
      // Direct force hide to ensure it applies even if CSS is lagging or overridden
      if (el) el.style.display = 'none';
    } else {
      document.documentElement.removeAttribute('data-home-bg-video');
      if (el) el.style.display = '';
    }
  };

  const ensureVideoElement = () => {
    videoEl = document.getElementById('bgVideo');
    if (!videoEl) {
        const mediaContainer = document.querySelector('.home-hero__media');
        if (mediaContainer) {
            videoEl = document.createElement('video');
            videoEl.id = 'bgVideo';
            videoEl.className = 'video-bg';
            const overlay = mediaContainer.querySelector('.home-hero__overlay');
            if (overlay) {
                mediaContainer.insertBefore(videoEl, overlay);
            } else {
                mediaContainer.appendChild(videoEl);
            }
        }
    }
    if (videoEl) {
      videoEl.loop = false;
      videoEl.preload = 'auto';
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.setAttribute('muted', '');
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('autoplay', '');
      videoEl.setAttribute('webkit-playsinline', '');
    }
    return videoEl;
  };

  // Simplified - no longer needed since we use direct src assignment
  // Kept for backward compatibility but returns early
  const ensureSources = () => {
    return { desktop: null, mobile: null };
  };

  const applyNavTheme = (meta) => {
    if (typeof window.setNavLinkContrast === 'function') {
      window.setNavLinkContrast(!!meta?.prefersLightNav);
    }
  };

  const clearVideoSources = () => {
    if (!videoEl) return;
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
    videoEl.load();
  };

  const persistIndex = (index) => sessionStorage.setItem('home_bg_video_index', String(index));

  const nextIndex = () => {
    if (!videoPlaylist.length) return -1;
    const cached = parseInt(sessionStorage.getItem('home_bg_video_index') ?? '-1', 10);
    if (Number.isInteger(cached) && cached >= 0) {
      return (cached + 1) % videoPlaylist.length;
    }
    return Math.floor(Math.random() * videoPlaylist.length);
  };

  const prefetchSources = (meta) => {
    if (!meta) return;
    [meta.desktop, meta.mobile ?? meta.desktop].forEach(src => {
      if (!src || preloadedSources.has(src)) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = src;
      document.head.appendChild(link);
      preloadedSources.add(src);
    });
  };

  const warmVideoForMeta = (meta) => {
    if (!meta) return;

    if (!warmupVideo) {
      warmupVideo = document.createElement('video');
      warmupVideo.muted = true;
      warmupVideo.playsInline = true;
      warmupVideo.preload = 'metadata'; // Changed from 'auto' to 'metadata' for lighter load
      warmupVideo.setAttribute('aria-hidden', 'true');
      warmupVideo.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;pointer-events:none;';
      document.body.appendChild(warmupVideo);
    }

    const prefersMobile = window.matchMedia('(max-width: 767px)').matches;
    const src = prefersMobile && meta.mobile ? meta.mobile : meta.desktop;
    if (!src) return;

    const cachedSrc = warmupVideo.getAttribute('data-src');
    if (cachedSrc === src) return;

    warmupVideo.setAttribute('data-src', src);
    warmupVideo.src = src;
    warmupVideo.load();
  };

  const attemptPlay = (label = 'play') => {
    if (!videoEl) return;
    const playPromise = videoEl.play();
    if (playPromise?.catch) {
      playPromise.catch(err => {
        console.warn('[HomeBackgroundVideo] Autoplay blocked:', err);
        logHomeBg('play failed', { label, err });
        videoEl.muted = true;
        videoEl.setAttribute('muted', '');
        setTimeout(() => {
          videoEl.play().catch(e2 => console.warn('[HomeBackgroundVideo] Retry play failed:', e2));
        }, 200);
      });
    }
  };

  const activateVideo = (meta) => {
    if (!videoEl || !meta) return;
    
    const prefersMobile = window.matchMedia('(max-width: 767px)').matches;
    const chosenSrc = prefersMobile && meta.mobile ? meta.mobile : meta.desktop;
    if (!chosenSrc) return;
    
    // Skip if already active to avoid unnecessary reloads
    const currentActiveSrc = videoEl.getAttribute('data-active-src');
    if (currentActiveSrc === chosenSrc) {
      logHomeBg('skip activate - already active', meta.id);
      return;
    }
    
    videoEl.src = chosenSrc;
    videoEl.setAttribute('data-active-src', chosenSrc);
    videoEl.setAttribute('data-video-key', meta.id);
    activeMeta = meta;
    errorSwapAttempted = false;

    logHomeBg('activate', meta.id, { chosenSrc });

    videoEl.load();

    try {
      videoEl.currentTime = 0;
    } catch (e) {
      logHomeBg('currentTime reset failed', e);
    }

    if (videoEl.readyState >= 2) {
      attemptPlay('ready');
    } else {
      videoEl.addEventListener('loadedmetadata', () => logHomeBg('loadedmetadata', { duration: videoEl.duration, src: videoEl.currentSrc || videoEl.src }), { once: true });
      videoEl.addEventListener('canplay', () => attemptPlay('canplay'), { once: true });
    }

    if (playRetryTimer) clearTimeout(playRetryTimer);
    playRetryTimer = setTimeout(() => {
      if (!videoEl || isTransitioning || !videoEl.paused) return;
      logHomeBg('retry watchdog: forcing play', { currentTime: videoEl.currentTime, duration: videoEl.duration });
      attemptPlay('retry-watchdog');
    }, 1500);

    if (videoPlaylist.length > 1) {
      const upcoming = videoPlaylist[(currentIndex + 1) % videoPlaylist.length];
      scheduleIdleTask(() => {
        prefetchSources(upcoming);
        warmVideoForMeta(upcoming);
      });
    }
  };

  const goToIndex = (index) => {
    if (!videoPlaylist[index]) return;
    currentIndex = index;
    persistIndex(index);
    const meta = videoPlaylist[index];
    activateVideo(meta);
    applyNavTheme(meta);
  };

  const handleEnded = () => {
    if (!videoPlaylist.length || isTransitioning) return;
    isTransitioning = true;
    logHomeBg('handleEnded', { currentIndex, nextIndex: (currentIndex + 1) % videoPlaylist.length });
    goToIndex((currentIndex + 1) % videoPlaylist.length);
    setTimeout(() => { isTransitioning = false; }, 500);
  };

  const handleResize = () => {
    if (currentIndex === -1 || !videoPlaylist[currentIndex]) return;
    activateVideo(videoPlaylist[currentIndex]);
  };

  const handleVisibilityChange = () => {
    if (!videoEl) return;
    if (document.hidden) {
      videoEl.pause();
    } else if (!shouldKeepStatic()) {
      videoEl.play().catch(() => {});
    }
  };

  const init = () => {
    HomeBackgroundVideoManager.destroy();
    if (!ensureVideoElement()) return;

    // Bind toggle UI whenever Home is (re)rendered
    HomeBackgroundVideoManager.bindToggleUI();

    syncRootVideoStateAttr();

    if (shouldKeepStatic()) {
      clearVideoSources();
      // Static hero background is dark; keep navigation readable.
      applyNavTheme({ prefersLightNav: true });
      return;
    }

    const startIndex = nextIndex();
    if (startIndex === -1) return;
    goToIndex(startIndex);

    // Warm the next video as soon as we know what is currently active
    if (videoPlaylist.length > 1) {
      const upcoming = videoPlaylist[(startIndex + 1) % videoPlaylist.length];
      scheduleIdleTask(() => {
        prefetchSources(upcoming);
        warmVideoForMeta(upcoming);
      });
    }

    let lastLogTime = 0;
    const throttleLog = (msg, data) => {
      const now = Date.now();
      if (now - lastLogTime > 1000) { // Only log once per second
        logHomeBg(msg, data);
        lastLogTime = now;
      }
    };
    playHandler = () => throttleLog('playing', { currentIndex, src: videoEl?.currentSrc || videoEl?.src });
    pauseHandler = () => throttleLog('pause', { currentIndex, src: videoEl?.currentSrc || videoEl?.src });
    waitingHandler = () => throttleLog('waiting', { currentIndex, src: videoEl?.currentSrc || videoEl?.src });
    stalledHandler = () => throttleLog('stalled', { currentIndex, src: videoEl?.currentSrc || videoEl?.src });
    errorHandler = () => {
      const currentSrc = videoEl?.currentSrc || videoEl?.src;
      logHomeBg('error', { error: videoEl?.error, currentSrc, active: videoEl?.getAttribute('data-active-src') });
      if (!activeMeta || errorSwapAttempted) return;
      const mobileSrc = activeMeta.mobile || activeMeta.desktop;
      const desktopSrc = activeMeta.desktop;
      const matchesMobile = currentSrc && mobileSrc && currentSrc.includes(mobileSrc);
      const matchesDesktop = currentSrc && desktopSrc && currentSrc.includes(desktopSrc);
      const trySwap = (nextSrc, reason) => {
        if (!nextSrc || nextSrc === currentSrc) return;
        errorSwapAttempted = true;
        logHomeBg('error fallback swap', { reason, nextSrc });
        videoEl.src = nextSrc;
        videoEl.setAttribute('data-active-src', nextSrc);
        videoEl.load();
        attemptPlay('error-swap');
      };
      if (matchesMobile && desktopSrc) {
        trySwap(desktopSrc, 'mobile->desktop');
      } else if (matchesDesktop && mobileSrc && mobileSrc !== desktopSrc) {
        trySwap(mobileSrc, 'desktop->mobile');
      }
    };

    videoEl.addEventListener('ended', handleEnded);
    videoEl.addEventListener('playing', playHandler);
    videoEl.addEventListener('pause', pauseHandler);
    videoEl.addEventListener('waiting', waitingHandler);
    videoEl.addEventListener('stalled', stalledHandler);
    videoEl.addEventListener('error', errorHandler);
    
    // Universal fallback: some browsers (especially mobile) don't reliably fire 'ended'.
    // This persistent timeupdate listener ensures videos always transition.
    endFallbackHandler = function () {
      try {
        if (!videoEl || videoEl.paused || isTransitioning) return;
        const duration = videoEl.duration;
        if (!duration || !isFinite(duration)) return;
        
        const timeRemaining = duration - videoEl.currentTime;
        // Trigger transition when less than 1 second remains
        if (timeRemaining <= 1.0 && timeRemaining >= 0) {
          logHomeBg('fallback timeupdate', { currentTime: videoEl.currentTime, duration });
          handleEnded();
        }
      } catch (e) {
        console.warn('[HomeBackgroundVideo] endFallback error', e);
      }
    };
    videoEl.addEventListener('timeupdate', endFallbackHandler);

    if (!watchdogTimer) {
      lastProgressTime = Date.now();
      lastCurrentTime = 0;
      watchdogTimer = setInterval(() => {
        if (!videoEl || videoEl.paused || isTransitioning) return;
        const duration = videoEl.duration;
        const currentTime = videoEl.currentTime || 0;
        const now = Date.now();
        if (currentTime !== lastCurrentTime) {
          lastCurrentTime = currentTime;
          lastProgressTime = now;
        }

        if (duration && isFinite(duration)) {
          const remaining = duration - currentTime;
          if (remaining <= 1.0 && remaining >= 0) {
            logHomeBg('fallback watchdog near-end', { currentTime, duration });
            handleEnded();
          } else if (currentTime > 0.1 && now - lastProgressTime > 5000) {
            logHomeBg('fallback watchdog stalled', { currentTime, duration });
            handleEnded();
          }
        }
      }, 1000);
    }
    resizeHandler = debounce(() => {
      handleResize();
      // Ensure toggle UI state persists correctly across layout changes
      bindToggleUI(); 
    }, 300);
    window.addEventListener('resize', resizeHandler, { passive: true });
    visibilityHandler = handleVisibilityChange;
    document.addEventListener('visibilitychange', visibilityHandler, { passive: true });
  };

  const destroy = () => {
    if (videoEl) {
      clearVideoSources();
      videoEl.pause();
      videoEl.removeEventListener('ended', handleEnded);
      if (playHandler) videoEl.removeEventListener('playing', playHandler);
      if (pauseHandler) videoEl.removeEventListener('pause', pauseHandler);
      if (waitingHandler) videoEl.removeEventListener('waiting', waitingHandler);
      if (stalledHandler) videoEl.removeEventListener('stalled', stalledHandler);
      if (errorHandler) videoEl.removeEventListener('error', errorHandler);
      playHandler = null;
      pauseHandler = null;
      waitingHandler = null;
      stalledHandler = null;
      errorHandler = null;
      if (endFallbackHandler) {
        videoEl.removeEventListener('timeupdate', endFallbackHandler);
        endFallbackHandler = null;
      }
    }
    if (playRetryTimer) {
      clearTimeout(playRetryTimer);
      playRetryTimer = null;
    }
    if (watchdogTimer) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
    if (warmupVideo) {
      warmupVideo.removeAttribute('src');
      warmupVideo.load();
      warmupVideo.remove();
      warmupVideo = null;
    }
    currentIndex = -1;
    videoEl = null;
    applyNavTheme(null);
  };

  let toggleDelegationBound = false;
  const ensureToggleDelegation = () => {
    if (toggleDelegationBound) return;
    toggleDelegationBound = true;

    const handler = (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.id !== 'homeVideoToggleDesktop' && target.id !== 'homeVideoToggleMobile') return;
      if (target.disabled) return;
      console.warn('[HomeVideoToggle] Event:', e.type, 'id:', target.id, 'checked:', target.checked);
      setEnabled(!!target.checked);
    };

    document.addEventListener('change', handler, true);
    document.addEventListener('input', handler, true);
  };

  const bindToggleUI = () => {
    ensureToggleDelegation();
    const desktopToggle = document.getElementById('homeVideoToggleDesktop');
    const mobileToggle = document.getElementById('homeVideoToggleMobile');
    const toggles = [desktopToggle, mobileToggle].filter(Boolean);

    console.log('[HomeVideoToggle] bindToggleUI called');
    console.log('[HomeVideoToggle] Desktop toggle found:', !!desktopToggle);
    console.log('[HomeVideoToggle] Mobile toggle found:', !!mobileToggle);
    console.log('[HomeVideoToggle] Viewport width:', window.innerWidth);
    console.log('[HomeVideoToggle] isMobileViewport:', isMobileViewport());

    if (!toggles.length) {
      console.warn('[HomeVideoToggle] No toggle elements found!');
      return;
    }

    const enabled = getUserEnabled();
    const canPlay = canPlayVideosInThisContext();
    console.log('[HomeVideoToggle] User enabled:', enabled);
    console.log('[HomeVideoToggle] Can play videos:', canPlay);
    syncRootVideoStateAttr();

    toggles.forEach((toggle) => {
      toggle.checked = enabled;
      toggle.disabled = !canPlay;
    });
  };

  const setEnabled = (enabled) => {
    setUserEnabled(!!enabled);
    syncRootVideoStateAttr();
    if (enabled) {
      HomeBackgroundVideoManager.init();
    } else {
      HomeBackgroundVideoManager.destroy();
      // Static hero background is dark; keep navigation readable.
      applyNavTheme({ prefersLightNav: true });
    }

    // Keep both (desktop + mobile) toggles in sync.
    bindToggleUI();
  };

  const isEnabled = () => getUserEnabled();

  return { init, destroy, bindToggleUI, setEnabled, isEnabled };
})();

window.HomeBackgroundVideoManager = HomeBackgroundVideoManager;

const MeetOurExpertsBackgroundVideoManager = (() => {
  const STORAGE_KEY_ENABLED = 'moe_bg_video_enabled';
  let _enabled = false;

  const initEnabledState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ENABLED);
      if (raw === null) _enabled = true; // Default ON
      else _enabled = (raw === '1' || raw === 'true' || raw === 'on');
    } catch (e) {
      _enabled = true; // Default ON
    }
  };

  const getUserEnabled = () => _enabled;
  const setUserEnabled = (enabled) => {
    _enabled = !!enabled;
    try {
      localStorage.setItem(STORAGE_KEY_ENABLED, _enabled ? '1' : '0');
    } catch (e) {
      // ignore
    }
  };

  initEnabledState();

  const debounce = (fn, delay = 200) => {
    let timer;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  const isMobileViewport = () => window.matchMedia('(max-width: 767px)').matches;
  const getConnection = () => navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const canPlayVideosInThisContext = () => {
    const connection = getConnection();
    const slowNetwork = connection && (connection.saveData || /(slow-2g|2g)/i.test(connection.effectiveType || ''));
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !slowNetwork;
  };

  const shouldKeepStatic = () => {
    if (!getUserEnabled()) return true;
    return !canPlayVideosInThisContext();
  };

  const getVideoEl = () => document.querySelector('.video-bg-moe');
  const getChosenSrc = () => (isMobileViewport() ? 'public/bgVideos/moe_bg_mobile.mp4' : 'public/bgVideos/moe_bg.mp4');

  const syncRootVideoStateAttr = () => {
    if (!document?.documentElement) return;
    const shouldHide = shouldKeepStatic();
    const el = getVideoEl();

    if (shouldHide) {
      document.documentElement.setAttribute('data-moe-bg-video', 'off');
      if (el) {
        el.pause();
        el.style.display = 'none';
      }
    } else {
      document.documentElement.removeAttribute('data-moe-bg-video');
      if (el) {
        el.style.display = '';
      }
    }
  };

  const setVideoSource = (el) => {
    if (!el) return;
    const src = getChosenSrc();
    const current = el.getAttribute('data-active-src') || el.currentSrc || el.src;
    if (current && current.includes(src)) return;
    el.src = src;
    el.setAttribute('data-active-src', src);
    el.load();
  };

  const attemptPlay = (el) => {
    if (!el) return;
    const p = el.play();
    if (p?.catch) {
      p.catch(() => {
        el.muted = true;
        el.setAttribute('muted', '');
      });
    }
  };

  let resizeHandler = null;
  let visibilityHandler = null;

  // Use a global flag on document to ensure delegation is bound only once
  const ensureToggleDelegation = () => {
    if (document._moeToggleDelegationBound) return;
    document._moeToggleDelegationBound = true;

    const handler = (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.id !== 'moeVideoToggleDesktop' && target.id !== 'moeVideoToggleMobile') return;
      if (target.disabled) return;
      console.warn('[MOEVideoToggle] Event:', e.type, 'id:', target.id, 'checked:', target.checked);
      
      // Update state and UI directly
      const newState = !!target.checked;
      setUserEnabled(newState);
      syncRootVideoStateAttr();
      
      if (newState) {
        // Enable: start video
        const el = getVideoEl();
        if (el) {
          el.muted = true;
          el.playsInline = true;
          setVideoSource(el);
          attemptPlay(el);
        }
      } else {
        // Disable: pause video
        const el = getVideoEl();
        if (el) el.pause();
      }
      
      // Sync both toggles
      const otherToggle = document.getElementById(
        target.id === 'moeVideoToggleDesktop' ? 'moeVideoToggleMobile' : 'moeVideoToggleDesktop'
      );
      if (otherToggle) otherToggle.checked = newState;
    };

    document.addEventListener('change', handler, true);
    document.addEventListener('input', handler, true);
  };

  const bindToggleUI = () => {
    ensureToggleDelegation();
    const desktopToggle = document.getElementById('moeVideoToggleDesktop');
    const mobileToggle = document.getElementById('moeVideoToggleMobile');
    const toggles = [desktopToggle, mobileToggle].filter(Boolean);
    if (!toggles.length) return;

    const enabled = getUserEnabled();
    const canPlay = canPlayVideosInThisContext();
    syncRootVideoStateAttr();

    toggles.forEach((toggle) => {
      toggle.checked = enabled;
      toggle.disabled = !canPlay;
    });
  };

  const init = () => {
    MeetOurExpertsBackgroundVideoManager.destroy();
    bindToggleUI();
    syncRootVideoStateAttr();

    if (shouldKeepStatic()) return;
    const el = getVideoEl();
    if (!el) return;

    el.muted = true;
    el.playsInline = true;
    el.setAttribute('muted', '');
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');

    setVideoSource(el);
    attemptPlay(el);

    resizeHandler = debounce(() => {
      bindToggleUI();
      if (shouldKeepStatic()) {
        syncRootVideoStateAttr();
        return;
      }
      const currentEl = getVideoEl();
      setVideoSource(currentEl);
      attemptPlay(currentEl);
    }, 300);
    window.addEventListener('resize', resizeHandler, { passive: true });

    visibilityHandler = () => {
      const currentEl = getVideoEl();
      if (!currentEl) return;
      if (document.hidden) currentEl.pause();
      else if (!shouldKeepStatic()) attemptPlay(currentEl);
    };
    document.addEventListener('visibilitychange', visibilityHandler, { passive: true });
  };

  const destroy = () => {
    const el = getVideoEl();
    if (el) {
      el.pause();
    }
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
    syncRootVideoStateAttr();
  };

  const setEnabled = (enabled) => {
    setUserEnabled(!!enabled);
    syncRootVideoStateAttr();
    if (enabled) init();
    else destroy();
    bindToggleUI();
  };

  const isEnabled = () => getUserEnabled();

  return { init, destroy, bindToggleUI, setEnabled, isEnabled };
})();

window.MeetOurExpertsBackgroundVideoManager = MeetOurExpertsBackgroundVideoManager;

const AboutUsBackgroundVideoManager = (() => {
  const STORAGE_KEY_ENABLED = 'aboutUs_bg_video_enabled';
  let _enabled = true;

  const initEnabledState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ENABLED);
      if (raw === null) _enabled = true; // Default ON to match previous behavior
      else _enabled = (raw === '1' || raw === 'true' || raw === 'on');
    } catch (e) {
      _enabled = true;
    }
  };

  const getUserEnabled = () => _enabled;
  const setUserEnabled = (enabled) => {
    _enabled = !!enabled;
    try {
      localStorage.setItem(STORAGE_KEY_ENABLED, _enabled ? '1' : '0');
    } catch (e) {
      // ignore
    }
  };

  initEnabledState();

  const getConnection = () => navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const canPlayVideosInThisContext = () => {
    const connection = getConnection();
    const slowNetwork = connection && (connection.saveData || /(slow-2g|2g)/i.test(connection.effectiveType || ''));
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !slowNetwork;
  };

  const shouldKeepStatic = () => {
    if (!getUserEnabled()) return true;
    return !canPlayVideosInThisContext();
  };

  const getVideoEl = () => {
    const content = document.getElementById('content');
    return (
      content?.querySelector('.about-container video.video-bg') ||
      document.querySelector('.about-container video.video-bg')
    );
  };

  const isMobileViewport = () => window.matchMedia('(max-width: 767px)').matches;

  const getSources = (el) => {
    const fallback = {
      desktop: 'public/bgVideos/bg9.mp4',
      mobile: 'public/bgVideos/bg9-mobile.mp4'
    };
    if (!el) return fallback;

    const sources = Array.from(el.querySelectorAll('source'));
    const desktop = sources.find(s => s.getAttribute('media'))?.getAttribute('src') || fallback.desktop;
    const mobile = (sources.find(s => !s.getAttribute('media'))?.getAttribute('src')) || fallback.mobile;
    return { desktop, mobile };
  };

  const getChosenSrc = (el) => {
    const { desktop, mobile } = getSources(el);
    return isMobileViewport() ? (mobile || desktop) : (desktop || mobile);
  };

  const syncRootVideoStateAttr = () => {
    if (!document?.documentElement) return;
    const el = getVideoEl();
    const shouldHide = shouldKeepStatic();

    if (shouldHide) {
      document.documentElement.setAttribute('data-aboutus-bg-video', 'off');
      if (el) {
        el.pause();
        el.style.display = 'none';
      }
    } else {
      document.documentElement.removeAttribute('data-aboutus-bg-video');
      if (el) {
        el.style.display = '';
      }
    }
  };

  const setVideoSource = (el) => {
    if (!el) return;
    const src = getChosenSrc(el);
    const current = el.getAttribute('data-active-src') || el.currentSrc || el.src;
    if (current && src && current.includes(src)) return;
    el.preload = 'auto';
    el.src = src;
    el.setAttribute('data-active-src', src);
    el.load();
  };

  const attemptPlay = (el) => {
    if (!el) return;
    const p = el.play();
    if (p?.catch) {
      p.catch(() => {
        el.muted = true;
        el.setAttribute('muted', '');
      });
    }
  };

  let removeViewportListener = null;
  let visibilityHandler = null;

  const ensureToggleDelegation = () => {
    if (document._aboutUsToggleDelegationBound) return;
    document._aboutUsToggleDelegationBound = true;

    const handler = (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.id !== 'aboutUsVideoToggleDesktop' && target.id !== 'aboutUsVideoToggleMobile') return;
      if (target.disabled) return;

      const newState = !!target.checked;
      setUserEnabled(newState);
      syncRootVideoStateAttr();

      const el = getVideoEl();
      if (newState && el && !shouldKeepStatic()) {
        el.muted = true;
        el.playsInline = true;
        el.setAttribute('muted', '');
        el.setAttribute('playsinline', '');
        el.setAttribute('webkit-playsinline', '');
        setVideoSource(el);
        attemptPlay(el);
      } else if (el) {
        el.pause();
      }

      const otherToggle = document.getElementById(
        target.id === 'aboutUsVideoToggleDesktop' ? 'aboutUsVideoToggleMobile' : 'aboutUsVideoToggleDesktop'
      );
      if (otherToggle) otherToggle.checked = newState;
    };

    document.addEventListener('change', handler, true);
    document.addEventListener('input', handler, true);
  };

  const bindToggleUI = () => {
    ensureToggleDelegation();
    const desktopToggle = document.getElementById('aboutUsVideoToggleDesktop');
    const mobileToggle = document.getElementById('aboutUsVideoToggleMobile');
    const toggles = [desktopToggle, mobileToggle].filter(Boolean);
    if (!toggles.length) return;

    const enabled = getUserEnabled();
    const canPlay = canPlayVideosInThisContext();
    syncRootVideoStateAttr();

    toggles.forEach((toggle) => {
      toggle.checked = enabled;
      toggle.disabled = !canPlay;
    });
  };

  const init = () => {
    AboutUsBackgroundVideoManager.destroy();
    bindToggleUI();
    syncRootVideoStateAttr();

    if (shouldKeepStatic()) return;
    const el = getVideoEl();
    if (!el) return;

    el.muted = true;
    el.playsInline = true;
    el.setAttribute('muted', '');
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');

    setVideoSource(el);
    attemptPlay(el);

    const mql = window.matchMedia('(max-width: 767px)');
    const onViewportChange = () => {
      bindToggleUI();
      if (shouldKeepStatic()) {
        syncRootVideoStateAttr();
        return;
      }
      const currentEl = getVideoEl();
      setVideoSource(currentEl);
      attemptPlay(currentEl);
    };

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onViewportChange);
      removeViewportListener = () => mql.removeEventListener('change', onViewportChange);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(onViewportChange);
      removeViewportListener = () => mql.removeListener(onViewportChange);
    } else {
      let raf = 0;
      const onResize = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          onViewportChange();
        });
      };
      window.addEventListener('resize', onResize, { passive: true });
      removeViewportListener = () => window.removeEventListener('resize', onResize);
    }

    visibilityHandler = () => {
      const currentEl = getVideoEl();
      if (!currentEl) return;
      if (document.hidden) currentEl.pause();
      else if (!shouldKeepStatic()) attemptPlay(currentEl);
    };
    document.addEventListener('visibilitychange', visibilityHandler, { passive: true });
  };

  const destroy = () => {
    const el = getVideoEl();
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.removeAttribute('data-active-src');
      try { el.load(); } catch (e) {}
    }
    if (removeViewportListener) {
      removeViewportListener();
      removeViewportListener = null;
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
    syncRootVideoStateAttr();
  };

  const setEnabled = (enabled) => {
    setUserEnabled(!!enabled);
    syncRootVideoStateAttr();
    if (enabled) init();
    else destroy();
    bindToggleUI();
  };

  const isEnabled = () => getUserEnabled();

  return { init, destroy, bindToggleUI, setEnabled, isEnabled };
})();

window.AboutUsBackgroundVideoManager = AboutUsBackgroundVideoManager;

window.loadPage = (page) => {
  const content = document.getElementById('content');
  const landing = document.getElementById('landing-page');
  const progressBar = document.querySelector('.progress-bar');
  const progressText = document.getElementById('progress-text');
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  if (!window.__spaNavState) {
    window.__spaNavState = { seq: 0, controller: null, fetching: false };
  }
  const navState = window.__spaNavState;
  navState.seq += 1;
  const navSeq = navState.seq;
  if (navState.fetching && navState.controller) {
    try { navState.controller.abort(); } catch (e) {}
  }
  navState.controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  navState.fetching = true;

  const getNavToggleEls = () => {
    const homeVideoToggleContainers = [
      document.getElementById('homeVideoToggleContainerDesktop'),
      document.getElementById('homeVideoToggleContainerMobile')
    ].filter(Boolean);
    const moeVideoToggleContainers = [
      document.getElementById('moeVideoToggleContainerDesktop'),
      document.getElementById('moeVideoToggleContainerMobile')
    ].filter(Boolean);
    const aboutUsVideoToggleContainers = [
      document.getElementById('aboutUsVideoToggleContainerDesktop'),
      document.getElementById('aboutUsVideoToggleContainerMobile')
    ].filter(Boolean);
    const contactLink = document.getElementById('contactLink');
    return { homeVideoToggleContainers, moeVideoToggleContainers, aboutUsVideoToggleContainers, contactLink };
  };

  const showContainers = (containers, show) => {
    containers.forEach((container) => {
      container.hidden = !show;
      if (show) container.style.removeProperty('display');
      else container.style.setProperty('display', 'none', 'important');
    });
  };

  const hideAllNavVideoToggles = () => {
    const { homeVideoToggleContainers, moeVideoToggleContainers, aboutUsVideoToggleContainers, contactLink } = getNavToggleEls();
    showContainers(homeVideoToggleContainers, false);
    showContainers(moeVideoToggleContainers, false);
    showContainers(aboutUsVideoToggleContainers, false);
    if (contactLink) contactLink.style.setProperty('display', 'none', 'important');
  };

  const updateNavVideoToggleVisibility = () => {
    const { homeVideoToggleContainers, moeVideoToggleContainers, aboutUsVideoToggleContainers, contactLink } = getNavToggleEls();

    if (page === 'Home') {
      showContainers(homeVideoToggleContainers, true);
      showContainers(moeVideoToggleContainers, false);
      showContainers(aboutUsVideoToggleContainers, false);
      if (contactLink) contactLink.style.removeProperty('display');
    } else if (page === 'meetOurExperts') {
      showContainers(homeVideoToggleContainers, false);
      showContainers(moeVideoToggleContainers, true);
      showContainers(aboutUsVideoToggleContainers, false);
      if (contactLink) contactLink.style.setProperty('display', 'none', 'important');
    } else if (page === 'aboutUs') {
      showContainers(homeVideoToggleContainers, false);
      showContainers(moeVideoToggleContainers, false);
      showContainers(aboutUsVideoToggleContainers, true);
      if (contactLink) contactLink.style.setProperty('display', 'none', 'important');
    } else {
      showContainers(homeVideoToggleContainers, false);
      showContainers(moeVideoToggleContainers, false);
      showContainers(aboutUsVideoToggleContainers, false);
      if (contactLink) contactLink.style.setProperty('display', 'none', 'important');
    }
  };

  // Hide all per-page toggles while loading so they don't flash.
  hideAllNavVideoToggles();

  window.HomeBackgroundVideoManager?.destroy();
  window.MeetOurExpertsBackgroundVideoManager?.destroy();
  window.AboutUsBackgroundVideoManager?.destroy();
  if (typeof destroyHomeMobileObserver === 'function') {
    destroyHomeMobileObserver();
  }

  if (progressBar) {
    progressBar.style.strokeDasharray = `${circumference}`;
  }

  const setProgress = (percent) => {
    if (!progressBar || !progressText) return;
    const offset = circumference - (percent / 100) * circumference;
    progressBar.style.strokeDashoffset = offset;
    progressText.textContent = `${Math.round(percent)}%`;
  };

  if (landing) {
    landing.style.display = 'grid';
    landing.style.opacity = 1;
    landing.style.pointerEvents = 'All';
  }

  // Show quick progress animation
  setProgress(30);

  const pageToFetch = page === 'meetOurExperts' ? 'meetourexperts' : page;
  // Capture the controller/signal used for THIS navigation.
  // navState.controller can be replaced by a newer navigation before this one settles.
  const controller = navState.controller;
  const signal = controller ? controller.signal : undefined;
  const fetchOptions = signal ? { signal } : undefined;

  const markFetchDoneIfCurrent = () => {
    try {
      if (window.__spaNavState?.seq === navSeq && window.__spaNavState?.controller === controller) {
        window.__spaNavState.fetching = false;
      }
    } catch (e) {
      // ignore
    }
  };

  fetch(`/src/pages/${pageToFetch}.html`, fetchOptions)
    .then((response) => response.text())
    .then((data) => {
      markFetchDoneIfCurrent();
      if (navSeq !== window.__spaNavState?.seq) return;
      if (content) content.innerHTML = data;
      setProgress(100);

      setTimeout(() => {
        if (navSeq !== window.__spaNavState?.seq) return;
        if (landing) {
          landing.style.opacity = 0;
          landing.style.pointerEvents = 'none';
        }

        setTimeout(() => {
          if (navSeq !== window.__spaNavState?.seq) return;
          if (landing) landing.style.display = 'none';

          requestAnimationFrame(() => {
            if (navSeq !== window.__spaNavState?.seq) return;

            // Retrigger menu animation may clone/replace nav nodes.
            // Apply toggle visibility AFTER it runs so we target the live nodes only once.
            retriggerMenuAnimations();
            updateNavVideoToggleVisibility();
            updateCalendarSvgTime();
            initAudioVisualizer();
            updateMusicBarColor(page);
            updateHamburgerIcon(page);
            if (window.ICUEFooter && typeof window.ICUEFooter.autoInject === 'function') {
              window.ICUEFooter.autoInject();
            }
            calendarModal();
            CommunityGallery.init();
            isTruelyTouchDevice();
            initializeChatbot();

            if (typeof setupLanguageSwitcher === 'function') {
              setupLanguageSwitcher();
              console.log('[LoadPage] Language switcher updated for page:', page);
            }

            switch (page) {
              case 'meetOurExperts':
                attachProfileEvents_moe();
                MeetOurExpertsBackgroundVideoManager.bindToggleUI();
                MeetOurExpertsBackgroundVideoManager.init();
                break;
              case 'coreTeam':
                attachProfileEvents_coreTeam();
                break;
              case 'Home':
                initHomeMobileObserver();
                attachHomeButtonEvents();
                initHomeMobileCardObserver();
                HomeBackgroundVideoManager.bindToggleUI();
                HomeBackgroundVideoManager.init();
                break;
              case 'News':
                initLogoSlider();
                initMobileNewsSlider();
                break;
              case 'aboutUs':
                initHomeTextSlider();
                AboutUsBackgroundVideoManager.bindToggleUI();
                AboutUsBackgroundVideoManager.init();
                break;
              case 'Contact':
                initPostMethod();
                break;
              case 'ourWork':
                initializeCarousel();
                break;
              case 'pastProjects':
                initMobileProjectsSlider();
                handleAOSByScreenSize();
                break;
              case 'orgStructure':
                break;
              case 'FAQs':
                initFrequentlyAskedQuestions();
                break;
              case 'recruitment':
                JobBoard.init();
                break;
              case 'donations':
                DonationForm.init();
                break;
              case 'notableAwards':
                AwardsPage.init();
                break;
              case 'communityActivities':
                CommunityPage.init();
                break;
              case 'privacy':
                break;
              case 'terms':
                break;
              case 'gdpr':
                break;
              case 'cookies':
                break;
            }

            // Mark route initialization complete to avoid duplicate init from
            // `initializePageFunctions()` (hashchange/pageshow safety nets).
            window.__pageInitState = {
              page,
              time: Date.now()
            };
          });
        }, 100);
      }, 200);
    })
    .catch((err) => {
      markFetchDoneIfCurrent();
      // Ignore expected aborts (usually due to fast navigation).
      if (signal?.aborted || err?.name === 'AbortError') return;
      console.error('[loadPage] Failed to fetch page:', pageToFetch, err);
      setProgress(100);
      try {
        if (landing) {
          landing.style.opacity = 0;
          landing.style.pointerEvents = 'none';
          setTimeout(() => {
            if (navSeq !== window.__spaNavState?.seq) return;
            landing.style.display = 'none';
          }, 200);
        }
      } catch (e) {
        // ignore
      }
    });
};

window.retriggerMenuAnimations = (isFirstLoad = true) => {
  if (typeof window.gsap === 'undefined') {
    const selectors = [
      '.menu-toggle', '.logo-banner', '.flag-link', '.contact-link', '.contact-sidebar',
      '#langSwitcher', '#contactLink', '#menuIcon'
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.classList.remove('pre-hidden');
        el.style.opacity = '';
        el.style.visibility = '';
      });
    });
    return;
  }

  const animatedSelectors = [
    { selector: '.menu-toggle', delay: 0 },
    // Avoid cloning/replacing `.logo-banner` because it contains per-page video toggles.
    // Animating only the logo link prevents toggle “double render”/flash.
    { selector: '#logo-link', delay: -0.3 },
    { selector: '.flag-link', delay: -0.3 },
    // Contact link is handled explicitly below (hover handlers + clone), so don't double-animate it here.
    { selector: '.contact-sidebar', delay: 1.25 },
  ];

  const timeline = gsap.timeline({ defaults: { duration: 0.5, ease: 'power2.out' } });

  // Utility: set hidden state before animation
  const preHide = (el) => {
    el.classList.add('pre-hidden');
    el.style.opacity = '0';
    el.style.visibility = 'hidden';
  };

  // Utility: unhide on animation start
  const unhide = (el) => {
    el.classList.remove('pre-hidden');
    el.style.opacity = '';
    el.style.visibility = '';
  };

  // Animate standard menu elements
  animatedSelectors.forEach(({ selector, delay }) => {
    const el = document.querySelector(selector);
    if (!el) return;

    const newEl = el.cloneNode(true);
    preHide(newEl);
    el.parentNode.replaceChild(newEl, el);

    timeline.fromTo(
      newEl,
      isFirstLoad ? { y: -50, opacity: 0 } : { opacity: 0 },
      {
        y: 0,
        opacity: 1,
        onStart: () => unhide(newEl)
      },
      delay
    );
  });
  

  // 🔁 Language Switcher
const langSwitcher = document.getElementById('langSwitcher');
if (langSwitcher) {
  const newLangSwitcher = langSwitcher.cloneNode(true);
  preHide(newLangSwitcher);
  langSwitcher.parentNode.replaceChild(newLangSwitcher, langSwitcher);

  timeline.fromTo(
    newLangSwitcher,
    isFirstLoad ? { y: -50, opacity: 0 } : { opacity: 0 },
    {
      y: 0,
      opacity: 1,
      onStart: () => unhide(newLangSwitcher)
    },
    '-=0.3'
  );

  // ✅ Hover animation
  newLangSwitcher.addEventListener('mouseenter', () => {
    gsap.killTweensOf(newLangSwitcher);
    gsap.to(newLangSwitcher, {
      scale: 1.25,
      duration: 0.3,
      ease: 'power2.out'
    });
  });

  newLangSwitcher.addEventListener('mouseleave', () => {
    gsap.to(newLangSwitcher, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.inOut'
    });
  });
}

  // 🔁 CONTACT LINK
  const contactUs = document.getElementById('contactLink');
  if (contactUs) {
    const newContact = contactUs.cloneNode(true);
    preHide(newContact);
    contactUs.parentNode.replaceChild(newContact, contactUs);

    timeline.fromTo(
      newContact,
      isFirstLoad ? { y: -50, opacity: 0 } : { opacity: 0 },
      {
        y: 0,
        opacity: 1,
        onStart: () => unhide(newContact)
      },
      1
    );
    
    // ✅ Attach hover animation directly to the new clone
  newContact.addEventListener('mouseenter', () => {
    gsap.killTweensOf(newContact);
    gsap.to(newContact, {
      scale: 1.25,
        duration: .05,
        ease: 'power2.out'
      });
    });

  newContact.addEventListener('mouseleave', () => {
    gsap.to(newContact, {
      scale: 1,
        duration: .05,
        ease: 'power2.inOut'
      });
    });
}

// 🍔 MENU ICON
const menuToggle = document.getElementById('menuIcon');
  if (menuToggle) {
    const newToggle = menuToggle.cloneNode(true);
    preHide(newToggle);
    menuToggle.parentNode.replaceChild(newToggle, menuToggle);

    timeline.fromTo(
      newToggle,
      isFirstLoad ? { y: -60, opacity: 0 } : { scale: 0.5, opacity: 0 },
      {
        y: 0,
        scale: 1,
        opacity: 1,
        onStart: () => unhide(newToggle)
      },
      '-=0.4'
    );
    
    newToggle.addEventListener('mouseenter', () => {
      gsap.to(newToggle, {
        scale: 1.25,
        duration: .05,
        ease: 'power2.out'
      });
    });

    newToggle.addEventListener('mouseleave', () => {
      gsap.to(newToggle, {
        scale: 1,
        duration: .05,
        ease: 'power2.inOut'
      });
    });
  }
};


window.attachHomeButtonEvents = () => {
  document.querySelectorAll('.home-button').forEach(button => {
    button.addEventListener('click', () => {
      console.log('Button clicked:', button.textContent);
      
    });
  });
}

window.initHomeTextSlider = () => {

  const sliderContainer = document.querySelector("#homeTextSlider");
  const dotsContainer = document.querySelector("#sliderDots");
  let isAnimating = false;
  let typingSessionId = 0;
  let isTyping = false;
  
  if (window.homeSliderIntervalId) {
    clearInterval(window.homeSliderIntervalId);
  }
  
  if (dotsContainer) {
    const newDotsContainer = dotsContainer.cloneNode(true);
    dotsContainer.parentNode.replaceChild(newDotsContainer, dotsContainer);
  }

  const messages = [
    `Viện Nghiên cứu Kinh tế Xây dựng và Đô thị (sau đây gọi tắt là viện) <strong class="highlight-text-phrase"> được thành lập theo Quyết định số 29/QĐ/THXDVN ngày 16/4/2013 của Đoàn Chủ tịch Tổng hội Xây dựng Việt Nam</strong>`,
    `Hơn 10 năm kinh nghiệm, <strong class="highlight-text-phrase">hơn 20 cán bộ, chuyên viên trẻ, xuất sắc và nhiều chuyên gia đầu nghành </strong>trong lĩnh vực quy hoạch, phát triển đô thị, kinh tế đô thị - chúng tôi đã thiết kế những thành phố thông minh - xanh thân thiện môi trường - cân bằng giữa chức năng - khả năng phục hồi và nhu cầu cộng đồng <svg version="1.1" id="_x36_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" style="vertical-align: middle; transform: translateY(-2.5px);" width="20px" height="20px" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <g> <path style="fill:#605E51;" d="M234.573,462.789v39.779c0,5.194-52.492,9.432-117.286,9.432 c-46.546,0-86.666-2.188-105.667-5.331c0,0,0,0-0.068,0C4.169,505.37,0,504.004,0,502.568v-39.779 c0-2.256,9.979-4.375,26.588-6.016c21.462-2.118,54.132-3.486,90.699-3.486c36.566,0,69.237,1.367,90.698,3.486 C224.594,458.414,234.573,460.533,234.573,462.789z"></path> <path style="fill:#4F4F3C;" d="M234.573,462.789c0,5.195-52.492,9.431-117.286,9.431C52.492,472.221,0,467.984,0,462.789 c0-2.256,9.979-4.375,26.588-6.016c21.462-2.118,54.132-3.486,90.699-3.486c36.566,0,69.237,1.367,90.698,3.486 C224.594,458.414,234.573,460.533,234.573,462.789z"></path> </g> <g> <path style="fill:#60604C;" d="M207.985,432.374v24.537c0,5.194-40.599,9.433-90.698,9.433c-50.1,0-90.699-4.238-90.699-9.433 v-24.537c0-3.417,17.156-6.425,42.923-8.066c7.792-0.478,16.404-0.888,25.563-1.161h0.82c6.835-0.205,14.011-0.274,21.393-0.274 c7.381,0,14.558,0.068,21.393,0.274h0.821c9.158,0.274,17.77,0.683,25.562,1.161 C190.829,425.948,207.985,428.956,207.985,432.374z"></path> <path style="fill:#727257;" d="M207.985,432.374c0,5.195-40.599,9.432-90.698,9.432c-50.1,0-90.699-4.238-90.699-9.432 c0-3.417,17.156-6.425,42.923-8.066c7.792-0.478,16.404-0.888,25.563-1.161h0.82c6.835-0.205,14.011-0.274,21.393-0.274 c7.381,0,14.558,0.068,21.393,0.274h0.821c9.158,0.274,17.77,0.683,25.562,1.161 C190.829,425.948,207.985,428.956,207.985,432.374z"></path> </g> <path style="opacity:0.9;fill:#FFFFFF;" d="M215.298,338.736c0,36.772-20.299,68.758-50.236,85.572 c-14.148,7.861-30.415,12.371-47.776,12.371c-17.361,0-33.628-4.51-47.776-12.371c-29.937-16.814-50.236-48.8-50.236-85.572 c0-45.726,31.304-84.138,73.612-95.005V222.27c-42.308-10.799-73.612-49.212-73.612-94.936c0-19.001,5.399-36.703,14.763-51.672 c4.238-6.902,9.296-13.191,15.105-18.727c6.766-6.63,14.422-12.165,22.897-16.608c13.533-7.04,28.912-11.004,45.247-11.004 c16.335,0,31.714,3.964,45.247,11.004c8.475,4.443,16.13,9.979,22.897,16.608c5.809,5.537,10.868,11.825,15.105,18.727 c9.364,14.969,14.763,32.671,14.763,51.672c0,45.725-31.304,84.138-73.612,94.936v21.462 C183.994,254.599,215.298,293.011,215.298,338.736z"></path> <path style="fill:#C0736B;" d="M191.685,164.525c-0.165,0.759-0.499,1.508-0.991,2.24l-0.903,1.143l-0.653,0.824l-28.585,36.119 c-12.326,8.408-27.223,13.319-43.266,13.319c-16.043,0-30.938-4.912-43.264-13.317L45.43,168.728l-0.648-0.82l-0.903-1.143 l-0.991-2.24c0.129-0.434,0.355-0.86,0.68-1.283c5.296-6.94,36.286-12.262,73.719-12.262c37.431,0,68.417,5.323,73.717,12.26 C191.329,163.663,191.557,164.092,191.685,164.525z"></path> <path style="fill:#C0736B;" d="M191.81,163.401c0,0.377-0.041,0.752-0.124,1.125c-0.165,0.759-0.499,1.508-0.992,2.24 c-0.257,0.386-0.558,0.766-0.903,1.143c-7.8,8.552-37.302,14.914-72.504,14.914s-64.704-6.362-72.504-14.914 c-0.346-0.377-0.646-0.757-0.903-1.143c-0.492-0.732-0.826-1.482-0.991-2.24c-0.083-0.373-0.124-0.747-0.124-1.125 c0-10.727,33.366-19.421,74.523-19.421S191.81,152.674,191.81,163.401z"></path> <path style="opacity:0.1;fill:#040000;" d="M191.81,163.401c0,0.377-0.041,0.752-0.124,1.125c-0.165,0.759-0.499,1.508-0.992,2.24 c-0.257,0.386-0.558,0.766-0.903,1.143c-7.8,8.552-37.302,14.914-72.504,14.914s-64.704-6.362-72.504-14.914 c-0.346-0.377-0.646-0.757-0.903-1.143c-0.492-0.732-0.826-1.482-0.991-2.24c-0.083-0.373-0.124-0.747-0.124-1.125 c0-10.727,33.366-19.421,74.523-19.421S191.81,152.674,191.81,163.401z"></path> <rect x="112.77" y="200.948" style="fill:#C0736B;" width="9.033" height="154.466"></rect> <g> <path style="fill:#60604C;" d="M207.985,32.124v39.778c0,1.368-2.666,2.666-7.45,3.759c-13.943,3.417-45.93,5.742-83.249,5.742 c-37.318,0-69.306-2.325-83.249-5.742c-4.784-1.093-7.45-2.391-7.45-3.759V32.124c0-5.195,40.599-9.433,90.699-9.433 C167.386,22.691,207.985,26.93,207.985,32.124z"></path> <ellipse style="fill:#697257;" cx="117.287" cy="32.125" rx="90.732" ry="9.466"></ellipse> </g> <path style="fill:#C0736B;" d="M174.957,380.168l-28.752-31.073c-12.852-13.89-44.983-13.89-57.835,0l-28.752,31.073 c-4.075,4.404-4.898,16.391-4.898,17.833c0,14.782,28.013,26.765,62.568,26.765c34.555,0,62.568-11.983,62.568-26.765 C179.855,396.558,179.032,384.572,174.957,380.168z"></path> <path style="opacity:0.07;fill:#040000;" d="M179.854,398.154c0,14.78-28.012,26.765-62.568,26.765 c-34.556,0-62.568-11.985-62.568-26.765c0-0.908,0.325-5.989,1.583-10.729c6.375,11.888,31.259,20.756,60.985,20.756 c29.726,0,54.61-8.868,60.985-20.756C179.529,392.165,179.854,397.246,179.854,398.154z"></path> <g> <path style="fill:#4F4F3C;" d="M234.573,9.432v39.779c0,2.324-9.979,4.374-26.588,6.014c-6.561,0.684-14.08,1.231-22.555,1.709 c-19.206,1.095-42.718,1.777-68.143,1.777c-25.426,0-48.938-0.682-68.144-1.777c-8.475-0.478-15.994-1.025-22.555-1.709 C9.979,53.585,0,51.535,0,49.211V9.432C0,4.238,52.492,0,117.286,0c45.589,0,85.094,2.119,104.505,5.126 C229.993,6.425,234.573,7.86,234.573,9.432z"></path> <path style="fill:#676352;" d="M234.573,9.432c0,1.025-1.914,1.982-5.536,2.939c-15.105,3.827-59.395,6.561-111.75,6.561 C52.492,18.933,0,14.695,0,9.432C0,4.238,52.492,0,117.286,0c45.589,0,85.094,2.119,104.505,5.126 C229.993,6.425,234.573,7.86,234.573,9.432z"></path> </g> </g> <path style="opacity:0.07;fill:#040000;" d="M207.985,71.903V55.225c16.609-1.64,26.588-3.69,26.588-6.014V9.432 c0-1.572-4.579-3.007-12.781-4.306C202.38,2.119,162.875,0,117.286,0v512c64.794,0,117.286-4.238,117.286-9.432v-39.779 c0-2.256-9.979-4.375-26.588-6.016v-24.4c0-3.417-17.156-6.425-42.923-8.066c29.937-16.814,50.236-48.8,50.236-85.572 c0-45.726-31.304-84.138-73.612-95.005V222.27c42.308-10.799,73.612-49.212,73.612-94.936c0-19.001-5.399-36.703-14.763-51.672 C205.319,74.569,207.985,73.27,207.985,71.903z"></path> </g> </g></svg> `,
    `Nghiên cứu khoa học, nghiên cứu ứng dụng và phát triển công nghệ trong lĩnh vực xây dựng, tư vấn, lập quy hoạch phát triển đô thị, kinh tế đô thị, kinh tế xây dựng và bảo vệ môi trường. <strong class="highlight-text-phrase"></strong>`,
    `Chuyển giao công nghệ khoa học, chuyển đổi xanh. Thực hiện các dịch vụ thông tin, tổ chức hội nghị, hội thảo trong nước và quốc tế. Hợp tác và liên kết với các tổ chức trong nước và quốc tế về các lĩnh vực quy hoạch, phát triển đô thị và bảo vệ môi trường <strong class="highlight-text-phrase"> hiệu quả </strong>, khả năng kết nối — xây dựng các thành phố <strong class="highlight-text-phrase"> sẵn sàng cho tương lai </strong>. <svg style="transform: translateY(2.5px)" width="20px" height="20px" viewBox="0 0 1024 1024" class="icon"  version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M512 512m-512 0a512 512 0 1 0 1024 0 512 512 0 1 0-1024 0Z" fill="#8DD9FF" /><path d="M112 412.94h44.954V504H112z" fill="#FFFFFF" /><path d="M910.666 445.5H966V520h-55.334z" fill="#B2B9C9" /><path d="M928 592h89.738A515.586 515.586 0 0 0 1024 512c0-8.048-0.238-16.042-0.606-24H928v104z" fill="#9FC3DD" /><path d="M0.198 506.204C0.17 508.146 0 510.05 0 512c0 27.22 2.17 53.928 6.262 80H98v-85.796H0.198z" fill="#B39191" /><path d="M144 592h96l-16-176-80 32v144" fill="#B2B9C9" /><path d="M617.5 432h93v160h-93z" fill="#7FAAB8" /><path d="M224 352h64v240h-64zM576 384h64v208h-64z" fill="#EEE1C2" /><path d="M432 344.004h64V592h-64z" fill="#9FC3DD" /><path d="M734 448h93v144H734z" fill="#B2B9C9" /><path d="M835 472H928v120h-93z" fill="#B39191" /><path d="M6.262 592C44.674 836.764 256.45 1024 512 1024s467.324-187.236 505.738-432H6.262z" fill="#43AB5F" /><path d="M945.754 784c36.036-57.354 61.05-122.334 71.984-192H6.262c10.934 69.666 35.95 134.646 71.984 192h867.508z" fill="#71BE63" /><path d="M31.23 688h961.54c11.266-30.74 19.762-62.816 24.968-96H6.262c5.208 33.184 13.702 65.26 24.968 96z" fill="#94D75B" /><path d="M12.498 624h999.006c2.374-10.56 4.54-21.198 6.234-32H6.262c1.696 10.802 3.862 21.44 6.236 32z" fill="#B0EB81" /><path d="M748.078 966.312L512 592 275.924 966.31C346.574 1003.106 426.828 1024 512 1024s165.428-20.892 236.078-57.688z" fill="#674447" /><path d="M572.546 688L512 592l-60.546 96h121.092z" fill="#8C665B" /><path d="M576 592V296l-80-48v344" fill="#FDEFDB" /><path d="M352 192v400h80V136zM688 260h64v332h-64z" fill="#FFFFFF" /><path d="M288 592v-80H192v80" fill="#A29B91" /><path d="M380 592v-192h-92v192" fill="#9FC3DD" /><path d="M640 592v-64l-96 16v48" fill="#88B7C6" /><path d="M800 432h64v160h-64z" fill="#FDEFDB" /><path d="M512 592l211.658 386.198a509.48 509.48 0 0 0 24.42-11.886L512 592zM512 592L275.924 966.31a508.52 508.52 0 0 0 24.418 11.888L512 592z" fill="#FFFFFF" /><path d="M556.364 1021.864L512 592l14.846 431.546c9.914-0.284 19.754-0.838 29.518-1.682zM512 592l-44.364 429.864c9.764 0.842 19.604 1.398 29.518 1.682L512 592z" fill="#E9B668" /><path d="M80 480h64v112H80z" fill="#9FC3DD" /><path d="M659 548.5H766V592h-107z" fill="#A29B91" /><path d="M432 437h35.636V592H432z" fill="#B39191" /><path d="M240 560h91.334v32H240z" fill="#9E8282" /><path d="M164.666 560h42.812v32H164.666zM449.938 560h35.396v32h-35.396zM752 560h57v32H752z" fill="#EEE1C2" /><path d="M572.546 568.792h44.954V592h-44.954zM787.046 540H832v52h-44.954zM905.524 552.666h93.81V592h-93.81zM57.524 540h44.954v52H57.524z" fill="#9E8282" /><path d="M360 540h33.962v52H360zM693.52 568.792h33.962V592H693.52zM46.038 568.792H80V592H46.038zM196.704 576h65.266v16H196.704z" fill="#B2B9C9" /></svg>`,
    `Lãnh đạo sáng kiến ​​quy hoạch toàn thành phố Đà Nẵng cho thành phố loại 1 và loại 2 — một dự án chuyển đổi phản ánh sự tận tâm của chúng tôi đối với <strong class="highlight-text-phrase"> chiến lược toàn cảnh </strong> và <strong class="highlight-text-phrase"> kết quả thực tế. </strong> <svg version="1.1" id="_x34_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" style="vertical-align: middle; transform: translateY(-2.5px);" width="22px" height="22px" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <linearGradient id="SVGID_1_" gradientUnits="userSpaceOnUse" x1="199.2906" y1="512" x2="199.2906" y2="3.519835e-007"> <stop offset="0.0739" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#F7D983"></stop> </linearGradient> <path style="fill:url(#SVGID_1_);" d="M392.653,20.344c-0.593-1.037-1.259-2.074-1.926-3.037c-1.555-2.296-3.259-4.443-5.258-6.369 c-0.963-0.963-1.926-1.851-2.962-2.74c-1.851-1.555-3.851-2.888-5.925-3.925c-3.703-2.073-7.702-3.48-11.923-4.147 c-3.184-0.518-6.22,0.593-8.517,2.74c-3.332,1.555-5.924,4.888-6.443,9.109c-0.889,6.443,3.185,12.441,9.035,13.404 c3.629,0.593,6.961,2.37,9.553,4.962c0.889,0.889,1.704,1.926,2.444,2.962c2.888,4.295,4.073,9.553,3.407,14.885 c-0.518,3.925-1.778,7.627-3.629,10.812c-0.889,1.555-1.925,3.036-3.11,4.369c-1.185,1.333-2.444,2.592-3.851,3.629 c-4.591,2.666-9.997,3.851-15.552,2.962c-2-0.37-3.925-0.814-5.776-1.481c-1.778-0.667-3.481-1.407-5.036-2.37 c0.148-1.259,0.296-2.592,0.518-3.925c0.297-2.37,0.593-4.739,0.815-6.961c0-0.074,0-0.074,0-0.074 c1.111-9.035,1.999-17.033,2.518-23.772c1.111-13.404,0.963-21.847-1.555-23.624c-5.776-3.999-27.993,2.962-37.176,12.219h-0.074 c-0.112,0.149-0.215,0.27-0.335,0.41c-0.012,0.012-0.023,0.023-0.035,0.035c-0.074,0.148-0.222,0.296-0.297,0.37 c-0.518,0.518-0.963,1.036-1.333,1.555c-0.222,0.371-0.444,0.667-0.666,0.963c0,0.074,0,0.074,0,0.074 c-0.074,0.148-0.074,0.148-0.148,0.222c0,0-0.074,0.074-0.074,0.148c-0.518-0.592-0.963-1.185-1.481-1.703l-1.407-1.481 c-0.007-0.008-0.017-0.013-0.024-0.02l-0.001-0.007l-0.002,0.004c-4.141-4.209-8.944-7.535-14.191-9.827 c-5.258-2.296-11.034-3.554-17.107-3.554c-12.886,0-24.512,5.777-32.881,15.181c-0.296-0.296-0.518-0.592-0.74-0.815h-0.074 c-8.368-8.887-19.625-14.367-32.14-14.367c-0.518,0-1.111,0-1.629,0.074c-12.145,0.444-23.105,5.998-31.104,14.811 c0,0.014,0.001,0.03,0.002,0.044c-0.066,0.082-0.141,0.156-0.207,0.227c-8.39-9.37-20.039-15.181-32.937-15.181 c-10.933,0-20.987,4.183-28.904,11.176h-0.011l-4.149,2.479l-2.175,1.304l-2.194-1.902l-5.998-5.11 C79.323,8.495,63.771,4.496,59.105,7.754c-4.073,2.888-1.925,23.401,1.777,54.431c0.222,1.333,0.371,2.666,0.518,3.925 c0.002,0.011,0.003,0.02,0.005,0.031c-1.599,0.91-3.278,1.683-5.014,2.302c-1.872,0.687-3.802,1.183-5.79,1.513 c-5.559,0.903-10.979-0.254-15.614-2.95c-0.024-0.015-0.044-0.037-0.068-0.052c-0.015-0.01-0.031,0-0.031-0.031 c-5.406-4.221-9.331-10.886-10.442-18.736c-0.666-5.332,0.518-10.59,3.407-14.885c2.888-4.37,7.183-7.11,11.997-7.924 c5.85-0.963,9.923-6.961,9.035-13.404c-0.518-4.221-3.036-7.554-6.369-9.109c-0.024-0.011-0.052-0.012-0.076-0.023 c-2.283-2.133-5.346-3.216-8.516-2.698C23.431,1.85,14.174,7.939,7.841,17.309c-6.322,9.357-8.956,20.876-7.408,32.42 C2.317,63.778,9.205,75.678,18.82,83.573c0.028,0.023,0.058,0.043,0.087,0.065c8.648,17.015,21.128,31.31,36.118,41.62 c0.259,0.191,0.487,0.426,0.748,0.615c0.371,0.296,0.667,0.518,1.037,0.666c4.295,3.111,8.813,5.777,13.478,8.072 c3.555,1.777,7.257,3.333,11.034,4.591c0.741,1.407,1.259,2.962,1.63,4.666c1.111,4.887,0.444,9.923-1.925,14.145 c-3.184,5.924-9.775,8.22-15.404,5.702c-3.48-2.888-4.443-8.368-2.073-12.664c1.481-2.74,0.666-6.22-1.704-7.998h-0.074 c-0.518-0.297-1.036-0.518-1.555-0.593c-0.296-0.518-0.741-0.889-1.259-1.259c-2.518-1.704-5.777-0.815-7.258,1.925 c-2.147,3.999-3.036,8.442-2.74,12.812c0.444,6.665,3.703,12.96,9.331,16.737c0.37,0.222,0.74,0.444,1.111,0.592 c0.518,0.518,1.111,0.963,1.703,1.333c3.777,2.444,7.85,3.629,11.923,3.629c7.85,0,15.478-4.37,19.847-12.294 c2.962-5.332,4.221-11.404,3.851-17.477l0.074,0.074c20.217,22.217,45.026,32.658,65.169,37.546v0.592v23.846v10.96v18.514 l-6.369,3.481l-8.294,3.851l-0.592,0.074l0.222,0.814l-0.222,0.889h0.592l8.294,23.254l6.369,3.555 c0,15.329-1.851,27.326-5.184,37.102c-5.776,0.148-10.368,4.888-10.368,10.59v2.296c-2.518,0.148-4.814,1.036-6.665,2.518h-15.478 l-38.657,50.062v98.05c-4.295,1.851-7.924,3.851-10.516,5.999c-6.295,0-11.405,5.628-11.405,12.59V512h7.332h256.529h7.331v-16.884 c0-6.739-4.813-12.294-10.886-12.59h-0.444h-0.074c-2.584-2.141-6.203-4.135-10.48-6.055V378.5h-0.036v-0.023l-38.657-50.062 h-15.33c-0.074-0.074-0.148-0.074-0.222-0.148c0,0-0.074-0.074-0.148-0.074c-0.074-0.148-0.148-0.148-0.296-0.222 c-0.667-0.444-1.407-0.814-2.148-1.185h-0.074c-0.667-0.297-1.333-0.518-2.074-0.667c-0.222-0.074-0.444-0.148-0.666-0.148 c-0.371-0.074-0.815-0.148-1.185-0.148v-2.222c0-0.74-0.074-1.481-0.222-2.147c-0.074-0.518-0.222-1.037-0.444-1.481 c0-0.074,0-0.148-0.074-0.222c-0.074-0.222-0.148-0.444-0.297-0.667c-0.222-0.518-0.518-0.963-0.814-1.407 c-0.296-0.444-0.593-0.815-0.963-1.185c-0.222-0.296-0.444-0.518-0.74-0.741c-0.296-0.296-0.667-0.592-1.037-0.815 c-0.592-0.444-1.185-0.74-1.777-1.037c-1.259-0.592-2.592-0.889-3.999-0.889c-0.222-0.666-0.445-1.407-0.667-2.073 c-0.593-1.851-1.111-3.777-1.555-5.851c-0.296-1.259-0.592-2.592-0.815-3.925c-0.222-1.185-0.444-2.444-0.593-3.703 c-0.148-0.667-0.222-1.333-0.296-2.074c-0.148-1.11-0.296-2.296-0.444-3.48c-0.222-2.37-0.444-4.888-0.592-7.48 c-0.074-1.259-0.148-2.592-0.148-3.925c-0.074-1.333-0.074-2.74-0.074-4.147v-0.444l5.702-3.185l0.667-0.37l8.368-23.254h0.518 l-0.222-0.889l0.222-0.814l-0.518-0.074l-5.406-2.518l-2.962-1.333l-6.369-3.481v-18.514v-10.96v-23.92v-0.518 c6.295-1.555,13.034-3.629,19.995-6.443c1.407-0.518,2.74-1.111,4.147-1.778c1.185-0.518,2.443-1.036,3.629-1.629 c0.222-0.074,0.37-0.222,0.592-0.296c1.407-0.667,2.814-1.407,4.221-2.148c0.518-0.296,1.111-0.593,1.63-0.889 c2.147-1.185,4.295-2.444,6.443-3.777c0.074-0.148,0.222-0.222,0.296-0.222c5.628-3.555,11.108-7.702,16.441-12.59 c1.333-1.185,2.592-2.444,3.925-3.777c1.333-1.259,2.592-2.592,3.851-3.999c-0.37,6.073,0.963,12.071,3.925,17.403 c4.295,7.924,11.997,12.294,19.847,12.294c4.073,0,8.146-1.185,11.923-3.629c0.444-0.37,0.889-0.666,1.259-0.963l0.074-0.074 c0.002-0.002,0.004-0.002,0.004-0.002c0.013-0.008,0.025-0.01,0.036-0.016c0.268-0.159,0.536-0.33,0.805-0.497 c0.206-0.131,0.412-0.262,0.636-0.374c1.623-1.087,2.976-2.454,4.198-3.929c5.712-6.854,6.99-17.249,2.405-25.611 c-0.129-0.235-0.332-0.374-0.485-0.581c-0.821-1.128-1.925-1.853-3.17-2.076c-1.2-0.221-2.467-0.058-3.591,0.687 c-0.508,0.331-0.936,0.75-1.283,1.22l-0.001,0.003c-0.518,0.148-1.035,0.369-1.553,0.665c-2.444,1.703-3.259,5.258-1.777,7.998 c2.295,4.145,1.482,9.4-1.699,12.51c-0.006,0.003-0.012,0.007-0.018,0.01c-0.725,0.378-1.484,0.626-2.251,0.802 c-0.262,0.064-0.527,0.073-0.79,0.118c-0.611,0.092-1.224,0.184-1.826,0.184c-0.583,0.006-1.167,0.001-1.742-0.081 c-0.745-0.109-1.487-0.288-2.215-0.54c-0.2-0.07-0.387-0.184-0.584-0.265c-0.549-0.225-1.097-0.459-1.615-0.78 c-0.084-0.05-0.159-0.118-0.243-0.171c-0.713-0.438-1.411-1.028-2.078-1.663c-0.197-0.192-0.391-0.386-0.578-0.593 c-0.575-0.66-1.129-1.397-1.614-2.19c-0.071-0.122-0.163-0.22-0.231-0.345c-1.173-2.141-1.933-4.471-2.264-6.871 c-0.32-2.4-0.21-4.873,0.344-7.309c0.024-0.131,0.076-0.252,0.104-0.382c0.329-1.359,0.79-2.655,1.374-3.869 c0.055-0.11,0.094-0.232,0.151-0.341c8.42-2.928,16.4-7.096,23.736-12.199c0.095-0.061,0.199-0.104,0.293-0.164l0.004-0.004 c0.008,0,0.036,0,0.036,0c1.851-1.185,3.629-2.443,5.406-3.776c0.106-0.079,0.205-0.169,0.311-0.248 c0.823-0.616,1.607-1.287,2.413-1.927c1.107-0.881,2.233-1.738,3.308-2.666c0.402-0.347,0.778-0.727,1.176-1.08 c1.415-1.257,2.828-2.514,4.196-3.855c1.436-1.436,2.828-2.935,4.205-4.455c5.81-6.408,10.913-13.574,15.225-21.331 c0.747-1.327,1.522-2.642,2.194-3.984c9.628-7.924,16.515-19.847,18.366-33.844C399.54,39.45,397.614,29.082,392.653,20.344z M75.256,122.497c-4.917-2.207-9.591-4.903-14.049-7.963c-7.416-5.501-14.027-12.065-19.727-19.616 c2.666,0.592,5.406,0.814,8.22,0.814c2.222,0,4.517-0.148,6.813-0.518c2.592-0.444,5.036-1.037,7.48-1.777 c0.963-0.297,1.926-0.667,2.814-1.037c3.036,10.886,6.887,20.588,11.404,29.178C77.132,121.506,76.128,121.801,75.256,122.497z M101.687,53.15v-0.074c0.009-0.029,0.011-0.062,0.02-0.091c0.004,0.029,0.007,0.058,0.011,0.087 c0.121,0.921,0.25,1.828,0.378,2.736C101.965,54.932,101.841,54.071,101.687,53.15z M103.243,63.296 c-0.048-0.313-0.096-0.625-0.144-0.938c0.053,0.315,0.099,0.634,0.156,0.949c0.014,0.078,0.028,0.158,0.041,0.237 C103.278,63.462,103.26,63.385,103.243,63.296z M103.835,66.776c-0.071-0.392-0.125-0.784-0.178-1.176 c0.069,0.382,0.139,0.768,0.211,1.153c0.011,0.067,0.025,0.135,0.039,0.202C103.889,66.902,103.871,66.848,103.835,66.776z M103.983,67.517v-0.165c0.008,0.047,0.015,0.094,0.024,0.137c0.07,0.394,0.149,0.784,0.226,1.174 C104.155,68.287,104.083,67.916,103.983,67.517z M104.353,69.369c0,0,0-0.049,0-0.08c0.007,0.037,0.015,0.076,0.023,0.109 c0.052,0.282,0.112,0.566,0.169,0.851C104.487,69.952,104.429,69.674,104.353,69.369z M106.649,79.884 c-0.222-1.037-0.445-2.073-0.741-3.11c-0.166-0.775-0.332-1.585-0.498-2.381c0.173,0.786,0.344,1.574,0.526,2.352 c0.243,1.055,0.485,2.085,0.74,3.115c0.19,0.771,0.385,1.527,0.579,2.283C107.056,81.393,106.869,80.656,106.649,79.884z M110.722,94.177c-0.297-0.74-0.518-1.481-0.741-2.222c0-0.148,0-0.222-0.074-0.37c0-0.074-0.074-0.148-0.074-0.222 c-0.222-0.814-0.518-1.629-0.741-2.518c-0.043-0.14-0.076-0.28-0.118-0.42c0.043,0.148,0.085,0.302,0.128,0.449 c0.231,0.827,0.485,1.64,0.728,2.454c0.023,0.089,0.057,0.165,0.081,0.254c0.034,0.127,0.069,0.242,0.104,0.356 c0.419,1.365,0.864,2.682,1.308,4.003C111.123,95.352,110.923,94.779,110.722,94.177z M113.758,102.916 c-0.284-0.781-0.568-1.562-0.852-2.343c0.292,0.79,0.574,1.571,0.877,2.35c0.094,0.255,0.197,0.507,0.293,0.761 C113.97,103.422,113.864,103.181,113.758,102.916z M114.795,105.582c0-0.056-0.015-0.073-0.028-0.112 c0.011,0.028,0.022,0.057,0.033,0.085c0,0.022,0.012,0.036,0.02,0.052C114.817,105.604,114.795,105.582,114.795,105.582z M117.98,113.135c-0.74-1.555-1.407-3.258-2.147-4.887c0-0.074,0-0.148-0.074-0.222c-0.143-0.357-0.286-0.76-0.429-1.144 c0.155,0.388,0.308,0.783,0.465,1.165c0.023,0.051,0.046,0.114,0.069,0.165c0.693,1.691,1.398,3.344,2.138,4.959 c0.06,0.136,0.123,0.267,0.184,0.402C118.116,113.427,118.052,113.281,117.98,113.135z M124.496,126.169 c0-0.074,0-0.148-0.074-0.148c-0.444-0.889-0.963-1.703-1.407-2.592c-0.518-0.963-0.963-1.851-1.481-2.814 c-0.37-0.814-0.74-1.555-1.185-2.37c-0.201-0.443-0.403-0.886-0.604-1.329c0.207,0.433,0.409,0.872,0.626,1.301 c0.393,0.814,0.786,1.602,1.191,2.39c0.474,0.953,0.971,1.894,1.468,2.822c0.451,0.865,0.924,1.716,1.387,2.556 c0.046,0.063,0.081,0.14,0.116,0.203c0.097,0.178,0.201,0.352,0.301,0.529C124.725,126.535,124.619,126.352,124.496,126.169z M129.162,134.019c-0.806-1.277-1.556-2.565-2.351-3.896c0.785,1.311,1.571,2.616,2.378,3.872c0,0.012,0.01,0.013,0.022,0.024 H129.162z M137.604,145.942c-0.26-0.39-0.542-0.757-0.823-1.126c0.284,0.368,0.564,0.739,0.855,1.105 c0.433,0.562,0.878,1.122,1.332,1.673C138.538,147.086,138.107,146.517,137.604,145.942z M142.344,151.645 c-0.518-0.667-1.111-1.333-1.629-1.926c-0.288-0.36-0.558-0.674-0.828-1.008c0.267,0.324,0.534,0.648,0.8,0.972 c0.555,0.661,1.121,1.323,1.687,1.971c0.299,0.346,0.61,0.673,0.912,1.013C142.974,152.318,142.665,152.006,142.344,151.645z M148.787,158.606c-0.272-0.311-0.544-0.602-0.816-0.894c0.285,0.29,0.567,0.583,0.853,0.871c0.274,0.272,0.549,0.55,0.824,0.825 C149.361,159.126,149.074,158.835,148.787,158.606z M151.231,160.976l-0.761-0.761c0.26,0.254,0.521,0.509,0.782,0.759 c0.783,0.752,1.586,1.463,2.382,2.189C152.838,162.441,152.046,161.748,151.231,160.976z M167.893,174.676 c-0.299-0.219-0.598-0.473-0.898-0.693c0.336,0.24,0.675,0.456,1.012,0.693H167.893z M183.482,174.676 c-1.761-6.883-3.397-14.368-4.934-22.282c1.544,7.949,3.204,15.379,4.971,22.282H183.482z M334.741,116.394 c-0.074,0.074-0.074,0.074-0.148,0.074c-0.232,0.15-0.478,0.273-0.711,0.421c-3.201,1.988-6.512,3.785-9.932,5.349 c-0.158,0.071-0.307,0.158-0.466,0.228c-0.265-0.163-0.55-0.258-0.826-0.382c-0.205-0.099-0.4-0.216-0.615-0.284 c-0.106-0.033-0.218-0.033-0.325-0.06c-0.41-0.101-0.824-0.16-1.247-0.15c-0.033,0.001-0.064-0.014-0.097-0.012 c2.222-4.295,4.295-8.887,6.22-13.7c1.926-4.888,3.629-9.998,5.184-15.478c0.222,0.148,0.518,0.222,0.741,0.296 c0.666,0.222,1.333,0.444,2.073,0.741c2.37,0.74,4.887,1.333,7.406,1.777c2.37,0.37,4.666,0.518,6.887,0.518 c2.814,0,5.554-0.222,8.22-0.814C350.737,103.36,343.183,110.618,334.741,116.394z"></path> <g> <g> <path style="fill:#3A3A3A;" d="M327.557,489.117V512H71.028v-22.883c0-2.296,1.481-4.444,4.073-6.591 c2.592-2.147,6.22-4.147,10.516-5.999c17.774-7.85,46.063-13.182,50.136-13.182h127.154c3.999,0,32.288,5.258,50.062,13.108 c4.295,1.926,7.924,3.925,10.516,6.073h0.074C326.076,484.673,327.557,486.821,327.557,489.117z"></path> <g> <rect x="85.617" y="378.478" style="fill:#383430;" width="227.351" height="110.491"></rect> <rect x="196.736" y="378.5" style="fill:#2A2B2B;" width="116.268" height="110.487"></rect> </g> <polygon style="fill:#363636;" points="312.969,378.478 85.617,378.478 124.274,328.416 274.311,328.416 "></polygon> <linearGradient id="SVGID_2_" gradientUnits="userSpaceOnUse" x1="199.2929" y1="248.6575" x2="199.2929" y2="174.6758"> <stop offset="0" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#D3AD53"></stop> </linearGradient> <path style="fill:url(#SVGID_2_);" d="M236.617,174.676v73.982c-12.071-0.37-24.587-0.444-37.25-0.444h-4.073 c-11.479,0-22.513,0.074-33.325,0.444v-73.982H236.617z"></path> <linearGradient id="SVGID_3_" gradientUnits="userSpaceOnUse" x1="199.2929" y1="352.1137" x2="199.2929" y2="220.2203"> <stop offset="0.1478" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#DEB863"></stop> </linearGradient> <path style="fill:url(#SVGID_3_);" d="M263.87,345.597v2.74c-20.291,2.444-42.064,3.777-64.503,3.777h-4.073 c-21.18-0.148-41.545-1.407-60.578-3.777v-2.74c4.295-3.925,8.294-8.072,11.701-12.738c1.185-1.407,2.148-2.888,3.036-4.443 c0.667-0.815,1.185-1.703,1.703-2.592c2.148-3.851,4.073-8.072,5.628-12.812c3.333-9.775,5.184-21.772,5.184-37.102v-54.431 c10.812-0.74,21.847-1.185,33.325-1.185c1.333-0.074,2.592-0.074,3.999-0.074h0.074c12.441,0,24.809,0.444,36.658,1.259h0.592 v54.876c0,1.407,0,2.814,0.074,4.147c0,1.333,0.074,2.666,0.148,3.925c0.148,2.592,0.37,5.11,0.592,7.48 c0.148,1.185,0.296,2.37,0.444,3.48c0.074,0.741,0.148,1.407,0.296,2.074c0.148,1.259,0.371,2.518,0.593,3.703 c0.222,1.333,0.518,2.666,0.815,3.925c0.444,2.074,0.963,3.999,1.555,5.851c0.222,0.666,0.444,1.407,0.667,2.073 c1.555,4.74,3.48,8.961,5.628,12.812c0.518,0.889,1.037,1.777,1.704,2.592c0.814,1.555,1.851,3.036,3.036,4.443 C255.575,337.525,259.5,341.672,263.87,345.597z"></path> <path style="opacity:0.1;fill:#333130;" d="M236.606,240.353v44.54c-11.096,2.338-22.503,3.647-34.132,3.841 c-1.057,0.019-2.114,0.029-3.181,0.029c-12.735,0-25.209-1.319-37.313-3.86v-44.54c12.105,2.541,24.578,3.86,37.313,3.86 c1.067,0,2.124-0.01,3.181-0.029C214.104,244,225.51,242.69,236.606,240.353z"></path> <linearGradient id="SVGID_4_" gradientUnits="userSpaceOnUse" x1="146.7133" y1="257.9518" x2="251.8726" y2="257.9518"> <stop offset="0.4631" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#D3AD53"></stop> </linearGradient> <polygon style="fill:url(#SVGID_4_);" points="251.65,248.213 251.873,249.102 251.28,249.102 242.986,272.355 242.319,272.726 236.617,275.91 235.802,276.355 229.582,279.687 212.993,281.391 185.593,281.391 169.004,279.687 161.969,275.91 155.6,272.355 147.306,249.102 146.713,249.102 146.935,248.213 146.713,247.399 147.306,247.325 155.6,243.474 161.969,239.993 169.004,236.142 185.593,234.513 212.993,234.513 229.582,236.142 236.617,239.993 242.986,243.474 245.948,244.807 251.354,247.325 251.873,247.399 "></polygon> <linearGradient id="SVGID_5_" gradientUnits="userSpaceOnUse" x1="146.4172" y1="325.8982" x2="252.1687" y2="325.8982"> <stop offset="0.4631" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#D3AD53"></stop> </linearGradient> <path style="fill:url(#SVGID_5_);" d="M252.169,323.602v15.256H146.417v-15.256c0-5.702,4.591-10.442,10.368-10.59 c0.148-0.074,0.222-0.074,0.37-0.074h84.572l0.074,0.074c1.407,0,2.74,0.297,3.999,0.889c0.592,0.297,1.185,0.593,1.777,1.037 c0.37,0.222,0.74,0.518,1.037,0.815c0.296,0.222,0.519,0.444,0.74,0.741c0.37,0.37,0.667,0.74,0.963,1.185 c0.296,0.444,0.592,0.889,0.814,1.407c0.148,0.222,0.222,0.444,0.297,0.667c0.074,0.074,0.074,0.148,0.074,0.222 c0.222,0.444,0.37,0.963,0.444,1.481C252.094,322.121,252.169,322.862,252.169,323.602z"></path> <linearGradient id="SVGID_6_" gradientUnits="userSpaceOnUse" x1="134.7163" y1="340.524" x2="263.8696" y2="340.524"> <stop offset="0.4631" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#D3AD53"></stop> </linearGradient> <path style="fill:url(#SVGID_6_);" d="M263.87,338.34v16.884H134.716V338.34c0-4.074,2-7.702,5.036-9.924 c1.851-1.481,4.147-2.37,6.665-2.518c0.296-0.074,0.592-0.074,0.889-0.074H251.28c0.296,0,0.593,0,0.889,0.074 c0.444,0,0.814,0,1.185,0.074c0.222,0,0.444,0.074,0.666,0.148c0.741,0.148,1.407,0.37,2.074,0.667h0.074 c0.741,0.37,1.481,0.74,2.148,1.185c0.148,0.074,0.222,0.074,0.296,0.222c0.074,0.074,0.148,0.074,0.222,0.222 c0.444,0.296,0.963,0.667,1.333,1.111c0.519,0.518,1.037,1.036,1.333,1.629c0.222,0.297,0.518,0.667,0.667,1.037 c0.222,0.296,0.37,0.593,0.518,0.889c0.148,0.296,0.297,0.667,0.444,0.963c0.148,0.37,0.222,0.74,0.297,1.111 c0.148,0.296,0.222,0.666,0.222,0.962C263.796,336.858,263.87,337.599,263.87,338.34z"></path> <path style="fill:#2A2B2B;" d="M334.889,495.116V512H63.696v-16.884c0-6.961,5.11-12.59,11.405-12.59h248.901 C330.076,482.822,334.889,488.376,334.889,495.116z"></path> <path style="opacity:0.1;fill:#333130;" d="M215.659,189.635c-1.037,0.148-1.926,0.222-2.888,0.296 c-0.444,0.074-0.889,0.148-1.259,0.148c-0.74,0.074-1.407,0.074-2.074,0.074c-0.666,0-1.259,0-1.851,0.074 c-2.443,0.074-4.369,0.074-5.776,0.074c-1.63,0-2.518-0.074-2.518-0.074s-1.111,0.074-3.184,0.074c-1.851,0-4.443,0-7.628-0.222 c-0.667,0-1.407-0.074-2.074-0.074c-1.999-0.148-4.221-0.296-6.591-0.518c-5.258-0.592-11.256-1.481-17.847-2.814v23.846 c9.627,2.073,17.996,3.036,24.438,3.406c3.925,0.297,7.035,0.297,9.257,0.297c2.37,0,3.629-0.074,3.629-0.074 s0.963,0.074,2.814,0.074c2.074,0,5.332,0,9.405-0.222c6.443-0.444,15.181-1.333,25.105-3.48v-23.92 C228.619,188.302,221.509,189.191,215.659,189.635z"></path> <g> <g> <g> <linearGradient id="SVGID_7_" gradientUnits="userSpaceOnUse" x1="60.8491" y1="178.2308" x2="60.8491" y2="1.9079"> <stop offset="0.0739" style="stop-color:#958559"></stop> <stop offset="1" style="stop-color:#9F8E5C"></stop> </linearGradient> <path style="fill:url(#SVGID_7_);" d="M118.868,138.315c0,3.555-2.592,6.369-5.776,6.369c-5.777,0-11.479-0.518-17.033-1.481 c0.371,1.777,0.593,3.481,0.667,5.258c0.37,6.073-0.889,12.145-3.851,17.477c-4.369,7.924-11.997,12.294-19.847,12.294 c-4.073,0-8.146-1.185-11.923-3.629c-0.593-0.37-1.185-0.814-1.703-1.333c-5.777-4.813-8.591-12.737-7.48-20.291 c0.37-2.74,1.185-5.406,2.592-7.924c1.185-2.222,3.555-3.184,5.702-2.592c0.519,0.074,1.037,0.296,1.555,0.593h0.074 c2.37,1.777,3.184,5.258,1.704,7.998c-2.37,4.295-1.407,9.775,2.073,12.664c0.297,0.444,0.593,0.666,0.963,0.889 c5.924,3.999,13.7,1.851,17.255-4.666c2.37-4.295,3.036-9.331,1.926-14.145c-0.444-2.074-1.259-4.073-2.296-5.776 c-0.741-0.222-1.481-0.444-2.148-0.815c-3.777-1.259-7.48-2.814-11.034-4.591c-4.666-2.296-9.183-4.962-13.478-8.072 c-0.37-0.148-0.666-0.37-1.037-0.666c-13.996-10.146-25.697-23.92-33.917-39.99c0-0.074-0.074-0.074-0.074-0.074 c0-0.148-0.074-0.222-0.148-0.37c-1.185-0.963-2.296-1.926-3.333-2.963C10.45,74.701,4.896,63.962,3.267,51.669 c-1.037-7.776-0.222-15.552,2.37-22.661v-0.074c0.889-2.444,1.999-4.74,3.258-6.961c0.592-0.963,1.185-1.851,1.777-2.74 C16.967,9.828,26.224,3.755,36.741,2.052c2.073-0.37,3.999,0,5.776,0.815c3.333,1.555,5.85,4.888,6.369,9.109 c0.889,6.443-3.184,12.441-9.035,13.404c-4.814,0.815-9.109,3.555-11.997,7.924c-2.888,4.295-4.073,9.553-3.407,14.885 c1.111,7.85,5.036,14.515,10.442,18.736c0,0.074,0.074,0.074,0.074,0.074s0.074,0,0.074,0.074 c5.11,3.999,11.627,5.85,18.366,4.813c1.999-0.37,3.925-0.814,5.776-1.555c0.889-0.297,1.777-0.667,2.666-1.037 c5.628-2.592,10.59-6.813,14.293-12.367c5.481-8.146,7.776-18.218,6.443-28.215c-0.667-4.666,1.259-8.961,4.517-11.479 c0.074-0.074,0.222-0.148,0.296-0.222h0.074l5.702,4.887l2.444,2.148l4.814-2.888v-0.074l1.555-0.889 c0.889,1.481,1.555,3.184,1.777,5.036c0.444,3.037,0.592,6.147,0.592,9.183c0,6.369-0.889,12.664-2.666,18.662v0.074 c-0.592,1.999-1.259,3.925-1.999,5.776c-1.63,4.221-3.777,8.294-6.369,12.071C86.506,80.995,77.323,88.401,66.807,92.4 c-0.889,0.37-1.851,0.74-2.814,1.037c-2.444,0.74-4.888,1.333-7.48,1.777c-2.296,0.37-4.591,0.518-6.813,0.518 c-2.814,0-5.554-0.222-8.22-0.814c5.925,7.85,12.812,14.663,20.588,20.291c1.259,0.889,2.518,1.703,3.851,2.518 c2.814,1.925,5.776,3.629,8.886,5.11c1.037,0.592,2.074,1.037,3.184,1.555c0.222-0.148,0.444-0.296,0.667-0.37 c0.222-0.148,0.444-0.222,0.667-0.371c0.666-0.148,1.407-0.222,2.073-0.148c0.518,0,0.963,0.222,1.481,0.444 c0,0.074,0.074,0.074,0.148,0.148c0.148,0,0.37,0.074,0.518,0.222c1.111,0.667,2.074,1.481,3.037,2.37 c0.592,0.519,1.11,1.037,1.629,1.555c7.924,2.444,16.292,3.777,24.883,3.777c0.518,0,1.036,0.074,1.555,0.296 C117.091,132.982,118.868,135.426,118.868,138.315z"></path> <g> <g> <g> <linearGradient id="SVGID_8_" gradientUnits="userSpaceOnUse" x1="60.8468" y1="142.7997" x2="60.8468" y2="21.2985"> <stop offset="0" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#D3AD53"></stop> </linearGradient> <path style="fill:url(#SVGID_8_);" d="M110.291,142.8C52.577,142.8,5.624,91.146,5.624,27.655 c0-3.511,2.587-6.357,5.778-6.357c3.192,0,5.778,2.846,5.778,6.357c0,56.48,41.77,102.431,93.111,102.431 c3.192,0,5.779,2.846,5.779,6.357C116.07,139.953,113.483,142.8,110.291,142.8z"></path> </g> <g> <linearGradient id="SVGID_9_" gradientUnits="userSpaceOnUse" x1="60.8468" y1="142.7997" x2="60.8468" y2="21.2985"> <stop offset="0.0739" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#F7D983"></stop> </linearGradient> <path style="fill:url(#SVGID_9_);" d="M110.291,142.8C52.577,142.8,5.624,91.146,5.624,27.655 c0-3.511,2.587-6.357,5.778-6.357c3.192,0,5.778,2.846,5.778,6.357c0,56.48,41.77,102.431,93.111,102.431 c3.192,0,5.779,2.846,5.779,6.357C116.07,139.953,113.483,142.8,110.291,142.8z"></path> </g> </g> <g> <g> <linearGradient id="SVGID_10_" gradientUnits="userSpaceOnUse" x1="50.7891" y1="93.8457" x2="50.7891" y2="0.0174"> <stop offset="0" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#D3AD53"></stop> </linearGradient> <path style="fill:url(#SVGID_10_);" d="M100.597,43.906c-0.774,4.501-2.022,8.887-3.698,13.095v0.013 c-1.687,4.234-3.814,8.264-6.379,12.065c-6.333,9.383-14.781,16.451-24.443,20.583c-1.595,0.699-3.224,1.31-4.877,1.831 c-2.427,0.788-4.923,1.386-7.466,1.793c-2.311,0.369-4.611,0.56-6.876,0.56c-2.774,0-5.513-0.267-8.182-0.788 c-6.056-1.195-11.776-3.687-16.862-7.234c-1.028-0.699-2.023-1.462-2.993-2.25C9.205,75.678,2.317,63.778,0.433,49.729 c-1.549-11.544,1.086-23.063,7.408-32.42c6.333-9.37,15.59-15.46,26.084-17.163c3.19-0.521,6.276,0.572,8.564,2.733 c1.884,1.78,3.213,4.285,3.606,7.209c0.855,6.446-3.19,12.434-9.049,13.387c-4.819,0.776-9.084,3.585-11.996,7.895 c-2.901,4.31-4.114,9.599-3.409,14.913c1.236,9.192,6.402,16.693,13.348,20.723c4.634,2.695,10.055,3.852,15.613,2.949 c1.988-0.33,3.918-0.826,5.79-1.513c1.745-0.623,3.432-1.399,5.039-2.314c4.634-2.619,8.679-6.395,11.88-11.124 c5.501-8.15,7.789-18.168,6.449-28.224c-0.635-4.755,1.399-9.256,4.854-11.658h0.012l2.496,2.136l5.686,4.844l0.335-0.203 l2.82-1.678l2.207,1.882l2.184-1.309c0.035,0.102,0.07,0.216,0.104,0.318c0.231,0.712,0.404,1.449,0.508,2.225 C101.903,30.277,101.752,37.219,100.597,43.906z"></path> </g> <g> <linearGradient id="SVGID_11_" gradientUnits="userSpaceOnUse" x1="50.7891" y1="93.8457" x2="50.7891" y2="0.0173"> <stop offset="0.0739" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#F7D983"></stop> </linearGradient> <path style="fill:url(#SVGID_11_);" d="M100.597,43.906c-0.774,4.501-2.022,8.887-3.698,13.095v0.013 c-1.687,4.234-3.814,8.264-6.379,12.065c-6.333,9.383-14.781,16.451-24.443,20.583c-1.595,0.699-3.224,1.31-4.877,1.831 c-2.427,0.788-4.923,1.386-7.466,1.793c-2.311,0.369-4.611,0.56-6.876,0.56c-2.774,0-5.513-0.267-8.182-0.788 c-6.056-1.195-11.776-3.687-16.862-7.234c-1.028-0.699-2.023-1.462-2.993-2.25C9.205,75.678,2.317,63.778,0.433,49.729 c-1.549-11.544,1.086-23.063,7.408-32.42c6.333-9.37,15.59-15.46,26.084-17.163c3.19-0.521,6.276,0.572,8.564,2.733 c1.884,1.78,3.213,4.285,3.606,7.209c0.855,6.446-3.19,12.434-9.049,13.387c-4.819,0.776-9.084,3.585-11.996,7.895 c-2.901,4.31-4.114,9.599-3.409,14.913c1.236,9.192,6.402,16.693,13.348,20.723c4.634,2.695,10.055,3.852,15.613,2.949 c1.988-0.33,3.918-0.826,5.79-1.513c1.745-0.623,3.432-1.399,5.039-2.314c4.634-2.619,8.679-6.395,11.88-11.124 c5.501-8.15,7.789-18.168,6.449-28.224c-0.635-4.755,1.399-9.256,4.854-11.658h0.012l2.496,2.136l5.686,4.844l0.335-0.203 l2.82-1.678l2.207,1.882l2.184-1.309c0.035,0.102,0.07,0.216,0.104,0.318c0.231,0.712,0.404,1.449,0.508,2.225 C101.903,30.277,101.752,37.219,100.597,43.906z"></path> </g> </g> <g> <g> <linearGradient id="SVGID_12_" gradientUnits="userSpaceOnUse" x1="71.4546" y1="176.3053" x2="71.4546" y2="121.5669"> <stop offset="0" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#D3AD53"></stop> </linearGradient> <path style="fill:url(#SVGID_12_);" d="M90.06,164.086c-4.369,7.85-11.997,12.219-19.847,12.219 c-3.703,0-7.332-0.963-10.812-3.036c-0.371-0.148-0.741-0.37-1.111-0.592c-5.628-3.777-8.887-10.072-9.331-16.737 c-0.296-4.369,0.593-8.813,2.74-12.812c1.481-2.74,4.74-3.629,7.258-1.925c0.518,0.37,0.962,0.74,1.259,1.259 c0.37,0.444,0.666,0.889,0.815,1.407c0.667,1.629,0.593,3.629-0.296,5.258c-2.592,4.666-1.185,10.812,3.036,13.627 c0.592,0.37,1.185,0.74,1.851,0.963c5.628,2.518,12.219,0.222,15.404-5.702c2.37-4.221,3.036-9.257,1.925-14.145 c-0.37-1.704-0.889-3.258-1.63-4.666c-0.148-0.37-0.37-0.741-0.592-1.037v-0.074c-1.407-2.37-3.185-4.295-5.48-5.776 c-0.518-0.37-1.036-0.814-1.333-1.333c-1.407-1.851-1.629-4.444-0.444-6.591c0.37-0.667,0.815-1.185,1.333-1.555 c0.074-0.222,0.222-0.296,0.371-0.296c0.889-0.741,1.925-1.037,3.036-0.963c0.814,0.074,1.703,0.296,2.518,0.814 c0.37,0.222,0.74,0.518,1.036,0.741c0.37,0.296,0.741,0.518,1.111,0.814c0,0.074,0.074,0.074,0.148,0.148 c0.814,0.666,1.629,1.407,2.369,2.222v0.074c3.851,3.925,6.517,8.961,7.85,14.663v0.222 c0.297,1.333,0.519,2.592,0.593,3.851C94.504,151.719,93.171,158.31,90.06,164.086z"></path> </g> <g> <linearGradient id="SVGID_13_" gradientUnits="userSpaceOnUse" x1="71.4546" y1="176.3053" x2="71.4546" y2="121.5668"> <stop offset="0.0739" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#F7D983"></stop> </linearGradient> <path style="fill:url(#SVGID_13_);" d="M90.06,164.086c-4.369,7.85-11.997,12.219-19.847,12.219 c-3.703,0-7.332-0.963-10.812-3.036c-0.371-0.148-0.741-0.37-1.111-0.592c-5.628-3.777-8.887-10.072-9.331-16.737 c-0.296-4.369,0.593-8.813,2.74-12.812c1.481-2.74,4.74-3.629,7.258-1.925c0.518,0.37,0.962,0.74,1.259,1.259 c0.37,0.444,0.666,0.889,0.815,1.407c0.667,1.629,0.593,3.629-0.296,5.258c-2.592,4.666-1.185,10.812,3.036,13.627 c0.592,0.37,1.185,0.74,1.851,0.963c5.628,2.518,12.219,0.222,15.404-5.702c2.37-4.221,3.036-9.257,1.925-14.145 c-0.37-1.704-0.889-3.258-1.63-4.666c-0.148-0.37-0.37-0.741-0.592-1.037v-0.074c-1.407-2.37-3.185-4.295-5.48-5.776 c-0.518-0.37-1.036-0.814-1.333-1.333c-1.407-1.851-1.629-4.444-0.444-6.591c0.37-0.667,0.815-1.185,1.333-1.555 c0.074-0.222,0.222-0.296,0.371-0.296c0.889-0.741,1.925-1.037,3.036-0.963c0.814,0.074,1.703,0.296,2.518,0.814 c0.37,0.222,0.74,0.518,1.036,0.741c0.37,0.296,0.741,0.518,1.111,0.814c0,0.074,0.074,0.074,0.148,0.148 c0.814,0.666,1.629,1.407,2.369,2.222v0.074c3.851,3.925,6.517,8.961,7.85,14.663v0.222 c0.297,1.333,0.519,2.592,0.593,3.851C94.504,151.719,93.171,158.31,90.06,164.086z"></path> </g> </g> </g> </g> <g> <linearGradient id="SVGID_14_" gradientUnits="userSpaceOnUse" x1="337.7404" y1="178.2308" x2="337.7404" y2="1.9039"> <stop offset="0.0739" style="stop-color:#958559"></stop> <stop offset="1" style="stop-color:#9F8E5C"></stop> </linearGradient> <path style="fill:url(#SVGID_14_);" d="M395.763,45.152c0,2.147-0.148,4.295-0.444,6.517 c-1.63,12.293-7.109,22.957-14.959,30.659c-1.111,1.111-2.222,2.147-3.406,3.11c-0.074,0.148-0.148,0.296-0.222,0.37 c-8.517,16.737-20.736,30.882-35.399,41.101c0,0,0,0-0.074,0c-7.406,5.184-15.478,9.405-23.994,12.368 c-0.74,0.296-1.481,0.518-2.147,0.74c-1.037,1.703-1.851,3.703-2.296,5.776c-1.111,4.813-0.444,9.849,1.925,14.145 c3.555,6.517,11.33,8.664,17.255,4.666c0.444-0.296,0.889-0.667,1.333-1.037c3.184-3.11,3.999-8.368,1.703-12.516 c-1.481-2.74-0.666-6.295,1.777-7.998c0.518-0.297,1.037-0.518,1.555-0.667c2.147-0.518,4.517,0.444,5.703,2.666 c5.332,9.553,2.888,21.847-5.036,28.364c-0.074,0.074-0.148,0.074-0.222,0.148l-0.074,0.074 c-0.37,0.297-0.815,0.593-1.259,0.963c-3.777,2.444-7.85,3.629-11.923,3.629c-7.85,0-15.552-4.37-19.847-12.294 c-2.962-5.332-4.295-11.33-3.925-17.403c0.074-1.777,0.296-3.629,0.74-5.332c-5.554,0.963-11.256,1.481-17.033,1.481 c-3.184,0-5.776-2.814-5.776-6.295c0-2.962,1.777-5.481,4.295-6.147c0.444-0.148,0.963-0.222,1.481-0.222 c8.591,0,16.959-1.333,24.883-3.777c0.518-0.518,1.037-1.037,1.555-1.481c0.963-0.889,2-1.704,3.11-2.444 c0.297-0.222,0.593-0.37,0.815-0.444c0.666-0.518,1.333-1.037,1.999-1.481c0.741-0.518,1.63-0.74,2.518-0.814 c1.111-0.074,2.147,0.296,3.11,0.889c3.851-1.703,7.554-3.703,11.108-5.998c0.074,0,0.074,0,0.148-0.074 c8.442-5.776,15.996-13.034,22.365-21.476c-2.666,0.592-5.406,0.814-8.22,0.814c-2.221,0-4.517-0.148-6.887-0.518 c-2.518-0.444-5.036-1.037-7.406-1.777c-0.74-0.297-1.407-0.518-2.073-0.741c-0.222-0.074-0.518-0.148-0.741-0.296h-0.074 c-9.701-3.629-18.144-10.22-24.734-19.032l-1.555-8.516c0-0.074,0-0.074,0-0.148l-6.369-36.139l-1.185-6.517 c0.518,0.518,0.963,1.111,1.481,1.703c0-0.074,0.074-0.148,0.074-0.148c0.074-0.074,0.074-0.074,0.148-0.222c0,0,0,0,0-0.074 c0.222-0.296,0.444-0.592,0.666-0.963l2.74,1.703l2.444-2.148l5.702-4.887c0.148,0.074,0.222,0.148,0.37,0.222 c3.258,2.444,5.11,6.813,4.517,11.479c-1.333,9.997,0.963,20.069,6.443,28.215c3.777,5.48,8.665,9.701,14.293,12.293 c0.815,0.444,1.704,0.814,2.666,1.111c1.851,0.74,3.777,1.185,5.776,1.555c6.739,1.037,13.182-0.814,18.366-4.887 c1.407-1.037,2.666-2.296,3.851-3.629c1.185-1.333,2.222-2.814,3.11-4.369c1.851-3.184,3.111-6.887,3.629-10.812 c0.666-5.332-0.518-10.59-3.407-14.885c-0.74-1.037-1.555-2.074-2.444-2.962c-2.592-2.592-5.924-4.369-9.553-4.962 c-5.85-0.963-9.924-6.961-9.035-13.404c0.518-4.221,3.111-7.554,6.443-9.109c1.259-0.592,2.741-0.962,4.148-0.962 c0.518,0,1.036,0.074,1.555,0.148c10.516,1.704,19.773,7.776,26.068,17.181c0.593,0.814,1.185,1.703,1.703,2.666 c1.333,2.296,2.444,4.666,3.333,7.184C394.8,34.192,395.763,39.598,395.763,45.152z"></path> <linearGradient id="SVGID_15_" gradientUnits="userSpaceOnUse" x1="300.1857" y1="72.3214" x2="300.1857" y2="20.5386"> <stop offset="0.0739" style="stop-color:#958559"></stop> <stop offset="1" style="stop-color:#9F8E5C"></stop> </linearGradient> <path style="fill:url(#SVGID_15_);" d="M304.414,62.964l1.768,9.357c-0.324-0.432-0.636-0.877-0.936-1.335 c-2.566-3.801-4.692-7.832-6.38-12.065v-0.013c-0.982-2.466-1.826-5.009-2.496-7.59c-2.196-8.353-2.762-17.202-1.572-26.076 c0.231-1.742,0.798-3.331,1.63-4.704l0.936,4.971L304.414,62.964z"></path> <linearGradient id="SVGID_16_" gradientUnits="userSpaceOnUse" x1="311.0305" y1="123.8371" x2="311.0305" y2="72.3214"> <stop offset="0.0739" style="stop-color:#958559"></stop> <stop offset="1" style="stop-color:#9F8E5C"></stop> </linearGradient> <path style="fill:url(#SVGID_16_);" d="M306.945,73.377l8.933,50.46l-9.696-51.516 C306.425,72.677,306.679,73.033,306.945,73.377z"></path> <linearGradient id="SVGID_17_" gradientUnits="userSpaceOnUse" x1="325.2455" y1="124.3966" x2="325.2455" y2="116.5014"> <stop offset="0.0739" style="stop-color:#958559"></stop> <stop offset="1" style="stop-color:#9F8E5C"></stop> </linearGradient> <path style="fill:url(#SVGID_17_);" d="M334.601,116.501c-3.432,2.377-7.003,4.488-10.713,6.331c0,0-0.011-0.013-0.011,0 c-1.075,0.547-2.161,1.068-3.259,1.564c-0.22-0.153-0.439-0.292-0.67-0.407c-0.219-0.114-0.451-0.203-0.693-0.292 c-1.086-0.343-2.254-0.318-3.363,0.153c0.636-0.521,1.294-1.004,1.976-1.462c1.791-1.182,3.964-1.068,5.594,0.114 C327.309,120.773,331.03,118.764,334.601,116.501z"></path> <g> <g> <g> <linearGradient id="SVGID_18_" gradientUnits="userSpaceOnUse" x1="2806.4565" y1="142.806" x2="2806.4565" y2="21.3015" gradientTransform="matrix(-1 0 0 1 3144.1953 0)"> <stop offset="0" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#D3AD53"></stop> </linearGradient> <path style="fill:url(#SVGID_18_);" d="M392.963,27.658c0,0.47,0,0.941-0.012,1.399v0.038 c-0.208,19.248-4.75,37.378-12.574,53.257c0,0.013,0,0.013-0.012,0.013c-0.196,0.407-0.393,0.814-0.601,1.208 c0,0-0.012,0-0.012,0.013c-9.072,17.913-22.386,32.903-38.438,43.303c0,0.025-0.012,0.025-0.023,0.025 c-7.292,4.742-15.139,8.518-23.426,11.201c-4.091,1.335-8.275,2.39-12.551,3.153c-5.536,1.017-11.233,1.538-17.023,1.538 c-3.19,0-5.778-2.848-5.778-6.357c0-1.64,0.555-3.102,1.468-4.234c1.052-1.31,2.6-2.123,4.311-2.123 c8.159,0,16.087-1.157,23.634-3.344c0.393-0.114,0.786-0.229,1.167-0.356c2.323-0.699,4.611-1.5,6.853-2.403 c1.179-0.47,2.358-0.966,3.513-1.488c3.849-1.729,7.57-3.738,11.141-6.001c0.035-0.025,0.069-0.051,0.104-0.076 c9.604-6.103,18.144-14.036,25.182-23.368c13.429-17.761,21.519-40.557,21.519-65.399c0-3.509,2.577-6.357,5.778-6.357 c0.855,0,1.676,0.203,2.404,0.572C391.576,22.878,392.963,25.09,392.963,27.658z"></path> </g> <g> <linearGradient id="SVGID_19_" gradientUnits="userSpaceOnUse" x1="337.7386" y1="142.806" x2="337.7386" y2="21.3015"> <stop offset="0.0739" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#F7D983"></stop> </linearGradient> <path style="fill:url(#SVGID_19_);" d="M392.963,27.658c0,0.47,0,0.941-0.012,1.399v0.038 c-0.208,19.248-4.75,37.378-12.574,53.257c0,0.013,0,0.013-0.012,0.013c-0.196,0.407-0.393,0.814-0.601,1.208 c0,0-0.012,0-0.012,0.013c-9.072,17.913-22.386,32.903-38.438,43.303c0,0.025-0.012,0.025-0.023,0.025 c-7.292,4.742-15.139,8.518-23.426,11.201c-4.091,1.335-8.275,2.39-12.551,3.153c-5.536,1.017-11.233,1.538-17.023,1.538 c-3.19,0-5.778-2.848-5.778-6.357c0-1.64,0.555-3.102,1.468-4.234c1.052-1.31,2.6-2.123,4.311-2.123 c8.159,0,16.087-1.157,23.634-3.344c0.393-0.114,0.786-0.229,1.167-0.356c2.323-0.699,4.611-1.5,6.853-2.403 c1.179-0.47,2.358-0.966,3.513-1.488c3.849-1.729,7.57-3.738,11.141-6.001c0.035-0.025,0.069-0.051,0.104-0.076 c9.604-6.103,18.144-14.036,25.182-23.368c13.429-17.761,21.519-40.557,21.519-65.399c0-3.509,2.577-6.357,5.778-6.357 c0.855,0,1.676,0.203,2.404,0.572C391.576,22.878,392.963,25.09,392.963,27.658z"></path> </g> </g> <g> <g> <linearGradient id="SVGID_20_" gradientUnits="userSpaceOnUse" x1="2796.397" y1="93.8811" x2="2796.397" y2="-3.979039e-013" gradientTransform="matrix(-1 0 0 1 3144.1953 0)"> <stop offset="0" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#D3AD53"></stop> </linearGradient> <path style="fill:url(#SVGID_20_);" d="M398.133,49.744c-1.851,13.997-8.738,25.92-18.366,33.844 c-0.962,0.814-1.999,1.555-3.036,2.221c-5.036,3.555-10.812,6.073-16.811,7.258c-2.666,0.518-5.406,0.815-8.22,0.815 c-2.222,0-4.517-0.222-6.813-0.593c-2.592-0.444-5.11-1.037-7.48-1.777c-1.703-0.519-3.333-1.185-4.888-1.851 c-9.702-4.147-18.144-11.182-24.439-20.588c-0.963-1.333-1.851-2.814-2.666-4.221c0-0.074,0-0.074,0-0.148 c-0.37-0.593-0.666-1.111-1.037-1.703c0-0.074,0-0.074,0-0.148c-1.036-1.925-1.926-3.851-2.666-5.851 c-2-5.036-3.407-10.368-4.147-15.773c-0.667-5.036-0.74-10.22-0.148-15.404c0-0.814,0.074-1.703,0.222-2.518 c0.074-0.37,0.148-0.815,0.222-1.259c0.518,0.518,0.963,1.111,1.481,1.703c0-0.074,0.074-0.148,0.074-0.148 c0.074-0.074,0.074-0.074,0.148-0.222c0,0,0,0,0-0.074c0.222-0.296,0.444-0.592,0.666-0.963 c0.37-0.519,0.815-1.037,1.333-1.555c0.148-0.222,0.444-0.518,0.667-0.815h0.074l3.11,1.925l0.37,0.222l5.702-4.888 l2.444-2.148h0.074c3.406,2.444,5.48,6.961,4.813,11.701c-1.333,10.072,0.963,20.069,6.443,28.215 c3.184,4.74,7.258,8.516,11.923,11.108c1.555,0.963,3.258,1.703,5.036,2.37c1.851,0.666,3.776,1.111,5.776,1.481 c5.554,0.889,10.96-0.296,15.552-2.962C370.51,63,375.694,55.52,376.953,46.263c0.666-5.258-0.519-10.59-3.407-14.885 c-2.888-4.295-7.184-7.11-11.997-7.924c-5.851-0.963-9.924-6.887-9.035-13.33c0.371-2.962,1.704-5.48,3.629-7.258 c2.296-2.147,5.332-3.258,8.517-2.74c4.221,0.667,8.22,2.074,11.923,4.147c2.074,1.037,4.074,2.37,5.925,3.925 c1.036,0.889,1.999,1.777,2.962,2.74c2,1.925,3.703,4.073,5.258,6.369c0.666,0.963,1.333,2,1.926,3.037 C397.614,29.082,399.54,39.45,398.133,49.744z"></path> </g> <g> <linearGradient id="SVGID_21_" gradientUnits="userSpaceOnUse" x1="347.7981" y1="93.8811" x2="347.7981" y2="3.586511e-007"> <stop offset="0.0739" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#F7D983"></stop> </linearGradient> <path style="fill:url(#SVGID_21_);" d="M398.133,49.744c-1.851,13.997-8.738,25.92-18.366,33.844 c-0.962,0.814-1.999,1.555-3.036,2.221c-5.036,3.555-10.812,6.073-16.811,7.258c-2.666,0.518-5.406,0.815-8.22,0.815 c-2.222,0-4.517-0.222-6.813-0.593c-2.592-0.444-5.11-1.037-7.48-1.777c-1.703-0.519-3.333-1.185-4.888-1.851 c-9.702-4.147-18.144-11.182-24.439-20.588c-0.963-1.333-1.851-2.814-2.666-4.221c0-0.074,0-0.074,0-0.148 c-0.37-0.593-0.666-1.111-1.037-1.703c0-0.074,0-0.074,0-0.148c-1.036-1.925-1.926-3.851-2.666-5.851 c-2-5.036-3.407-10.368-4.147-15.773c-0.667-5.036-0.74-10.22-0.148-15.404c0-0.814,0.074-1.703,0.222-2.518 c0.074-0.37,0.148-0.815,0.222-1.259c0.518,0.518,0.963,1.111,1.481,1.703c0-0.074,0.074-0.148,0.074-0.148 c0.074-0.074,0.074-0.074,0.148-0.222c0,0,0,0,0-0.074c0.222-0.296,0.444-0.592,0.666-0.963 c0.37-0.519,0.815-1.037,1.333-1.555c0.148-0.222,0.444-0.518,0.667-0.815h0.074l3.11,1.925l0.37,0.222l5.702-4.888 l2.444-2.148h0.074c3.406,2.444,5.48,6.961,4.813,11.701c-1.333,10.072,0.963,20.069,6.443,28.215 c3.184,4.74,7.258,8.516,11.923,11.108c1.555,0.963,3.258,1.703,5.036,2.37c1.851,0.666,3.776,1.111,5.776,1.481 c5.554,0.889,10.96-0.296,15.552-2.962C370.51,63,375.694,55.52,376.953,46.263c0.666-5.258-0.519-10.59-3.407-14.885 c-2.888-4.295-7.184-7.11-11.997-7.924c-5.851-0.963-9.924-6.887-9.035-13.33c0.371-2.962,1.704-5.48,3.629-7.258 c2.296-2.147,5.332-3.258,8.517-2.74c4.221,0.667,8.22,2.074,11.923,4.147c2.074,1.037,4.074,2.37,5.925,3.925 c1.036,0.889,1.999,1.777,2.962,2.74c2,1.925,3.703,4.073,5.258,6.369c0.666,0.963,1.333,2,1.926,3.037 C397.614,29.082,399.54,39.45,398.133,49.744z"></path> </g> </g> <g> <g> <linearGradient id="SVGID_22_" gradientUnits="userSpaceOnUse" x1="2817.0757" y1="176.3319" x2="2817.0757" y2="121.5561" gradientTransform="matrix(-1 0 0 1 3144.1953 0)"> <stop offset="0" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#D3AD53"></stop> </linearGradient> <path style="fill:url(#SVGID_22_);" d="M340.275,172.67c-0.462,0.305-0.948,0.598-1.422,0.877 c-3.34,1.882-6.946,2.784-10.505,2.784c-7.836,0-15.486-4.373-19.832-12.281c-3.791-6.878-4.923-14.964-3.201-22.783 c0.012-0.063,0.023-0.114,0.035-0.178c1.283-5.696,3.964-10.743,7.743-14.697c0.867-0.915,1.791-1.767,2.785-2.543 c0-0.013,0-0.013,0.012,0c0.636-0.521,1.294-1.004,1.976-1.462c1.791-1.182,3.964-1.068,5.594,0.114 c0.15,0.089,0.289,0.191,0.416,0.331c0-0.013,0.011,0,0.011,0c0.474,0.407,0.89,0.915,1.225,1.526 c1.514,2.746,0.717,6.319-1.791,7.971c-2.219,1.475-4.068,3.445-5.455,5.785c-0.22,0.381-0.439,0.763-0.624,1.17h-0.011 c-0.717,1.424-1.271,2.962-1.63,4.59c-1.086,4.857-0.393,9.891,1.953,14.176c3.282,5.975,10.066,8.238,15.752,5.53 c0.509-0.242,1.017-0.521,1.503-0.852c4.241-2.822,5.617-8.912,3.051-13.578c-1.202-2.187-0.936-4.908,0.509-6.764 c0.347-0.47,0.774-0.89,1.283-1.221c2.496-1.653,5.732-0.775,7.246,1.971C352.468,153.295,349.498,166.542,340.275,172.67z "></path> </g> <g> <linearGradient id="SVGID_23_" gradientUnits="userSpaceOnUse" x1="327.1194" y1="176.3319" x2="327.1194" y2="121.5562"> <stop offset="0.0739" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#F7D983"></stop> </linearGradient> <path style="fill:url(#SVGID_23_);" d="M340.275,172.67c-0.462,0.305-0.948,0.598-1.422,0.877 c-3.34,1.882-6.946,2.784-10.505,2.784c-7.836,0-15.486-4.373-19.832-12.281c-3.791-6.878-4.923-14.964-3.201-22.783 c0.012-0.063,0.023-0.114,0.035-0.178c1.283-5.696,3.964-10.743,7.743-14.697c0.867-0.915,1.791-1.767,2.785-2.543 c0-0.013,0-0.013,0.012,0c0.636-0.521,1.294-1.004,1.976-1.462c1.791-1.182,3.964-1.068,5.594,0.114 c0.15,0.089,0.289,0.191,0.416,0.331c0-0.013,0.011,0,0.011,0c0.474,0.407,0.89,0.915,1.225,1.526 c1.514,2.746,0.717,6.319-1.791,7.971c-2.219,1.475-4.068,3.445-5.455,5.785c-0.22,0.381-0.439,0.763-0.624,1.17h-0.011 c-0.717,1.424-1.271,2.962-1.63,4.59c-1.086,4.857-0.393,9.891,1.953,14.176c3.282,5.975,10.066,8.238,15.752,5.53 c0.509-0.242,1.017-0.521,1.503-0.852c4.241-2.822,5.617-8.912,3.051-13.578c-1.202-2.187-0.936-4.908,0.509-6.764 c0.347-0.47,0.774-0.89,1.283-1.221c2.496-1.653,5.732-0.775,7.246,1.971C352.468,153.295,349.498,166.542,340.275,172.67z "></path> </g> </g> </g> </g> </g> <g> <linearGradient id="SVGID_24_" gradientUnits="userSpaceOnUse" x1="271.7533" y1="190.3015" x2="271.7533" y2="6.6006"> <stop offset="0" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#D3AD53"></stop> </linearGradient> <path style="fill:url(#SVGID_24_);" d="M341.036,31.378c-0.592,6.739-1.481,14.737-2.518,23.772c0,0,0,0,0,0.074 c-0.297,2.296-0.593,4.591-0.889,6.961c-0.148,1.333-0.296,2.666-0.444,3.925c-0.148,1.111-0.296,2.147-0.444,3.11 c-1.111,7.257-2.592,14.071-4.221,20.439c-0.297,0.963-0.518,1.851-0.741,2.74c-1.555,5.48-3.258,10.59-5.184,15.478 c-1.926,4.813-3.999,9.405-6.22,13.7c-0.37,0.74-0.741,1.407-1.111,2.147c-0.148,0.222-0.296,0.444-0.37,0.667 c-3.258,5.998-6.813,11.33-10.59,16.218v0.074c-1.185,1.555-2.296,2.962-3.555,4.443l-0.074,0.074 c-0.963,1.111-1.925,2.221-2.888,3.333c-1.259,1.407-2.518,2.74-3.851,3.999c-1.333,1.333-2.592,2.592-3.925,3.777 c-5.332,4.887-10.812,9.035-16.441,12.59c-0.074,0-0.222,0.074-0.296,0.222c-2.147,1.333-4.295,2.592-6.443,3.777 c-0.519,0.296-1.111,0.592-1.63,0.889c-1.407,0.741-2.814,1.481-4.221,2.148c-0.222,0.074-0.37,0.222-0.592,0.296 c-1.185,0.592-2.444,1.111-3.629,1.629c-1.407,0.667-2.741,1.259-4.147,1.778c-6.961,2.814-13.701,4.888-19.995,6.443 c-10.516,2.592-19.773,3.629-26.438,3.999c-0.889,0.074-1.777,0.074-2.592,0.148c-2.443,0.074-4.369,0.074-5.776,0.074 c3.184-1.407,6.443-2.888,9.701-4.517c6.147-3.184,12.367-6.813,18.44-11.108c0.889-0.592,1.703-1.185,2.592-1.851 c0.518-0.444,1.036-0.814,1.629-1.259c0.593-0.444,1.185-0.889,1.777-1.333c0.518-0.444,1.037-0.889,1.63-1.333 c0.889-0.667,1.777-1.407,2.666-2.222c0.222-0.148,0.37-0.296,0.593-0.445c0.518-0.518,1.111-0.962,1.629-1.481 c1.703-1.481,3.407-3.036,5.036-4.665c0.593-0.518,1.111-1.111,1.63-1.63c3.406-3.406,6.739-7.035,9.849-11.034 c0.371-0.444,0.741-0.889,1.111-1.333c0.593-0.814,1.259-1.629,1.851-2.444c0.815-1.036,1.629-2.147,2.37-3.258 c2.444-3.332,4.74-6.887,6.961-10.664c0.444-0.74,0.889-1.481,1.333-2.222c0.889-1.555,1.703-3.11,2.518-4.665 c0.37-0.666,0.74-1.407,1.111-2.073c0.444-0.963,0.963-1.851,1.407-2.814c0.37-0.814,0.74-1.63,1.185-2.444 c0.37-0.889,0.74-1.703,1.111-2.592c0.444-0.815,0.814-1.704,1.185-2.592l1.111-2.666c0.37-0.889,0.741-1.777,1.037-2.666 c0.37-0.889,0.74-1.777,1.037-2.74c0.37-0.889,0.74-1.851,1.036-2.814c0.371-0.889,0.667-1.851,0.963-2.814 c0.371-0.963,0.667-1.926,0.963-2.888c0.222-0.814,0.518-1.555,0.741-2.37c0.666-2.147,1.333-4.369,1.925-6.591 c0.222-0.962,0.518-1.851,0.74-2.74c0.296-1.185,0.593-2.369,0.814-3.554c0.297-1.037,0.518-2.073,0.741-3.184 c0.222-1.037,0.444-2,0.666-3.036c0.296-1.185,0.518-2.37,0.741-3.555c0.444-2.222,0.814-4.443,1.185-6.739 c0.222-1.111,0.37-2.148,0.518-3.258c0-0.148,0.074-0.222,0.074-0.37c0.074-0.815,0.222-1.629,0.37-2.444 c0.222-1.481,0.37-3.037,0.592-4.591c0-0.222,0.074-0.518,0.074-0.814c0.148-0.741,0.222-1.555,0.297-2.37 c0.074-0.741,0.222-1.555,0.296-2.296c0.148-1.555,0.37-3.111,0.518-4.591c0.37-3.111,0.74-6.073,1.037-8.961 c0.148-0.889,0.222-1.777,0.296-2.666c0.074-0.371,0.074-0.741,0.148-1.037c0.074-0.74,0.148-1.481,0.222-2.147 c0.074-1.037,0.222-2.074,0.297-3.037c0,0,0,0,0-0.074c0.222-0.296,0.444-0.592,0.666-0.963 c0.37-0.519,0.815-1.037,1.333-1.555c0.148-0.222,0.444-0.518,0.667-0.815h0.074c9.183-9.257,31.4-16.218,37.176-12.219 C341.998,9.531,342.147,17.974,341.036,31.378z"></path> <linearGradient id="SVGID_25_" gradientUnits="userSpaceOnUse" x1="126.5045" y1="190.3015" x2="126.5045" y2="6.5974"> <stop offset="0.0739" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#F7D983"></stop> </linearGradient> <path style="fill:url(#SVGID_25_);" d="M196.108,190.301c-1.851,0-4.443,0-7.628-0.222c-0.222,0-0.444-0.074-0.667-0.074 c-6.591-0.37-15.626-1.407-25.845-3.925c-20.143-4.888-44.952-15.33-65.169-37.546l-0.074-0.074 c-0.963-1.111-1.851-2.147-2.814-3.258l-0.074-0.074c-1.259-1.481-2.37-2.888-3.555-4.443 c-3.629-4.814-7.11-10.072-10.294-15.774c-0.074-0.148-0.222-0.37-0.296-0.518c-0.148-0.222-0.222-0.444-0.37-0.667v-0.074 c-0.371-0.74-0.741-1.333-1.111-2.073c-4.517-8.59-8.368-18.292-11.404-29.178c-0.074-0.296-0.148-0.592-0.222-0.889 c-0.148-0.593-0.37-1.259-0.518-1.851c-1.703-6.369-3.11-13.108-4.221-20.365V69.22c0-0.222-0.074-0.518-0.074-0.74 c-0.148-0.815-0.222-1.555-0.37-2.37c-0.148-1.259-0.296-2.592-0.518-3.925c-3.703-31.029-5.85-51.543-1.777-54.431 c4.666-3.258,20.218,0.74,30.882,7.331l5.998,5.11l2.222,1.926v0.37c0.666,6.443,1.481,13.626,2.37,21.402 c0.296,2.147,0.519,4.369,0.814,6.591c0.074,0.889,0.222,1.703,0.296,2.592v0.074c0.222,1.333,0.37,2.518,0.593,3.851 c0.148,1.185,0.296,2.296,0.518,3.407c0.148,0.963,0.296,1.926,0.444,2.888c0.074,0.37,0.148,0.666,0.222,1.037 c0.148,0.814,0.222,1.629,0.371,2.444c0.074,0.148,0.074,0.222,0.148,0.371c0,0.074,0,0.074,0,0.148v0.222 c0.148,0.592,0.222,1.11,0.37,1.703c0,0.074,0,0.148,0,0.148c0.148,0.592,0.222,1.185,0.371,1.703 c0.148,0.889,0.296,1.703,0.519,2.518c0.222,1.036,0.444,2.147,0.666,3.184c0.296,1.037,0.519,2.073,0.741,3.11 c0.296,1.037,0.518,2,0.814,3.036c0.222,1.037,0.518,2,0.814,3.036c0.222,0.963,0.518,1.925,0.814,2.888 c0.222,0.889,0.518,1.703,0.741,2.518c0,0.074,0.074,0.148,0.074,0.222c0.074,0.148,0.074,0.222,0.074,0.37 c0.222,0.74,0.444,1.481,0.741,2.222c0.37,1.111,0.74,2.222,1.111,3.258c0.297,0.889,0.593,1.703,0.889,2.592 c0.074,0.148,0.074,0.296,0.148,0.444c0.296,0.814,0.593,1.629,0.889,2.444c0.296,0.741,0.593,1.481,0.889,2.148 c0,0.074,0,0.148,0.074,0.222c0,0.074,0.074,0.148,0.074,0.297c0,0,0,0,0.074,0.074c0.296,0.815,0.592,1.629,0.889,2.37 c0.074,0.074,0.074,0.148,0.074,0.222c0.74,1.629,1.407,3.333,2.147,4.887c0.444,0.889,0.814,1.777,1.259,2.666 c0.371,0.815,0.741,1.629,1.111,2.444c0.444,0.814,0.814,1.555,1.185,2.37c0.518,0.963,0.963,1.851,1.481,2.814 c0.444,0.889,0.963,1.703,1.407,2.592c0.074,0,0.074,0.074,0.074,0.148c0.296,0.444,0.519,0.889,0.814,1.333 c0.37,0.741,0.814,1.481,1.259,2.222c0.889,1.481,1.704,2.888,2.592,4.295h0.074c0.889,1.407,1.777,2.814,2.74,4.147 c0.296,0.518,0.666,0.963,1.037,1.481c0.296,0.518,0.666,1.037,1.036,1.481c0.667,0.963,1.407,1.926,2.148,2.888 c0.444,0.667,0.963,1.259,1.407,1.925c0.519,0.593,0.963,1.185,1.407,1.704c0.592,0.666,1.111,1.333,1.703,2.073 c0.518,0.592,1.111,1.259,1.629,1.926c1.185,1.333,2.296,2.592,3.481,3.777c0.444,0.518,0.889,1.037,1.407,1.481 c0.518,0.592,1.037,1.111,1.555,1.703c0.371,0.296,0.741,0.667,1.111,1.037l1.333,1.333c1.407,1.333,2.74,2.592,4.147,3.777 c0.592,0.519,1.111,1.036,1.704,1.481c0.518,0.518,1.111,0.963,1.703,1.407c2.962,2.518,6.073,4.814,9.109,7.035 c1.704,1.185,3.481,2.37,5.184,3.481c0.518,0.37,1.037,0.666,1.555,0.963c0.518,0.296,0.963,0.666,1.481,0.963 c0.222,0.074,0.371,0.148,0.518,0.296c0.444,0.296,0.889,0.518,1.407,0.814c1.111,0.667,2.222,1.333,3.407,1.926 c0.518,0.296,1.111,0.667,1.703,0.963c1.111,0.592,2.296,1.185,3.407,1.777C189.74,187.488,192.924,188.969,196.108,190.301z"></path> <linearGradient id="SVGID_26_" gradientUnits="userSpaceOnUse" x1="198.9966" y1="190.3015" x2="198.9966" y2="7.1616"> <stop offset="0.1478" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#DEB863"></stop> </linearGradient> <path style="fill:url(#SVGID_26_);" d="M231.433,21.528c-0.444,11.627-1.037,25.105-1.777,40.064 c-2.296,47.84-7.85,84.72-15.108,113.083c-0.963,3.851-1.999,7.554-3.036,11.108c-3.258,1.63-6.517,3.111-9.701,4.517 c-1.63,0-2.518-0.074-2.518-0.074s-1.111,0.074-3.184,0.074c-3.184-1.333-6.369-2.814-9.553-4.443 c-1.037-3.555-2.074-7.257-3.036-11.183c-7.257-28.363-12.812-65.243-15.181-113.083c-0.37-8.517-0.74-16.515-1.111-23.92 c-0.222-5.48-0.444-10.738-0.667-15.626c7.998-8.813,18.958-14.367,31.104-14.811c0.518-0.074,1.111-0.074,1.629-0.074 C211.808,7.162,223.065,12.642,231.433,21.528z"></path> <linearGradient id="SVGID_27_" gradientUnits="userSpaceOnUse" x1="142.3577" y1="190.3007" x2="142.3577" y2="6.5985"> <stop offset="0.1478" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#DEB863"></stop> </linearGradient> <path style="fill:url(#SVGID_27_);" d="M186.546,185.854c-1.133-0.572-2.277-1.17-3.409-1.78 c-0.566-0.305-1.144-0.623-1.71-0.941c-1.133-0.623-2.277-1.271-3.409-1.945c-0.462-0.267-0.924-0.547-1.387-0.826 c-0.162-0.102-0.324-0.191-0.485-0.292c-0.52-0.305-1.029-0.623-1.537-0.954c-0.497-0.305-1.005-0.623-1.514-0.953 c-4.842-3.115-9.65-6.598-14.331-10.489c-0.566-0.47-1.133-0.941-1.687-1.424c-0.566-0.483-1.121-0.966-1.676-1.462 c-1.398-1.233-2.785-2.505-4.149-3.814c-0.462-0.445-0.925-0.903-1.387-1.348c-0.347-0.343-0.693-0.699-1.04-1.042 c-0.543-0.547-1.087-1.093-1.618-1.653c-0.474-0.483-0.948-0.979-1.41-1.475c-1.156-1.246-2.3-2.504-3.421-3.801 c-0.566-0.648-1.133-1.309-1.687-1.971c-0.555-0.674-1.11-1.348-1.664-2.021c-0.474-0.572-0.936-1.157-1.387-1.742 c-0.497-0.623-0.982-1.246-1.456-1.882c-0.716-0.954-1.433-1.92-2.138-2.899c-0.358-0.483-0.705-0.992-1.052-1.488 c-0.358-0.496-0.705-1.004-1.052-1.5c-0.925-1.348-1.838-2.721-2.727-4.132c-0.012-0.013-0.023-0.013-0.023-0.025 c-0.89-1.386-1.757-2.822-2.623-4.272c-0.439-0.737-0.867-1.462-1.283-2.212c-0.254-0.432-0.508-0.877-0.751-1.322 c-0.035-0.063-0.069-0.14-0.116-0.203c-0.462-0.839-0.936-1.691-1.387-2.556c-0.497-0.928-0.994-1.869-1.468-2.822 c-0.405-0.788-0.797-1.576-1.19-2.39c-0.405-0.801-0.786-1.602-1.167-2.428c-0.404-0.865-0.809-1.729-1.202-2.619 c-0.74-1.615-1.445-3.267-2.138-4.958c-0.023-0.051-0.046-0.114-0.069-0.165c-0.324-0.788-0.647-1.589-0.959-2.403 c-0.023-0.025-0.035-0.051-0.035-0.089c-0.035-0.089-0.069-0.178-0.104-0.267c-0.023-0.064-0.058-0.14-0.081-0.203 c-0.289-0.712-0.566-1.437-0.832-2.161c-0.312-0.801-0.601-1.602-0.901-2.416c-0.058-0.153-0.116-0.318-0.173-0.483 c-0.3-0.852-0.601-1.704-0.89-2.568c-0.624-1.805-1.225-3.636-1.803-5.518c-0.035-0.115-0.069-0.229-0.104-0.356 c-0.023-0.089-0.058-0.165-0.081-0.254c-0.243-0.814-0.497-1.627-0.728-2.454c-0.289-0.966-0.566-1.958-0.844-2.95 c-0.277-0.992-0.543-1.996-0.809-3.013c-0.266-1.004-0.52-2.021-0.774-3.051c-0.254-1.03-0.497-2.06-0.74-3.115 c-0.243-1.043-0.474-2.098-0.705-3.153c-0.185-0.826-0.358-1.665-0.52-2.505c-0.116-0.559-0.231-1.132-0.335-1.691 c-0.011-0.051-0.023-0.114-0.035-0.165c-0.116-0.572-0.231-1.157-0.335-1.742c-0.012-0.064-0.023-0.14-0.035-0.203 c-0.012-0.038-0.012-0.076-0.023-0.114c-0.023-0.14-0.058-0.28-0.081-0.42c-0.15-0.801-0.289-1.589-0.439-2.403v-0.038 c-0.069-0.33-0.116-0.674-0.174-1.004c-0.173-0.953-0.324-1.907-0.474-2.873c-0.185-1.132-0.358-2.276-0.52-3.42v-0.013 c-0.185-1.297-0.37-2.606-0.543-3.929c-0.116-0.852-0.22-1.704-0.324-2.555c-0.266-2.25-0.532-4.45-0.798-6.611 c-0.924-7.806-1.745-14.989-2.392-21.448c-0.011-0.127-0.023-0.242-0.035-0.356l2.184-1.309l4.149-2.479h0.011 c7.917-6.992,17.971-11.175,28.904-11.175c12.897,0,24.547,5.81,32.937,15.18c0.069-0.076,0.15-0.153,0.219-0.242 c0.462,11.531,1.075,24.779,1.791,39.489C170.99,115.98,177.785,156.155,186.546,185.854z"></path> <linearGradient id="SVGID_28_" gradientUnits="userSpaceOnUse" x1="255.5383" y1="190.3235" x2="255.5383" y2="6.6209"> <stop offset="0.1478" style="stop-color:#E5C378"></stop> <stop offset="0.9951" style="stop-color:#DEB863"></stop> </linearGradient> <path style="fill:url(#SVGID_28_);" d="M299.565,23.38c-0.074,0.963-0.222,2-0.297,3.037c-0.074,0.666-0.148,1.407-0.222,2.147 c-0.074,0.296-0.074,0.666-0.148,1.037c-0.074,0.889-0.148,1.777-0.296,2.666c-0.297,2.888-0.667,5.85-1.037,8.961 c-0.148,1.481-0.37,3.036-0.518,4.591c-0.074,0.74-0.222,1.555-0.296,2.296c-0.074,0.814-0.148,1.629-0.297,2.37 c0,0.296-0.074,0.592-0.074,0.814c-0.222,1.555-0.371,3.11-0.592,4.591c-0.148,0.815-0.296,1.629-0.37,2.444 c0,0.148-0.074,0.222-0.074,0.37c-0.148,1.111-0.297,2.147-0.518,3.258c-0.37,2.296-0.74,4.517-1.185,6.739 c-0.222,1.185-0.445,2.37-0.741,3.555c-0.222,1.036-0.444,1.999-0.666,3.036c-0.222,1.111-0.444,2.147-0.741,3.184 c-0.222,1.185-0.518,2.37-0.814,3.554c-0.222,0.889-0.518,1.778-0.74,2.74c-0.593,2.222-1.259,4.444-1.925,6.591 c-0.222,0.814-0.519,1.555-0.741,2.37c-0.296,0.963-0.592,1.925-0.963,2.888c-0.296,0.963-0.592,1.925-0.963,2.814 c-0.296,0.963-0.666,1.925-1.036,2.814c-0.296,0.963-0.667,1.851-1.037,2.74c-0.296,0.889-0.667,1.777-1.037,2.666 l-1.111,2.666c-0.371,0.889-0.741,1.777-1.185,2.592c-0.37,0.889-0.74,1.703-1.111,2.592c-0.445,0.814-0.815,1.63-1.185,2.444 c-0.444,0.963-0.963,1.851-1.407,2.814c-0.37,0.666-0.74,1.407-1.111,2.073c-0.815,1.555-1.629,3.111-2.518,4.665 c-0.444,0.741-0.889,1.481-1.333,2.222c-2.222,3.777-4.517,7.332-6.961,10.664c-0.741,1.111-1.555,2.222-2.37,3.258 c-0.593,0.815-1.259,1.63-1.851,2.444c-0.37,0.444-0.74,0.889-1.111,1.333c-3.11,3.999-6.443,7.628-9.849,11.034 c-0.519,0.518-1.037,1.111-1.63,1.63c-1.629,1.629-3.333,3.184-5.036,4.665c-0.518,0.519-1.111,0.963-1.629,1.481 c-0.222,0.148-0.371,0.297-0.593,0.445c-0.889,0.814-1.777,1.555-2.666,2.222c-0.593,0.444-1.111,0.889-1.63,1.333 c-0.592,0.444-1.185,0.889-1.777,1.333c-0.593,0.444-1.111,0.814-1.629,1.259c-0.889,0.667-1.704,1.259-2.592,1.851 c-6.073,4.295-12.293,7.924-18.44,11.108c1.037-3.554,2.073-7.257,3.036-11.108c7.258-28.363,12.812-65.243,15.108-113.083 c0.74-14.959,1.333-28.438,1.777-40.064c0.296,0.222,0.519,0.518,0.814,0.815c8.368-9.405,19.995-15.181,32.881-15.181 c6.073,0,11.849,1.259,17.107,3.554c5.258,2.296,10.072,5.628,14.219,9.85l1.407,1.481c0.518,0.518,0.963,1.111,1.481,1.703 c0-0.074,0.074-0.148,0.074-0.148C299.49,23.528,299.49,23.528,299.565,23.38z"></path> </g> </g> <path style="opacity:0.1;fill:#040000;" d="M392.653,20.344c-0.593-1.037-1.259-2.074-1.926-3.037 c-1.555-2.296-3.259-4.443-5.258-6.369c-0.963-0.963-1.926-1.851-2.962-2.74c-1.851-1.555-3.851-2.888-5.925-3.925 c-3.703-2.073-7.702-3.48-11.923-4.147c-3.184-0.518-6.22,0.593-8.517,2.74c-3.332,1.555-5.924,4.888-6.443,9.109 c-0.889,6.443,3.185,12.441,9.035,13.404c3.629,0.593,6.961,2.37,9.553,4.962c0.889,0.889,1.704,1.926,2.444,2.962 c2.888,4.295,4.073,9.553,3.407,14.885c-0.518,3.925-1.778,7.627-3.629,10.812c-0.889,1.555-1.925,3.036-3.11,4.369 c-1.185,1.333-2.444,2.592-3.851,3.629c-4.591,2.666-9.997,3.851-15.552,2.962c-2-0.296-3.925-0.814-5.776-1.481 c-1.778-0.667-3.481-1.407-5.036-2.37c0.148-1.259,0.296-2.592,0.518-3.925c0.297-2.37,0.593-4.739,0.815-6.961 c0-0.074,0-0.074,0-0.074c1.111-9.035,1.999-17.033,2.518-23.772c1.111-13.404,0.963-21.847-1.555-23.624 c-5.776-3.999-27.993,2.962-37.176,12.219c-0.148,0.148-0.297,0.296-0.444,0.445c-0.074,0.148-0.222,0.296-0.297,0.37 c-0.518,0.518-0.963,1.036-1.333,1.555c-0.222,0.371-0.444,0.667-0.666,0.963c0,0.074,0,0.074,0,0.074 c-0.074,0.148-0.074,0.148-0.148,0.222c0,0-0.074,0.074-0.074,0.148c-0.518-0.592-0.963-1.185-1.481-1.703l-1.407-1.481 c-4.147-4.221-8.961-7.553-14.219-9.85c-5.258-2.296-11.034-3.554-17.107-3.554c-12.886,0-24.512,5.777-32.881,15.181 c-0.296-0.296-0.518-0.592-0.74-0.815h-0.074c-8.368-8.887-19.625-14.367-32.14-14.367v348.062h64.577V338.34 c0-0.741-0.074-1.481-0.222-2.222c0-0.296-0.074-0.666-0.222-0.962c-0.074-0.371-0.148-0.741-0.297-1.111 c-0.148-0.296-0.296-0.667-0.444-0.963c-0.148-0.296-0.296-0.592-0.518-0.889c-0.148-0.37-0.445-0.74-0.667-1.037 c-0.296-0.593-0.814-1.111-1.333-1.629c-0.222-0.222-0.444-0.444-0.667-0.593c-0.148-0.222-0.296-0.37-0.518-0.518 c-0.074-0.074-0.148-0.074-0.222-0.148c0,0-0.074-0.074-0.148-0.074c-0.074-0.148-0.148-0.148-0.296-0.222 c-0.667-0.444-1.407-0.814-2.148-1.185h-0.074c-0.667-0.297-1.333-0.518-2.074-0.667c-0.222-0.074-0.444-0.148-0.666-0.148 c-0.371-0.074-0.815-0.148-1.185-0.148v-2.222c0-0.74-0.074-1.481-0.222-2.147c-0.074-0.518-0.222-1.037-0.444-1.481 c0-0.074,0-0.148-0.074-0.222c-0.074-0.222-0.148-0.444-0.297-0.667c-0.222-0.518-0.518-0.963-0.814-1.407 c-0.296-0.444-0.593-0.815-0.963-1.185c-0.222-0.296-0.444-0.518-0.74-0.741c-0.296-0.296-0.667-0.592-1.037-0.815 c-0.592-0.444-1.185-0.74-1.777-1.037c-1.259-0.518-2.592-0.814-3.999-0.889h-0.074v-0.074c-0.222-0.667-0.444-1.333-0.593-2 c-0.593-1.851-1.111-3.777-1.555-5.851c-0.296-1.259-0.592-2.592-0.815-3.925c-0.222-1.259-0.444-2.444-0.593-3.703 c-0.148-0.667-0.222-1.333-0.296-2.074c-0.222-1.11-0.37-2.296-0.444-3.48c-0.296-2.37-0.444-4.888-0.592-7.48 c-0.074-1.259-0.148-2.592-0.148-3.925c-0.074-1.333-0.074-2.74-0.074-4.147v-0.444l5.702-3.185l0.667-0.37l8.368-23.254h0.518 l-0.222-0.889l0.222-0.814l-0.518-0.074l-5.406-2.518l-2.962-1.333l-6.369-3.481v-53.912c6.295-1.555,13.034-3.629,19.995-6.443 c1.407-0.518,2.74-1.111,4.147-1.778c1.185-0.518,2.443-1.036,3.629-1.629c0.222-0.074,0.37-0.222,0.592-0.296 c1.407-0.667,2.814-1.407,4.221-2.148c0.518-0.296,1.111-0.593,1.63-0.889c2.147-1.185,4.295-2.444,6.443-3.777 c0.074-0.148,0.222-0.222,0.296-0.222c5.554-3.555,11.108-7.702,16.441-12.59c1.333-1.185,2.592-2.444,3.925-3.777 c1.333-1.259,2.592-2.592,3.851-3.999c-0.37,6.073,0.963,12.071,3.925,17.403c4.295,7.924,11.997,12.294,19.847,12.294 c4.073,0,8.146-1.185,11.923-3.629c0.444-0.37,0.889-0.666,1.259-0.963l0.074-0.074c0.074-0.074,0.148-0.074,0.222-0.148 c0.444-0.222,0.815-0.518,1.259-0.74c9.183-6.147,12.145-19.403,6.591-29.549c-1.481-2.74-4.739-3.629-7.257-1.925 c-0.519,0.296-0.889,0.74-1.259,1.185c-0.518,0.148-1.037,0.37-1.555,0.667c-2.444,1.703-3.259,5.258-1.777,7.998 c2.296,4.147,1.481,9.405-1.703,12.516c-1.555,0.814-3.259,1.111-4.888,1.111c-0.519,0.074-1.111,0-1.703-0.074 c-1.555-0.222-3.11-0.74-4.517-1.629c-0.889-0.518-1.777-1.259-2.592-2.074c-0.74-0.814-1.481-1.777-2.073-2.814 c-2.37-4.295-3.037-9.331-1.926-14.219c0.296-1.63,0.889-3.184,1.629-4.591c8.517-2.962,16.589-7.184,23.994-12.368 c0.074,0,0.074,0,0.074,0c1.851-1.185,3.629-2.443,5.406-3.776c3.999-2.962,7.776-6.221,11.404-9.775 c3.407-3.407,6.665-7.035,9.701-10.961c2.962-3.851,5.777-7.924,8.294-12.219c1.259-2.148,2.518-4.369,3.629-6.591 c9.628-7.924,16.515-19.847,18.366-33.844C399.54,39.45,397.614,29.082,392.653,20.344z M323.484,122.467 c-0.963-0.593-2-0.963-3.11-0.889c2.222-4.295,4.295-8.887,6.22-13.7c1.851-4.888,3.555-9.998,5.11-15.478h0.074 c0.222,0.148,0.518,0.222,0.741,0.296c0.666,0.222,1.407,0.444,2.073,0.667c2.37,0.814,4.887,1.407,7.406,1.851 c2.37,0.37,4.666,0.518,6.887,0.518c2.814,0,5.554-0.222,8.22-0.814c-6.369,8.442-13.922,15.7-22.365,21.476 c-0.074,0.074-0.074,0.074-0.148,0.074C331.038,118.764,327.335,120.763,323.484,122.467z"></path> </g> <rect x="142.358" y="412.962" style="opacity:0.1;fill:#FEF4E2;" width="109.811" height="11.575"></rect> <rect x="142.358" y="438.281" style="opacity:0.1;fill:#FEF4E2;" width="109.811" height="11.575"></rect> <g style="opacity:0.5;"> <path style="fill:#FEF4E2;" d="M122.458,399.473c-4.328,0-7.868,3.54-7.868,7.868v48.136c0,4.327,3.541,7.868,7.868,7.868h79.351 v-63.873H122.458z"></path> <path style="fill:#FDF0D2;" d="M278.92,455.477v-48.136c0-4.328-3.541-7.868-7.868-7.868h-74.315v63.873h74.315 C275.379,463.346,278.92,459.805,278.92,455.477z"></path> </g> <rect x="142.358" y="410.025" style="fill:#383430;" width="109.811" height="11.575"></rect> <rect x="142.358" y="435.345" style="fill:#383430;" width="109.811" height="11.575"></rect> </g> </g> </g></svg> `,
    `Nghiên cứu lập đề án, dự án quy hoạch, quy hoạch đô thị nông thôn; Chương trình phát triển nhà ở; Kinh tế đô thị, Môi trường đô thị; Đầu tư xây dựng; Thông tin thị trường bất động sản; Công tác đấu thầu... <strong class="highlight-text-phrase"></strong><strong class="highlight-text-phrase"></strong> <svg width="22px" height="22px" style="vertical-align: middle; transform: translateY(-2.5px);" viewBox="-1.07 0 21.124314 21.124314" id="svg8" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:svg="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <defs id="defs2"> <clipPath clipPathUnits="userSpaceOnUse" id="clipPath23"> <rect height="170.00711" id="rect25" style="opacity:1;fill:none;fill-opacity:1;stroke:#000000;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:0.97641512" transform="rotate(90)" width="263.84616" x="6.7847877" y="110.36194"></rect> </clipPath> </defs> <g id="layer1" transform="translate(56.656484,-341.2299)"> <rect height="58.184261" id="rect8011" ry="1.1433572" style="opacity:1;fill:none;fill-opacity:1;stroke:none;stroke-width:1.10699999;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" width="150.11761" x="-377.22021" y="-198.90477"></rect> </g> <g id="g8681" transform="translate(56.656484,-341.2299)"> <rect height="58.184261" id="rect8677" ry="1.1433572" style="opacity:1;fill:none;fill-opacity:1;stroke:none;stroke-width:1.10699999;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" width="150.11761" x="-377.22021" y="-198.90477"></rect> </g> <g id="g9233" transform="translate(56.656484,-341.2299)"> <rect height="58.184261" id="rect9229" ry="1.1433572" style="opacity:1;fill:none;fill-opacity:1;stroke:none;stroke-width:1.10699999;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" width="150.11761" x="-377.22021" y="-198.90477"></rect> <rect height="368.83194" id="rect9311" ry="1.1433572" style="opacity:1;fill:none;fill-opacity:1;stroke:none;stroke-width:1.10699999;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" width="313.2399" x="-594.38983" y="-161.63449"></rect> <path d="m -50.965096,354.78457 c 0,0 -0.290316,3.65164 3.424418,2.93042" id="path972-8-5" style="opacity:1;fill:none;fill-opacity:1;stroke:#241f1c;stroke-width:0.80890197;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"></path> <ellipse cx="-47.622818" cy="361.93448" id="path981-4-4" rx="5.1331449" ry="0.41973439" style="opacity:1;fill:#b3b3b3;fill-opacity:1;stroke:none;stroke-width:1.0652703;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"></ellipse> <path d="m -48.496856,361.2635 -0.04389,-11.72569 1.440074,-1.3e-4 0.08425,11.71579 z" id="path979-1" style="opacity:1;fill:#784421;fill-opacity:1;stroke:#241f1c;stroke-width:0.80890197;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"></path> <path d="m -43.454722,356.07224 c 0,0 0.290315,3.65164 -3.424418,2.93043" id="path972-8-5-2" style="opacity:1;fill:none;fill-opacity:1;stroke:#241f1c;stroke-width:0.80890197;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"></path> <ellipse cx="-42.121109" cy="355.043" id="ellipse8165" rx="3.943758" ry="3.9453704" style="opacity:1;fill:#2ca02c;fill-opacity:1;stroke:#241f1c;stroke-width:1.01823282;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:0.98431373"></ellipse> <path d="m -50.663439,361.74623 h 6.222328" id="path8161" style="opacity:1;fill:none;fill-opacity:1;stroke:#241f1c;stroke-width:0.69471091;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"></path> <ellipse cx="-47.338188" cy="348.42407" id="path837-1-2" rx="6.9551096" ry="6.6850576" style="opacity:1;fill:#5fd35f;fill-opacity:1;stroke:#241f1c;stroke-width:1.01823282;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:0.98823529"></ellipse> <ellipse cx="-52.203609" cy="351.84134" id="ellipse8169" rx="3.943758" ry="3.9453704" style="opacity:1;fill:#37c837;fill-opacity:1;stroke:#241f1c;stroke-width:1.01823282;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:0.98431373"></ellipse> </g> </g></svg> `,
  ];

  const SLIDE_INTERVAL = 45000;

  const textElement = document.querySelector("#homeSliderText .highlight-text");
  const dots = document.querySelectorAll("#sliderDots .dot");

  if (!textElement || dots.length === 0 || !sliderContainer) {
    console.warn("Slider elements not found. Skipping slider init.");
    return;
  }

  let index = 0;
  let isPaused = false;

  function updateText(newIndex) {
    index = newIndex;
    console.debug('[slider] updateText start', { index, time: Date.now() });
    typingSessionId += 1;
    const thisSession = typingSessionId;
  
    const message = messages[index];
    const typingSpeed = 25;
  
    isTyping = true;
    textElement.innerHTML = "";
    gsap.killTweensOf(textElement);
  
    gsap.fromTo(
      textElement,
      { opacity: 0, scale: 0.95, y: 10 },
      {
        duration: 0.2,
        opacity: 1,
        scale: 1,
        y: 0,
        ease: "power2.out",
        onComplete: () => {
          typeHTMLString(textElement, message, typingSpeed, () => {
            isTyping = false;
            console.debug('[slider] typing complete', { index, time: Date.now() });
            const speedStats = calculateSpeeds(typingSpeed);
            console.log('✨ Home slider typing session completed. Speed stats:', speedStats);
            
            gsap.fromTo(textElement, { scale: 0.98 }, { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.5)" });
          });
        }
      }
    );
  
    dots.forEach((dot, i) => {
      const progress = dot.classList.contains("progress-dot") ? dot : dot.querySelector(".progress-dot");
      dot.classList.remove("active");
  
      if (progress) {
        progress.style.animation = "none";
        void progress.offsetWidth;
      }
  
      if (i === index) {
        dot.classList.add("active");
  
        if (progress) {
          progress.style.animation = "none";
          void progress.offsetWidth;
          progress.style.animation = `slide-progress ${SLIDE_INTERVAL / 1000}s linear forwards`;
        }
      }
    });
  }

  function nextText(force = false) {
    console.debug('[slider] nextText called', { isPaused, force, time: Date.now() });
    if (!isPaused || force) {
      index = (index + 1) % messages.length;
      updateText(index);
    }
  }
  
  function prevText(force = false) {
    if (!isPaused || force) {
      index = (index - 1 + messages.length) % messages.length;
      updateText(index);
    }
  }
  
  function restartInterval() {
    clearInterval(window.homeSliderIntervalId);
    if (!isPaused) {
      // ensure only one interval exists
      clearInterval(window.homeSliderIntervalId);
      window.homeSliderIntervalId = setInterval(nextText, SLIDE_INTERVAL);
      console.debug('[slider] interval (re)started', { SLIDE_INTERVAL, id: window.homeSliderIntervalId, time: Date.now() });
    }
  }

  updateText(index);
  // ensure no leftover interval, then start
  clearInterval(window.homeSliderIntervalId);
  window.homeSliderIntervalId = setInterval(nextText, SLIDE_INTERVAL);
  console.debug('[slider] interval started', { SLIDE_INTERVAL, id: window.homeSliderIntervalId, time: Date.now() });

  dots.forEach((dot, i) => {
    // hover effect
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
     
      setTimeout(() => {
        isPaused = false;
        restartInterval();
      }, SLIDE_INTERVAL);
    });
  });

  // Pause on hover
  sliderContainer.addEventListener("mouseenter", () => {
    clearInterval(window.homeSliderIntervalId);
  });

  sliderContainer.addEventListener("mouseleave", () => {
    if (!isPaused) {
      clearInterval(window.homeSliderIntervalId);
      clearInterval(window.homeSliderIntervalId);
      window.homeSliderIntervalId = setInterval(nextText, SLIDE_INTERVAL);
      console.debug('[slider] interval restarted on mouseleave', { SLIDE_INTERVAL, id: window.homeSliderIntervalId, time: Date.now() });
    }
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

  let lastClickTime = 0;
  sliderContainer.addEventListener("click", (event) => {
    const now = Date.now();
    if (now - lastClickTime < 200) return; 
    lastClickTime = now;

    const rect = sliderContainer.getBoundingClientRect();
    const clickX = event.clientX - rect.left;

    if (isTyping) {
      typingSessionId++; // 🔥 Cancel current typing
      isTyping = false;
      textElement.innerHTML = messages[index]; // 🧾 Show full message
      gsap.to(textElement, { scale: 1, duration: 0.2, ease: "power1.out" });
      return;
    }

    if (clickX < rect.width / 2) {
      prevText(true);
    } else {
      nextText(true);
    }

    restartInterval();
  });

  console.log("✅ Slider initialized with enhanced features");  
}

let currentPage = 'Home';
let isInitialLoad = true;

window.addEventListener('DOMContentLoaded', router);
window.addEventListener('hashchange', router);

function router() {
  const hash = window.location.hash || '#/Home';
  const page = hash.replace('#/', '') || 'Home';
  
  // If we are already on the target page and this isn't the first load, do nothing
  if (page === currentPage && !isInitialLoad) {
    return;
  }
  
  // Update state and load the page
  currentPage = page;
  isInitialLoad = false;
  window.loadPage(page);
}

window.toggleDrawerMenu = () => {
  const drawerMenu = document.getElementById('drawerMenu');
  const menuIcon = document.getElementById('menuIcon'); 
  const isOpen = drawerMenu.classList.contains('open');

  if (menuIcon) {
      menuIcon.classList.toggle('is-open');
  }

  if (isOpen) {
    drawerMenu.classList.remove('open');
    removeOverlayListener();
  } else {
    drawerMenu.classList.add('open');
    addOverlayListener();
  }
};

window.closeDrawerMenu = () => {
  const drawerMenu = document.getElementById('drawerMenu');
  const menuIcon = document.getElementById('menuIcon'); 

  drawerMenu.classList.remove('open');
  removeOverlayListener();

  if (menuIcon) {
      menuIcon.classList.remove('is-open');
  }
};

window.handleOutsideClick = (e) => {
  const drawer = document.getElementById('drawerMenu');
  const toggle = document.querySelector('.menu-toggle'); 
  if (!drawer.contains(e.target) && !toggle.contains(e.target)) {
    closeDrawerMenu();
  }
};

window.handleEscKey = (e) => {
  if (e.key === 'Escape') {
    closeDrawerMenu();
  }
};

window.addOverlayListener = () => {
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleEscKey);
};

window.removeOverlayListener = () => {
  document.removeEventListener('click', handleOutsideClick);
  document.removeEventListener('keydown', handleEscKey);
};

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
  if (!submenu) {
    console.warn(`toggleSubmenu: No element found with ID "${id}"`);
    return;
  }
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
      }, 300); // match the CSS transition duration
    } else {
      submenu.classList.add('open');
    }
  });
});

window.attachProfileEvents_coreTeam = () => {
  const profileData_coreTeam = [
    {name: 
      `<span class="intro-core"> Nguyễn Thị Ly </span> Có nền tảng học thuật vững chắc về <span class="highlight-text-phrase-core">quy hoạch đô thị</span>, <span class="highlight-text-phrase-core">phát triển đô thị bền vững</span>, <span class="highlight-text-phrase-core">quản lý cơ sở hạ tầng</span> và <span class="highlight-text-phrase-core">thiết kế không gian công cộng</span>. Đóng góp vào nhiều dự án nghiên cứu và hỗ trợ kỹ thuật tập trung vào không gian công cộng, phát triển cộng đồng và các chương trình phát triển đô thị. Thể hiện tinh thần làm việc nhóm tuyệt vời, kỹ năng tổ chức rõ ràng và tinh thần trách nhiệm cao. Chủ động, ham học hỏi và cam kết thúc đẩy chuyên môn thông qua việc tham gia vào các dự án đô thị ưu tiên các giải pháp <span class="highlight-text-phrase-core">bền vững</span> và thân thiện với môi trường.`, 
      img: "public/profilePhotos/lyly.png"
    },
    {
      name: `<span class="intro-core">Đinh Tùng Dương</span> Tôi có bằng <span class="highlight-text-phrase-core">Quản lý Đô thị</span> của Đại học Kiến trúc Hà Nội, nơi tôi vinh dự được vinh danh là <span class="highlight-text-phrase-core">Thủ khoa</span> của Hà Nội năm 2023. Trong hai năm qua, tôi đã tích cực đóng góp vào các dự án phát triển đô thị tập trung vào <span class="highlight-text-phrase-core">quy hoạch không gian</span>, <span class="highlight-text-phrase-core">cải thiện cảnh quan</span> và <span class="highlight-text-phrase-core">cuộc sống đô thị bền vững</span>. Tôi có khả năng <span class="highlight-text-phrase-core">phân tích</span> và <span class="highlight-text-phrase-core">tổ chức mạnh mẽ</span>, cùng với sự thành thạo trong cả phần mềm văn phòng và phần mềm kỹ thuật. Tôi cam kết phát triển chuyên môn liên tục và đặt mục tiêu đóng góp hiệu quả cho một tổ chức tiến bộ, có uy tín. `,
      img: "public/profilePhotos/duong.png"
    },
    {
      name: `<span class="intro-core">Trịnh Thị Tình </span> Tốt nghiệp chuyên ngành <span class="highlight-text-phrase-core">Quản trị kinh doanh</span> tại trường Cao đẳng Du lịch Hà Nội. Ngoài việc quản lý các công việc hành chính văn phòng, tôi còn đóng góp và hỗ trợ nhiều dự án nghiên cứu khoa học khác nhau. Tôi là một cá nhân năng động và có <span class="highlight-text-phrase-core">trách nhiệm</span>, luôn khao khát học hỏi và phát triển. Với tinh thần trách nhiệm cao, tôi coi trọng tinh thần làm việc theo nhóm và áp dụng kinh nghiệm tích lũy được để mang lại kết quả chất lượng. Tôi mong muốn phát triển sự nghiệp của mình hơn nữa trong một môi trường chuyên nghiệp, nơi tôi có thể đóng góp tích cực vào thành công của tổ chức.`,
      img: "public/profilePhotos/tinh.png"
    },
    {
      name: `<span class="intro-core">Nguyễn Quỳnh Ly </span> Tôi tốt nghiệp <span class="highlight-text-phrase-core">Đại học Kinh tế Quốc dân</span>, được đào tạo bài bản và có tinh thần trách nhiệm cao trong công việc. Tôi có kinh nghiệm <span class="highlight-text-phrase-core">đấu thầu các dự án máy móc thiết bị</span>, cũng như các dự án liên quan đến <span class="highlight-text-phrase-core">quy hoạch đô thị</span>. Ngoài ra, tôi có khả năng xử lý nhiều công việc hành chính khác nhau. Những vai trò này đã giúp tôi xây dựng được các kỹ năng chuyên môn và làm việc nhóm mạnh mẽ. Tôi mong muốn được làm việc trong một môi trường chuyên nghiệp, nơi tôi có thể áp dụng các khả năng của mình và đóng góp vào sự phát triển của tổ chức.`,
      img: "public/profilePhotos/nguyenquynhly.png"
    },
    {
      name: `<span class="intro-core">Phan Thị Hiến </span> Tốt nghiệp chuyên ngành <span class="highlight-text-phrase-core">kế toán</span> tại trường Đại học Mở Hà Nội. Hiện tại tôi đang làm việc trong lĩnh vực kế toán. Với kinh nghiệm, tôi đã tích lũy được nhiều kiến ​​thức và kỹ năng về <span class="highlight-text-phrase-core">kế toán</span>, <span class="highlight-text-phrase-core">báo cáo tài chính</span> và <span class="highlight-text-phrase-core">phân tích dữ liệu</span>. Tôi luôn chú trọng đến tính chính xác và minh bạch trong công việc. Ngoài ra, tôi còn có khả năng làm việc nhóm, giúp tôi phối hợp hiệu quả với các phòng ban khác. Tôi hy vọng sẽ tiếp tục phát triển sự nghiệp kế toán và đóng góp vào sự thành công của công ty.`,
      img: "public/profilePhotos/hien.png"
    },
  ];

  let currentIndex = 0;

  const textBox = document.getElementById('profile-text-coreTeam');
  const photo = document.getElementById('profile-photo-coreTeam');
  const container = document.getElementById('profile-text-coreTeam')?.parentElement;

  // Visual cues: add left/right overlays
  if (textBox && !document.getElementById('profile-cue-left-core')) {
    const leftCue = document.createElement('div');
    leftCue.id = 'profile-cue-left-core';
    leftCue.style.position = 'absolute';
    leftCue.style.left = 0;
    leftCue.style.top = 0;
    leftCue.style.width = '40%';
    leftCue.style.height = '100%';
    leftCue.style.pointerEvents = 'none';
    leftCue.style.display = 'flex';
    leftCue.style.alignItems = 'center';
    leftCue.style.justifyContent = 'flex-start';
    leftCue.style.zIndex = 2;
    leftCue.innerHTML = '<span style="font-size:2rem;opacity:0.25;margin-left:8px;user-select:none;">&#8592;</span>';
    textBox.style.position = 'relative';
    textBox.appendChild(leftCue);
    const rightCue = document.createElement('div');
    rightCue.id = 'profile-cue-right-core';
    rightCue.style.position = 'absolute';
    rightCue.style.right = 0;
    rightCue.style.top = 0;
    rightCue.style.width = '40%';
    rightCue.style.height = '100%';
    rightCue.style.pointerEvents = 'none';
    rightCue.style.display = 'flex';
    rightCue.style.alignItems = 'center';
    rightCue.style.justifyContent = 'flex-end';
    rightCue.style.zIndex = 2;
    rightCue.innerHTML = '<span style="font-size:2rem;opacity:0.25;margin-right:8px;user-select:none;">&#8594;</span>';
    textBox.appendChild(rightCue);
  }

  let typingSessionObj = { skip: false };
  let isTyping = false;
  let skipOnNextClick = false;

  window.updateProfile_coreTeam = (index, direction = 'right') => {
    if (!textBox || !photo) return;
    const isFirstLoad = (currentIndex === 0 && index === 0);
    if (!isFirstLoad) {
      textBox.classList.add(direction === 'right' ? 'slide-exit-left' : 'slide-exit-right');
      photo.classList.add(direction === 'right' ? 'slide-exit-left' : 'slide-exit-right');
    }
    setTimeout(() => {
      textBox.innerHTML = "";
      const message = profileData_coreTeam[index].name;
      const containerDiv = document.createElement("div");
      textBox.appendChild(containerDiv);
      typingSessionObj = { skip: false };
      isTyping = true;
      skipOnNextClick = false;
      typeHTMLString(containerDiv, message, 30, () => {
        gsap.fromTo(containerDiv, 
          { opacity: 0, y: 10, scale: 0.98 }, 
          { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power1.out" }
        );
        isTyping = false;
        skipOnNextClick = false;
      }, typingSessionObj);
      photo.src = profileData_coreTeam[index].img;
      textBox.classList.remove('slide-exit-left', 'slide-exit-right');
      photo.classList.remove('slide-exit-left', 'slide-exit-right');
      textBox.classList.remove('slide-enter-left', 'slide-enter-right');
      photo.classList.remove('slide-enter-left', 'slide-enter-right');
      const tl = gsap.timeline();
      if (isFirstLoad) {
        tl.fromTo(photo,
          { y: 100, scale: 0.25, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 1, ease: "power3.out" }
        );
        tl.fromTo(textBox,
          { y: -50, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: "bounce.out" },
          "-=0.8"
        );
      } else {
        tl.fromTo(photo,
          { y: 100, scale: 0.25, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 1, ease: "power3.out" }
        );
        tl.to(photo, {
          y: 10,
          duration: 0.3,
          ease: "power2.out"
        }, "-=0.4");
        tl.set(photo, { y: 10 });
        tl.fromTo(textBox,
          { x: direction === 'right' ? 100 : -100, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
          "-=0.5"
        );
      }
    }, isFirstLoad ? 0 : 800);
  };

  document.getElementById('core-next-btn')?.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % profileData_coreTeam.length;
    updateProfile_coreTeam(currentIndex, 'right');
  });

  document.getElementById('core-prev-btn')?.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + profileData_coreTeam.length) % profileData_coreTeam.length;
    updateProfile_coreTeam(currentIndex, 'left');
  });

  updateProfile_coreTeam(0);

  if (textBox) {
      const handleClick = (e) => {
        if (isTyping) {
          typingSessionObj.skip = true;
          return;
        }
      };
      textBox.addEventListener('click', handleClick);
    }

    if (textBox && isTruelyTouchDevice()) {
      const prevBtn = document.getElementById('core-prev-btn');
      const nextBtn = document.getElementById('core-next-btn');
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      
      const swipeTarget = container || textBox; 
      let swipeLocked = false;
      const MIN_SWIPE_DISTANCE = 25;
      
      let touchStartX = 0;
      let touchStartY = 0;

      swipeTarget.addEventListener('touchstart', (e) => {
        const touch = e.changedTouches[0];
        touchStartX = touch.screenX;
        touchStartY = touch.screenY;
      });

      swipeTarget.addEventListener('touchend', (e) => {
        if (swipeLocked) return;

        const touch = e.changedTouches[0];
        const touchEndX = touch.screenX;
        const touchEndY = touch.screenY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Ignore diagonal or mostly vertical swipes
        if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE || Math.abs(deltaX) < Math.abs(deltaY)) return;
          swipeLocked = true;
          if (deltaX > 0) {
            // Swipe right = previous profile
            currentIndex = (currentIndex - 1 + profileData_coreTeam.length) % profileData_coreTeam.length;
            updateProfile_coreTeam(currentIndex, 'left');
          } else if (deltaX < 0) {
            // Swipe left = next profile
            currentIndex = (currentIndex + 1) % profileData_coreTeam.length;
            updateProfile_coreTeam(currentIndex, 'right');
          }
          setTimeout(() => swipeLocked = false, 500);
      });
    }
  }


window.initLogoSlider = () => {
  const logoList = document.getElementById('logoList');
  if (!logoList) return;

  const sliderState = window.__logoSliderState || {
    rafId: null,
    isRunning: false,
    lastTs: 0,
    position: 0,
    speed: 1.75,
    isPaused: false,
    logoList: null,
    container: null,
    visibilityHandler: null
  };
  window.__logoSliderState = sliderState;

  // Always refresh references on SPA navigation.
  sliderState.logoList = logoList;
  sliderState.container = logoList.parentElement;

  const stopLoop = () => {
    sliderState.isRunning = false;
    if (sliderState.rafId) {
      cancelAnimationFrame(sliderState.rafId);
      sliderState.rafId = null;
    }
    sliderState.lastTs = 0;
  };

  // Stop any previous loop immediately so re-init always uses the latest DOM refs.
  stopLoop();

  const loop = (ts) => {
    if (!sliderState.isRunning) return;

    const list = sliderState.logoList;
    const container = sliderState.container;
    if (!list || !container || !document.body.contains(list) || !document.body.contains(container)) {
      stopLoop();
      return;
    }

    if (!document.hidden && !sliderState.isPaused) {
      const delta = sliderState.lastTs ? (ts - sliderState.lastTs) : 16.67;
      const step = delta / 16.67;
      sliderState.position -= sliderState.speed * step;
      const listWidth = list.scrollWidth;
      const containerWidth = container.offsetWidth;
      if (-sliderState.position >= listWidth) {
        sliderState.position = containerWidth;
      }
      list.style.transform = `translateX(${sliderState.position}px)`;
    }

    sliderState.lastTs = ts;
    sliderState.rafId = requestAnimationFrame(loop);
  };

  sliderState.isRunning = true;
  sliderState.rafId = requestAnimationFrame(loop);

  // Visibility handler (bind once) must not capture stale `loop`.
  if (!sliderState.visibilityHandler) {
    sliderState.visibilityHandler = () => {
      if (!document.hidden && sliderState.isRunning && !sliderState.rafId) {
        sliderState.rafId = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', sliderState.visibilityHandler);
  }

  // Pause on hover (bind once per container)
  if (sliderState.container && !sliderState.container.hasAttribute('data-logo-slider-hover-bound')) {
    sliderState.container.setAttribute('data-logo-slider-hover-bound', '1');
    sliderState.container.addEventListener('mouseenter', () => sliderState.isPaused = true);
    sliderState.container.addEventListener('mouseleave', () => sliderState.isPaused = false);
  }

  const arrowLeft = document.getElementById('arrowLeft');
  const arrowRight = document.getElementById('arrowRight');

  if (arrowLeft && !arrowLeft.hasAttribute('data-logo-slider-click-bound')) {
    arrowLeft.setAttribute('data-logo-slider-click-bound', '1');
    arrowLeft.addEventListener('click', () => { sliderState.speed = 1; sliderState.isPaused = false; });
  }
  if (arrowRight && !arrowRight.hasAttribute('data-logo-slider-click-bound')) {
    arrowRight.setAttribute('data-logo-slider-click-bound', '1');
    arrowRight.addEventListener('click', () => { sliderState.speed = -1; sliderState.isPaused = false; });
  }
};

// ===================
// News Slider (Mobile Only)
// ===================
window.initMobileNewsSlider = () => {
  const cards = document.querySelectorAll(".card.image-card");
  const gridContainer = document.querySelector("main.grid");
  if (!cards.length || !gridContainer) return;

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const storageKey = 'newsSliderIndex';
  const state = window.__newsSliderState || {
    resizeBound: false,
    touchBound: false,
    sliderWrapper: null,
    sliderTrack: null,
    dragFrame: null,
    isDragging: false,
    lastDragOffset: 0
  };
  window.__newsSliderState = state;

  const cardCount = cards.length;
  const stepPercent = 100 / cardCount;
  let currentIndex = Math.max(0, Math.min(cardCount - 1, parseInt(localStorage.getItem(storageKey)) || 0));
  let startX = 0;
  let startY = 0;

  const bindTouch = () => {
    if (!isTouchDevice || state.touchBound || !state.sliderWrapper) return;
    state.sliderWrapper.addEventListener("touchstart", handleTouchStart, { passive: true });
    state.sliderWrapper.addEventListener("touchmove", handleTouchMove, { passive: false });
    state.sliderWrapper.addEventListener("touchend", handleTouchEnd, { passive: true });
    state.touchBound = true;
  };

  const unbindTouch = () => {
    if (!state.sliderWrapper || !state.touchBound) return;
    state.sliderWrapper.removeEventListener("touchstart", handleTouchStart);
    state.sliderWrapper.removeEventListener("touchmove", handleTouchMove);
    state.sliderWrapper.removeEventListener("touchend", handleTouchEnd);
    state.touchBound = false;
  };

  const ensureWrapper = () => {
    if (state.sliderWrapper) return;

    state.sliderWrapper = document.createElement('div');
    state.sliderWrapper.className = 'slider-wrapper';
    Object.assign(state.sliderWrapper.style, {
      position: 'relative',
      width: '100%',
      height: 'auto',
      overflow: 'hidden'
    });

    state.sliderTrack = document.createElement('div');
    state.sliderTrack.className = 'slider-track';
    Object.assign(state.sliderTrack.style, {
      display: 'flex',
      width: `${cardCount * 100}%`,
      transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: `translateX(0%)`,
      willChange: 'transform'
    });

    cards.forEach(card => {
      const cardWrapper = document.createElement('div');
      cardWrapper.className = 'card-wrapper';
      Object.assign(cardWrapper.style, {
        width: `${stepPercent}%`,
        flexShrink: '0',
        display: 'flex',
        justifyContent: 'center'
      });
      cardWrapper.appendChild(card);
      state.sliderTrack.appendChild(cardWrapper);
    });

    state.sliderWrapper.appendChild(state.sliderTrack);
    gridContainer.prepend(state.sliderWrapper);
  };

  const cleanupWrapper = () => {
    unbindTouch();
    if (state.sliderWrapper) {
      state.sliderWrapper.remove();
      state.sliderWrapper = null;
      state.sliderTrack = null;
    }
    cards.forEach(card => gridContainer.appendChild(card));
  };

  function updateSlider() {
    const isMobile = window.innerWidth <= 1440 && isTouchDevice;

    if (isMobile) {
      gridContainer.style.display = "flex";
      gridContainer.style.flexDirection = "column";
      gridContainer.style.alignItems = "center";
      gridContainer.style.overflow = "hidden";
      gridContainer.style.touchAction = "pan-y";

      ensureWrapper();
      bindTouch();

      if (state.sliderTrack) {
        state.sliderTrack.style.transform = `translateX(-${currentIndex * stepPercent}%)`;
      }
    } else {
      cleanupWrapper();
      gridContainer.style.display = "grid";
      gridContainer.style.flexDirection = "";
      gridContainer.style.alignItems = "";
      gridContainer.style.overflow = "";
      gridContainer.style.touchAction = "";
    }
  }

  function handleTouchStart(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    state.isDragging = true;
  }

  function handleTouchMove(e) {
    if (!state.isDragging || !state.sliderTrack) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = Math.abs(currentX - startX);
    const deltaY = Math.abs(currentY - startY);

    if (deltaX > deltaY) {
      e.preventDefault();
    }

    const dragOffset = (currentX - startX) / window.innerWidth * 100;
    state.lastDragOffset = dragOffset;

    if (!state.dragFrame) {
      state.dragFrame = requestAnimationFrame(() => {
        const baseTransform = -currentIndex * stepPercent;
        state.sliderTrack.style.transition = 'none';
        state.sliderTrack.style.transform = `translateX(${baseTransform + state.lastDragOffset}%)`;
        state.dragFrame = null;
      });
    }
  }

  function handleTouchEnd(e) {
    state.isDragging = false;
    if (!state.sliderTrack) return;

    const endX = e.changedTouches[0].clientX;
    const deltaX = endX - startX;

    state.sliderTrack.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    const swipeThreshold = 30;
    let newIndex = currentIndex;

    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX < 0 && currentIndex < cardCount - 1) {
        newIndex = currentIndex + 1;
      } else if (deltaX > 0 && currentIndex > 0) {
        newIndex = currentIndex - 1;
      }
    }

    currentIndex = newIndex;
    const finalTransform = -currentIndex * stepPercent;
    state.sliderTrack.style.transform = `translateX(${finalTransform}%)`;
    localStorage.setItem(storageKey, currentIndex.toString());
  }

  updateSlider();
  if (!state.resizeBound) {
    state.resizeBound = true;
    window.addEventListener("resize", updateSlider, { passive: true });
  }
};

// Re-attach the init on DOM load
document.addEventListener("DOMContentLoaded", () => {
  window.initMobileNewsSlider();
});

window.OrgStructure = {
    showTab: function(tabName) {
        const tabContents = document.querySelectorAll('.tab-content');
          tabContents.forEach(content => content.classList.remove('active'));
                
                // Remove active class from all tabs
                const tabs = document.querySelectorAll('.tab');
                tabs.forEach(tab => tab.classList.remove('active'));
                
                // Show selected tab content
                document.getElementById(tabName).classList.add('active');
                
                // Add active class to clicked tab
                event.target.classList.add('active');
            },

            downloadDocument: function(docName) {
                // Handle direct file paths (like 'public/files/...')
                if (docName.includes('/') || docName.includes('.')) {
                    const link = document.createElement('a');
                    link.href = docName;
                    link.download = docName.split('/').pop(); // Get filename from path
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    return;
                }
                
                const filePath = documentMap[docName];
                if (filePath) {
                    const link = document.createElement('a');
                    link.href = filePath;
                    link.download = filePath.split('/').pop();
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    alert(`Document "${docName}" not found. Please check if the file exists.`);
                }
            },

            searchDocuments: function(searchTerm) {
                const categories = document.querySelectorAll('.document-category');
                const searchLower = searchTerm.toLowerCase();
                
                categories.forEach(category => {
                    const items = category.querySelectorAll('.document-list li');
                    let hasVisibleItems = false;
                    
                    items.forEach(item => {
                        const text = item.textContent.toLowerCase();
                        if (text.includes(searchLower)) {
                            item.style.display = 'block';
                            hasVisibleItems = true;
                        } else {
                            item.style.display = 'none';
                        }
                    });
                    
                    category.style.display = hasVisibleItems || searchTerm === '' ? 'block' : 'none';
                });
            }
        };
    window.showTab = window.OrgStructure.showTab;
    window.downloadDocument = window.OrgStructure.downloadDocument;
    window.searchDocuments = window.OrgStructure.searchDocuments;

  window.initMobileProjectsSlider = () => {
      const cards = document.querySelectorAll(".card.image-card");
      const gridContainer = document.querySelector("main.grid");
      if (!cards.length || !gridContainer) return;
    
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const storageKey = 'projectsSliderIndex';
      const state = window.__projectsSliderState || {
        resizeBound: false,
        touchBound: false,
        sliderWrapper: null,
        sliderTrack: null,
        dragFrame: null,
        isDragging: false,
        lastDragOffset: 0
      };
      window.__projectsSliderState = state;

      const cardCount = cards.length;
      const stepPercent = 100 / cardCount;
      let currentIndex = Math.max(0, Math.min(cardCount - 1, parseInt(localStorage.getItem(storageKey)) || 0));
      let startX = 0;
      let startY = 0;

      const bindTouch = () => {
        if (!isTouchDevice || state.touchBound || !state.sliderWrapper) return;
        state.sliderWrapper.addEventListener("touchstart", handleTouchStart, { passive: true });
        state.sliderWrapper.addEventListener("touchmove", handleTouchMove, { passive: false });
        state.sliderWrapper.addEventListener("touchend", handleTouchEnd, { passive: true });
        state.touchBound = true;
      };

      const unbindTouch = () => {
        if (!state.sliderWrapper || !state.touchBound) return;
        state.sliderWrapper.removeEventListener("touchstart", handleTouchStart);
        state.sliderWrapper.removeEventListener("touchmove", handleTouchMove);
        state.sliderWrapper.removeEventListener("touchend", handleTouchEnd);
        state.touchBound = false;
      };

      const ensureWrapper = () => {
        if (state.sliderWrapper) return;

        state.sliderWrapper = document.createElement('div');
        state.sliderWrapper.className = 'slider-wrapper';
        Object.assign(state.sliderWrapper.style, {
          position: 'relative',
          width: '100%',
          height: 'auto',
          overflow: 'hidden'
        });

        state.sliderTrack = document.createElement('div');
        state.sliderTrack.className = 'slider-track';
        Object.assign(state.sliderTrack.style, {
          display: 'flex',
          width: `${cardCount * 100}%`,
          transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: `translateX(0%)`,
          willChange: 'transform'
        });

        cards.forEach(card => {
          const cardWrapper = document.createElement('div');
          cardWrapper.className = 'card-wrapper';
          Object.assign(cardWrapper.style, {
            width: `${stepPercent}%`,
            flexShrink: '0',
            display: 'flex',
            justifyContent: 'center'
          });
          cardWrapper.appendChild(card);
          state.sliderTrack.appendChild(cardWrapper);
        });

        state.sliderWrapper.appendChild(state.sliderTrack);
        gridContainer.prepend(state.sliderWrapper);
      };

      const cleanupWrapper = () => {
        unbindTouch();
        if (state.sliderWrapper) {
          state.sliderWrapper.remove();
          state.sliderWrapper = null;
          state.sliderTrack = null;
        }
        cards.forEach(card => gridContainer.appendChild(card));
      };

      function updateSlider() {
        const isMobile = window.innerWidth <= 1440 && isTouchDevice;

        if (isMobile) {
          gridContainer.style.display = "flex";
          gridContainer.style.flexDirection = "column";
          gridContainer.style.alignItems = "center";
          gridContainer.style.overflow = "hidden";
          gridContainer.style.touchAction = "pan-y";

          ensureWrapper();
          bindTouch();

          if (state.sliderTrack) {
            state.sliderTrack.style.transform = `translateX(-${currentIndex * stepPercent}%)`;
          }
        } else {
          cleanupWrapper();
          gridContainer.style.display = "grid";
          gridContainer.style.flexDirection = "";
          gridContainer.style.alignItems = "";
          gridContainer.style.overflow = "";
          gridContainer.style.touchAction = "";
        }
      }

      function handleTouchStart(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        state.isDragging = true;
      }

      function handleTouchMove(e) {
        if (!state.isDragging || !state.sliderTrack) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = Math.abs(currentX - startX);
        const deltaY = Math.abs(currentY - startY);

        if (deltaX > deltaY) {
          e.preventDefault();
        }

        const dragOffset = (currentX - startX) / window.innerWidth * 100;
        state.lastDragOffset = dragOffset;

        if (!state.dragFrame) {
          state.dragFrame = requestAnimationFrame(() => {
            const baseTransform = -currentIndex * stepPercent;
            state.sliderTrack.style.transition = 'none';
            state.sliderTrack.style.transform = `translateX(${baseTransform + state.lastDragOffset}%)`;
            state.dragFrame = null;
          });
        }
      }

      function handleTouchEnd(e) {
        state.isDragging = false;
        if (!state.sliderTrack) return;

        const endX = e.changedTouches[0].clientX;
        const deltaX = endX - startX;

        state.sliderTrack.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

        const swipeThreshold = 30;
        let newIndex = currentIndex;

        if (Math.abs(deltaX) > swipeThreshold) {
          if (deltaX < 0 && currentIndex < cardCount - 1) {
            newIndex = currentIndex + 1;
          } else if (deltaX > 0 && currentIndex > 0) {
            newIndex = currentIndex - 1;
          }
        }

        currentIndex = newIndex;
        const finalTransform = -currentIndex * stepPercent;
        state.sliderTrack.style.transform = `translateX(${finalTransform}%)`;
        localStorage.setItem(storageKey, currentIndex.toString());
      }

      updateSlider();
      if (!state.resizeBound) {
        state.resizeBound = true;
        window.addEventListener("resize", updateSlider, { passive: true });
      }
    };

document.addEventListener("DOMContentLoaded", () => {
  window.initMobileProjectsSlider();
});

window.isAndroid = function () {
  var isAndroid =
    /Android/i.test(navigator.userAgent) ||
    (navigator.userAgentData && navigator.userAgentData.platform === 'Android');

  if (isAndroid) {
    document.documentElement.classList.add('ua-android');
  }
}

window.isAndroid();


window.initFrequentlyAskedQuestions = function() {
    let currentOpenCategory = null; // Track currently open category
      const faqData = {
          services: [
              { q: "Câu hỏi - Bạn cung cấp những loại dịch vụ tư vấn nào?", a: "Trả lời: Chúng tôi cung cấp tư vấn về lập kế hoạch, thiết kế, quản lý dự án, giám sát và hỗ trợ thủ tục pháp lý." },
              { q: "Câu hỏi - Bạn có nhận các dự án nhà ở nhỏ không?", a: "Trả lời: Có, chúng tôi xử lý từ nhà ở dân dụng đến các công trình thương mại và công nghiệp." }
          ],
          process: [
              { q: "Câu hỏi - Quy trình hợp tác như thế nào?", a: "Trả lời: Quy trình gồm: tư vấn ban đầu → khảo sát hiện trường → thiết kế sơ bộ → hoàn thiện bản vẽ → hỗ trợ thi công." },
              { q: "Câu hỏi - Tôi có thể chỉnh sửa thiết kế trong quá trình thực hiện không?", a: "Trả lời: Có, khách hàng có quyền yêu cầu chỉnh sửa ở các giai đoạn khác nhau trước khi hoàn tất bản vẽ." }
          ],
          costs: [
              { q: "Câu hỏi - Phí dịch vụ được tính như thế nào?", a: "Trả lời: Phí có thể tính theo gói, theo % tổng vốn đầu tư hoặc theo giờ tùy loại dự án." },
              { q: "Câu hỏi - Bạn có cho phép thanh toán theo đợt không?", a: "Trả lời: Có, chúng tôi chấp nhận thanh toán linh hoạt theo từng giai đoạn dự án." }
          ],
          legal: [
              { q: "Câu hỏi - Bạn có hỗ trợ xin giấy phép xây dựng không?", a: "Trả lời: Có, chúng tôi hỗ trợ đầy đủ từ chuẩn bị hồ sơ đến nộp cho cơ quan chức năng." },
              { q: "Câu hỏi - Khách hàng cần cung cấp những giấy tờ gì?", a: "Trả lời: Thường là: giấy chứng nhận quyền sử dụng đất, bản vẽ hiện trạng và các giấy tờ pháp lý liên quan." }
          ],
          timeline: [
              { q: "Câu hỏi - Bao lâu để hoàn thành một dự án?", a: "Trả lời: Tùy quy mô, thường 2-6 tháng cho thiết kế và 6-18 tháng cho thi công." },
              { q: "Câu hỏi - Nếu dự án bị chậm tiến độ thì sao?", a: "Trả lời: Chúng tôi sẽ báo cáo ngay, đề xuất giải pháp và cam kết đuổi tiến độ khi có thể." }
          ],
          technology: [
              { q: "Câu hỏi - Bạn có sử dụng công nghệ BIM không?", a: "Trả lời: Có, chúng tôi sử dụng BIM và mô hình 3D để giúp khách hàng hình dung thiết kế rõ ràng." },
              { q: "Câu hỏi - Bạn có cung cấp các giải pháp thiết kế xanh không?", a: "Trả lời: Có, chúng tôi ưu tiên vật liệu bền vững và giải pháp tiết kiệm năng lượng." }
          ],
          clients: [
              { q: "Câu hỏi - Khách hàng chính của bạn là ai?", a: "Trả lời: Chúng tôi phục vụ cá nhân, doanh nghiệp và cơ quan nhà nước." },
              { q: "Câu hỏi - Bạn có hỗ trợ bảo trì sau khi bàn giao không?", a: "Trả lời: Có, chúng tôi cung cấp dịch vụ hậu mãi và bảo trì theo yêu cầu." }
          ],
          general: [
              { q: "Câu hỏi - Tôi có thể xem các dự án trước đây của bạn không?", a: "Trả lời: Có, vui lòng liên hệ để nhận danh mục và danh sách dự án của chúng tôi." },
              { q: "Câu hỏi - Cách nhanh nhất để liên hệ với bạn là gì?", a: "Trả lời: Bạn có thể gọi trực tiếp hotline hoặc gửi email, chúng tôi sẽ phản hồi trong vòng 24 giờ." }
          ]
      };

      // Expose FAQ data for the chatbot / search features
      try {
        window.__icueFaqData = faqData;
        window.__icueFaqLang = 'vi';
      } catch (e) {
        // ignore
      }

      
      function openCategory(category) {
            // Find the clicked card first
            const clickedCard = event.target.closest('.faq-card');
            
            // Clear any existing answers with animation
            const existingAnswers = document.querySelectorAll('.faq-answer-section');
            if (existingAnswers.length > 0) {
                gsap.to(existingAnswers, {
                    duration: 0.3,
                    height: 0,
                    opacity: 0,
                    ease: "power2.inOut",
                    onComplete: () => {
                        existingAnswers.forEach(section => section.remove());
                    }
                });
            }
            
            // Remove active state from all cards with animation
            const allCards = document.querySelectorAll('.faq-card');
            gsap.to(allCards, {
                duration: 0.2,
                scale: 1,
                ease: "power2.out",
                onComplete: () => {
                    allCards.forEach(card => card.classList.remove('active'));
                }
            });
            
            // If clicking the same category that's already open, just close it
            if (currentOpenCategory === category) {
                currentOpenCategory = null;
                return;
            }
            
            // Set new current category
            currentOpenCategory = category;
            
            if (faqData[category] && clickedCard) {
                // Animate clicked card
                gsap.to(clickedCard, {
                    duration: 0.3,
                    scale: 1.02,
                    ease: "back.out(1.7)",
                    onComplete: () => {
                        clickedCard.classList.add('active');
                    }
                });
                
                // Create the FAQ section
                const section = document.createElement("div");
                section.classList.add("faq-answer-section");
                
                // Set initial state for animation
                gsap.set(section, {
                    height: 0,
                    opacity: 0,
                    overflow: "hidden"
                });
                
                faqData[category].forEach((item, index) => {
                    const div = document.createElement("div");
                    div.classList.add("faq-answer");
                    div.innerHTML = `
                        <h4 class="faq-question" onclick="toggleAnswer(this)">${item.q}</h4>
                        <div class="faq-answer-text" style="display: none;">${item.a}</div>
                    `;
                    
                    // Set initial animation state for each FAQ item
                    gsap.set(div, {
                        y: 20,
                        opacity: 0
                    });
                    
                    section.appendChild(div);
                });
                
                // Insert the section after the clicked card
                clickedCard.insertAdjacentElement('afterend', section);
                
                // Animate section appearance
                gsap.to(section, {
                    duration: 0.5,
                    height: "auto",
                    opacity: 1,
                    ease: "power2.out",
                    delay: 0.1
                });
                
                // Stagger animate FAQ items
                const faqItems = section.querySelectorAll('.faq-answer');
                gsap.to(faqItems, {
                    duration: 0.4,
                    y: 0,
                    opacity: 1,
                    ease: "power2.out",
                    stagger: 0.1,
                    delay: 0.3
                });
            }
        }
    
        function toggleAnswer(el) {
            const p = el.nextElementSibling;
            if (p && p.classList.contains('faq-answer-text')) {
                const isOpen = p.style.display === "block";
                
                if (isOpen) {
                    // Closing animation
                    gsap.to(p, {
                        duration: 0.3,
                        height: 0,
                        opacity: 0,
                        ease: "power2.inOut",
                        onComplete: () => {
                            p.style.display = "none";
                            p.style.height = "auto"; // Reset height for next opening
                        }
                    });
                    
                    // Animate question
                    gsap.to(el, {
                        duration: 0.2,
                        scale: 1,
                        backgroundColor: "#fff",
                        ease: "power2.out"
                    });
                } else {
                    // Opening animation
                    p.style.display = "block";
                    gsap.set(p, { height: 0, opacity: 0 });
                    
                    gsap.to(p, {
                        duration: 0.4,
                        height: "auto",
                        opacity: 1,
                        ease: "power2.out"
                    });
                    
                    // Animate question
                    gsap.to(el, {
                        duration: 0.2,
                        scale: 1.01,
                        backgroundColor: "#bbdefb",
                        ease: "back.out(1.7)"
                    });
                }
                
                // Toggle expanded class
                el.classList.toggle('expanded');
            }
        }
      
          // Make functions globally available
          window.openCategory = openCategory;
          window.toggleAnswer = toggleAnswer;
      
          return {
              openCategory,
              toggleAnswer
          };
      };

window.JobBoard = (function() {
  'use strict';
  
  const jobPositions = [
    {
        title: "Trợ lý trưởng phòng công nghệ",
        department: "Công nghệ",
        location: "Hà Nội, Việt Nam",
        description: "Chúng tôi đang tìm một chuyên gia am hiểu công nghệ, tổ chức tốt để hỗ trợ CTO và đội ngũ lãnh đạo công nghệ. Giúp quản lý dự án, tối ưu quy trình làm việc và đảm bảo các nhóm kỹ thuật vận hành trơn tru.",
        tags: ["JavaScript", "Giao tiếp và tổ chức tốt", "Chủ động, tư duy giải quyết vấn đề", "Toàn thời gian"]
    },
    {
        title: "Thực tập sinh nghiên cứu",
        department: "Hành chính",
        location: "Hà Nội, Việt Nam",
        description: "Tham gia cùng chúng tôi để khám phá công nghệ mới, hỗ trợ các dự án sáng tạo và học hỏi từ các chuyên gia hàng đầu trong lĩnh vực.",
        tags: ["Tò mò và đam mê nghiên cứu", "Kỹ năng phân tích và giải quyết vấn đề tốt", "Sẵn sàng học hỏi và đóng góp"]
    },
    {
        title: "Chuyên viên phân tích dữ liệu",
        department: "Dữ liệu & Phân tích",
        location: "TP. Hồ Chí Minh, Việt Nam",
        description: "Phân tích dữ liệu năng lượng để tối ưu hiệu suất và dự đoán xu hướng. Sử dụng Python, SQL và các công cụ học máy.",
        tags: ["Python", "SQL", "Machine Learning", "Phân tích", "Toàn thời gian"]
    }
  ];

  // Function to highlight search terms in text
  function highlightSearchTerms(text, searchTerm) {
      if (!searchTerm) return text;
      
      const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // Function to remove highlights
  function removeHighlights() {
      const highlights = document.querySelectorAll('.search-highlight');
      highlights.forEach(highlight => {
          const parent = highlight.parentNode;
          parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
          parent.normalize();
      });
  }

  // Function to render job positions with optional highlighting
  function renderJobs(jobs, searchTerm = '') {
      const jobsContainer = document.getElementById('jobs-container');
      if (!jobsContainer) {
          if (window.location.hash && window.location.hash.toLowerCase().includes('career')) {
              console.error('Jobs container not found');
          }
          return;
      }
      
      jobsContainer.innerHTML = '';

      jobs.forEach(job => {
          const jobCard = document.createElement('div');
          jobCard.className = 'job-card';
          jobCard.onclick = () => openJobDetail(job);
          
          // Apply highlighting if search term exists
          const highlightedTitle = highlightSearchTerms(job.title, searchTerm);
          const highlightedDepartment = highlightSearchTerms(job.department, searchTerm);
          const highlightedDescription = highlightSearchTerms(job.description, searchTerm);
          const highlightedTags = job.tags.map(tag => highlightSearchTerms(tag, searchTerm));
          
          jobCard.innerHTML = `
              <h3 class="job-title">${highlightedTitle}</h3>
              <div class="job-department">${highlightedDepartment}</div>
              <div class="job-location"><svg width="16px" height="16px" viewBox="-3 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>pin_sharp_circle [#624]</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <g id="Dribbble-Light-Preview" transform="translate(-223.000000, -5439.000000)" fill="#000000"> <g id="icons" transform="translate(56.000000, 160.000000)"> <path d="M176,5286.219 C176,5287.324 175.105,5288.219 174,5288.219 C172.895,5288.219 172,5287.324 172,5286.219 C172,5285.114 172.895,5284.219 174,5284.219 C175.105,5284.219 176,5285.114 176,5286.219 M174,5296 C174,5296 169,5289 169,5286 C169,5283.243 171.243,5281 174,5281 C176.757,5281 179,5283.243 179,5286 C179,5289 174,5296 174,5296 M174,5279 C170.134,5279 167,5282.134 167,5286 C167,5289.866 174,5299 174,5299 C174,5299 181,5289.866 181,5286 C181,5282.134 177.866,5279 174,5279" id="pin_sharp_circle-[#624]"> </path> </g> </g> </g> </g></svg>${job.location}</div>
              <div class="job-description">${highlightedDescription}</div>
              <div class="job-tags">
                  ${highlightedTags.map(tag => `<span class="job-tag">${tag}</span>`).join('')}
              </div>
          `;
          
          jobsContainer.appendChild(jobCard);
      });
  }

  // Function to search jobs with highlighting and auto-scroll
  function searchJobs(event) {
      event.preventDefault();
      const searchInput = document.getElementById('job-search');
      const searchTerm = searchInput.value.toLowerCase().trim();
      
      // Clear search message
      const existingMessage = document.querySelector('.search-result-message');
      if (existingMessage) {
          existingMessage.remove();
      }
      
      if (!searchTerm) {
          // If search is cleared, remove highlights and show all jobs
          removeHighlights();
          renderJobs(jobPositions);
          return;
      }

      // Filter jobs based on search term
      const filteredJobs = jobPositions.filter(job => 
          job.title.toLowerCase().includes(searchTerm) ||
          job.department.toLowerCase().includes(searchTerm) ||
          job.description.toLowerCase().includes(searchTerm) ||
          job.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );

      // Render jobs with highlighting
      renderJobs(filteredJobs, searchTerm);
      
      // Scroll to jobs section if matches found
      if (filteredJobs.length > 0) {
          const jobsSection = document.getElementById('open-positions') || 
                             document.getElementById('jobs-container') || 
                             document.querySelector('.jobs-section');
          
          if (jobsSection) {
              setTimeout(() => {
                  jobsSection.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start'
                  });
              }, 100); // Small delay to ensure rendering is complete
          }
      }
      
      // Show search results message
      const resultMessage = filteredJobs.length === 0 
          ? `Không tìm thấy vị trí nào cho "${searchInput.value}"`
          : `Tìm thấy ${filteredJobs.length} vị trí phù hợp với "${searchInput.value}"`;
          
      showSearchMessage(resultMessage);
  }

  // Function to clear search and remove highlights
  function clearSearch() {
      const searchInput = document.getElementById('job-search');
      if (searchInput) {
          searchInput.value = '';
      }
      
      // Remove highlights and show all jobs
      removeHighlights();
      renderJobs(jobPositions);
      
      // Clear search message
      const existingMessage = document.querySelector('.search-result-message');
      if (existingMessage) {
          existingMessage.remove();
      }
  }

  // Function to show search message
  function showSearchMessage(message) {
      const existingMessage = document.querySelector('.search-result-message');
      if (existingMessage) {
          existingMessage.remove();
      }

      const messageDiv = document.createElement('div');
      messageDiv.className = 'search-result-message';
      messageDiv.style.cssText = `
          text-align: center;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          margin: 20px 0;
          color: #666;
          font-weight: 500;
      `;
      messageDiv.textContent = message;

      const jobsContainer = document.getElementById('jobs-container');
      jobsContainer.parentNode.insertBefore(messageDiv, jobsContainer);
  }

  // Initialize jobs on page load
  function initialize() {
      renderJobs(jobPositions);
      
      // Set up search functionality
      const searchInput = document.getElementById('job-search');
      const searchForm = document.querySelector('.job-search-form') || document.querySelector('form');
      
      if (searchInput) {
          // Handle search on form submit
          if (searchForm) {
              searchForm.addEventListener('submit', searchJobs);
          }
          
          // Handle search on input change (real-time search)
          searchInput.addEventListener('input', function(e) {
              // Add slight delay for better performance
              clearTimeout(this.searchTimeout);
              this.searchTimeout = setTimeout(() => {
                  searchJobs(e);
              }, 300);
          });
          
          // Clear search when input is emptied
          searchInput.addEventListener('keyup', function(e) {
              if (e.target.value === '') {
                  clearSearch();
              }
          });
      }
      
      const ctaButton = document.querySelector('.cta-button');
      if (ctaButton) {
          ctaButton.addEventListener('click', function(e) {
              e.preventDefault();
              const openPositions = document.getElementById('open-positions');
              if (openPositions) {
                  openPositions.scrollIntoView({
                      behavior: 'smooth'
                  });
              }
          });
      }
      
      // Add CSS for search highlighting if not already present
      if (!document.getElementById('job-search-highlight-styles')) {
          const style = document.createElement('style');
          style.id = 'job-search-highlight-styles';
          style.textContent = `
              .search-highlight {
                  background-color: #ffeb3b;
                  color: #000;
                  padding: 2px 4px;
                  border-radius: 3px;
                  font-weight: bold;
              }
              
              .search-result-message {
                  animation: slideIn 0.3s ease-out;
              }
              
              @keyframes slideIn {
                  from {
                      opacity: 0;
                      transform: translateY(-10px);
                  }
                  to {
                      opacity: 1;
                      transform: translateY(0);
                  }
              }
          `;
          document.head.appendChild(style);
      }
  }

  // Public API - expose these functions globally
  return {
      init: initialize,
      renderJobs: renderJobs,
      searchJobs: searchJobs,
      clearSearch: clearSearch,
      highlightSearchTerms: highlightSearchTerms,
      removeHighlights: removeHighlights,
      getJobPositions: () => [...jobPositions], // Return a copy to prevent mutation
      addJob: (job) => {
          jobPositions.push(job);
          renderJobs(jobPositions);
      },
      removeJob: (title) => {
          const index = jobPositions.findIndex(job => job.title === title);
          if (index > -1) {
              jobPositions.splice(index, 1);
              renderJobs(jobPositions);
          }
      }
  };
})();

// Make JobBoard functions globally accessible for HTML event handlers
window.searchJobs = function(event) {
  if (window.JobBoard && window.JobBoard.searchJobs) {
      return window.JobBoard.searchJobs(event);
  }
};

window.clearJobSearch = function() {
  if (window.JobBoard && window.JobBoard.clearSearch) {
      return window.JobBoard.clearSearch();
  }
};

document.addEventListener('DOMContentLoaded', function() {
  if (window.JobBoard) {
      window.JobBoard.init();
  }
});

window.DonationForm = (function () {
  let selectedAmount = '200,000';
  let selectedFrequency = "monthly";

  function selectAmount(button, amount) {
    document.querySelectorAll('.amount-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    button.classList.add('active');

    // Update selected amount
    selectedAmount = amount;
    const donateAmountElement = document.getElementById('donateAmount');
    if (donateAmountElement) {
      donateAmountElement.textContent = amount;
    }

    // Clear custom amount input if it exists
    const customAmountInput = document.getElementById('customAmount');
    if (customAmountInput) {
      customAmountInput.value = '';
    }
  }

  // Function to update custom amount
  function updateCustomAmount(input) {
    const customAmount = parseInt(input.value);
    if (customAmount && customAmount > 0) {
      document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      
      selectedAmount = customAmount;
      const donateAmountElement = document.getElementById('donateAmount');
      if (donateAmountElement) {
        donateAmountElement.textContent = customAmount;
      }
    }
  }

  // Function to select donation frequency
  function selectFrequency(option, frequency) {
    // Remove active class from all frequency options
    document.querySelectorAll('.donation-option').forEach(opt => {
      opt.classList.remove('active');
    });

    // Add active class to clicked option
    option.classList.add('active');

    // Update selected frequency
    selectedFrequency = frequency;
  }

  // Function to process donation
  function processDonation(event) {
    event.preventDefault();

    // Get form data
    const formData = new FormData(event.target);
    const donationData = {
      amount: selectedAmount,
      frequency: selectedFrequency,
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      company: formData.get('company')
    };

    // Validate required fields
    if (!donationData.firstName || !donationData.lastName || !donationData.email) {
      alert('Please fill in all required fields.');
      return;
    }

    // Validate amount
    if (!selectedAmount || selectedAmount <= 0) {
      alert('Please select a valid donation amount.');
      return;
    }

    // Stripe Integration - Create checkout session and redirect
    fetch('/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(donationData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(session => {
      // Redirect to Stripe Checkout
      window.location.href = session.url;
    })
    .catch(error => {
      console.error('Error:', error);
      alert('Quyên Góp Sẽ Được Kích Hoạt Trong Vài Tháng Tới.');
    });

    console.log('Donation data:', donationData);
  }

  // Initialize page
  function init() {
    // Check if donateAmount element exists before trying to set its content
    const donateAmountElement = document.getElementById('donateAmount');
    if (donateAmountElement) {
      donateAmountElement.textContent = selectedAmount;
    }

    // Add hover effects to cards
    const cards = document.querySelectorAll('.award-card, .project-card');
    cards.forEach(card => {
      card.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-2.5px)';
      });
      card.addEventListener('mouseleave', function () {
        this.style.transform = 'translateY(0)';
      });
    });
  }

  // Run init after DOM is ready
  document.addEventListener('DOMContentLoaded', init);

  // Public API (accessible globally as window.DonationForm)
  return {
    selectAmount,
    updateCustomAmount,
    selectFrequency,
    processDonation,
    init
  };
})();

window.selectAmount = function(button, amount) {
  if (window.DonationForm && window.DonationForm.selectAmount) {
    window.DonationForm.selectAmount(button, amount);
  }
};

window.updateCustomAmount = function(input) {
  if (window.DonationForm && window.DonationForm.updateCustomAmount) {
    window.DonationForm.updateCustomAmount(input);
  }
};

window.selectFrequency = function(option, frequency) {
  if (window.DonationForm && window.DonationForm.selectFrequency) {
    window.DonationForm.selectFrequency(option, frequency);
  }
};

window.processDonation = function(event) {
  if (window.DonationForm && window.DonationForm.processDonation) {
    window.DonationForm.processDonation(event);
  }
};

window.AwardsPage = (function () {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    let observer;

    function init() {
      // Create observer if not already created
      if (!observer) {
        observer = new IntersectionObserver(handleIntersect, observerOptions);
      }

      // Observe award cards
      const cards = document.querySelectorAll('.award-card, .cert-card, .timeline-item');
      cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `all 0.6s ease ${index * 0.1}s`;
        observer.observe(card);
      });

      console.log('Awards page loaded successfully');
    }

    function handleIntersect(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }

    // Expose public API
    return {
      init
    };
  })();

  // Auto-init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    if (window.AwardsPage && typeof window.AwardsPage.init === 'function') {
      window.AwardsPage.init();
    }
  });

 window.CommunityPage = {
    init: function () {
      const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }
        });
      }, observerOptions);

      // Animate photo items
      const photoItems = document.querySelectorAll('.photo-item');
      photoItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(item);
      });

      // Floating elements parallax scroll
      window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        const floatingElements = document.querySelector('.floating-elements');
        if (floatingElements) {
          floatingElements.style.transform = `translateY(${rate}px)`;
        }
      });

      // Community buttons interaction
      document.querySelectorAll('.community-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();

          if (btn.textContent.includes('Discord')) {
            btn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.07.07 0 00-.074.034c-.21.375-.444.864-.608 1.249-1.844-.276-3.68-.276-5.486 0-.164-.393-.407-.874-.618-1.249a.07.07 0 00-.074-.034 19.736 19.736 0 00-4.885 1.515.064.064 0 00-.03.027C2.96 9.045 2.154 13.58 2.478 18.057a.082.082 0 00.031.057c2.052 1.507 4.041 2.422 5.992 3.029a.07.07 0 00.074-.027c.461-.63.873-1.295 1.226-1.994a.07.07 0 00-.041-.098c-.65-.249-1.263-.557-1.845-.914a.07.07 0 01-.007-.115c.124-.093.248-.19.366-.287a.07.07 0 01.073-.01c3.861 1.773 8.027 1.773 11.863 0a.07.07 0 01.074.01c.118.097.242.194.366.287a.07.07 0 01-.006.115 12.298 12.298 0 01-1.846.913.07.07 0 00-.04.099c.36.698.772 1.362 1.225 1.993a.07.07 0 00.074.028c1.962-.607 3.95-1.522 6.002-3.029a.07.07 0 00.031-.056c.5-6.933-1.043-11.436-4.548-13.661a.061.061 0 00-.03-.028zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.095 2.157 2.419 0 1.334-.955 2.419-2.157 2.419zm7.974 0c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.095 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/>
              </svg>
            `;
            setTimeout(() => {
              btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.07.07 0 00-.074.034c-.21.375-.444.864-.608 1.249-1.844-.276-3.68-.276-5.486 0-.164-.393-.407-.874-.618-1.249a.07.07 0 00-.074-.034 19.736 19.736 0 00-4.885 1.515.064.064 0 00-.03.027C2.96 9.045 2.154 13.58 2.478 18.057a.082.082 0 00.031.057c2.052 1.507 4.041 2.422 5.992 3.029a.07.07 0 00.074-.027c.461-.63.873-1.295 1.226-1.994a.07.07 0 00-.041-.098c-.65-.249-1.263-.557-1.845-.914a.07.07 0 01-.007-.115c.124-.093.248-.19.366-.287a.07.07 0 01.073-.01c3.861 1.773 8.027 1.773 11.863 0a.07.07 0 01.074.01c.118.097.242.194.366.287a.07.07 0 01-.006.115 12.298 12.298 0 01-1.846.913.07.07 0 00-.04.099c.36.698.772 1.362 1.225 1.993a.07.07 0 00.074.028c1.962-.607 3.95-1.522 6.002-3.029a.07.07 0 00.031-.056c.5-6.933-1.043-11.436-4.548-13.661a.061.061 0 00-.03-.028zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.095 2.157 2.419 0 1.334-.955 2.419-2.157 2.419zm7.974 0c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.095 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/>
                </svg>
                Join Discord
              `;
            }, 2000);
          } else {
            btn.innerHTML = `
              <svg height="20px" width="20px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 59.312 59.312" xml:space="preserve" fill="#000" stroke="#000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path style="fill:#ffffff;" d="M41.507,0c-9.225,0-16.729,7.504-16.729,16.728c0,2.829,0.711,5.492,1.956,7.831L2.525,48.979 c-1.944,1.962-1.93,5.127,0.031,7.071c0.975,0.967,2.248,1.449,3.52,1.449c1.287,0,2.573-0.494,3.551-1.479l2.831-2.855 l6.148,6.147l3.662-3.662l-2.951-3.027l2.148-2.094l2.924,3l2.702-2.701l-6.185-6.186l12.945-13.059 c2.297,1.188,4.896,1.872,7.656,1.872c9.224,0,16.728-7.504,16.728-16.728S50.73,0,41.507,0z M41.507,27.456 c-5.917,0-10.729-4.812-10.729-10.728S35.59,6,41.507,6c5.915,0,10.728,4.812,10.728,10.728S47.422,27.456,41.507,27.456z"></path> </g> </g></svg>
              Searching...
            `;
            setTimeout(() => {
              btn.innerHTML = `
                <svg height="20px" width="20px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 59.312 59.312" xml:space="preserve" fill="#000" stroke="#000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path style="fill:#ffffff;" d="M41.507,0c-9.225,0-16.729,7.504-16.729,16.728c0,2.829,0.711,5.492,1.956,7.831L2.525,48.979 c-1.944,1.962-1.93,5.127,0.031,7.071c0.975,0.967,2.248,1.449,3.52,1.449c1.287,0,2.573-0.494,3.551-1.479l2.831-2.855 l6.148,6.147l3.662-3.662l-2.951-3.027l2.148-2.094l2.924,3l2.702-2.701l-6.185-6.186l12.945-13.059 c2.297,1.188,4.896,1.872,7.656,1.872c9.224,0,16.728-7.504,16.728-16.728S50.73,0,41.507,0z M41.507,27.456 c-5.917,0-10.729-4.812-10.729-10.728S35.59,6,41.507,6c5.915,0,10.728,4.812,10.728,10.728S47.422,27.456,41.507,27.456z"></path> </g> </g></svg>
                Find Local Chapter
              `;
            }, 200);
          }
        });
      });
    }
  };
  

window.CommunityGallery = (function () {
    // --- Private state ---
    const photoItems = [
      { src: "public/community/1.jpg", alt: "Hội thảo chuyên gia", caption: "" },
      { src: "public/community/2.jpg", alt: "Gặp gỡ thành viên", caption: "" },
      { src: "public/community/3.jpg", alt: "Thuyết trình công nghệ", caption: "" },
      { src: "public/community/4.jpg", alt: "Networking session", caption: "" },
      { src: "public/community/5.jpg", alt: "Workshop tương tác", caption: "" },
      { src: "public/community/6.jpg", alt: "Chia sẻ kinh nghiệm", caption: "" },
      { src: "public/community/7.jpg", alt: "Cộng đồng global", caption: "" },
      { src: "public/community/8.jpg", alt: "Meetup địa phương", caption: "" },
      { src: "public/community/9.jpg", alt: "Meetup địa phương", caption: "" },
      { src: "public/community/10.jpg", alt: "Meetup địa phương", caption: "" },
      { src: "public/community/11.jpg", alt: "Meetup địa phương", caption: "" },
      { src: "public/community/12.jpg", alt: "Meetup địa phương", caption: "" },
      { src: "public/community/13.jpg", alt: "Meetup địa phương", caption: "" }
    ];

    let currentPhotoIndex = 0;
    let modalCurrentIndex = 0;
    let startX = 0;
    let endX = 0;

    // --- Modal Functions ---
    function createModal() {
      // Remove existing modal if it exists
      const existingModal = document.getElementById('community-modal');
      if (existingModal) {
        existingModal.remove();
      }

      const modal = document.createElement('div');
      modal.id = 'community-modal';
      modal.className = 'community-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(10px);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease-out;
      `;

      const content = document.createElement('div');
      content.className = 'community-modal-content';
      content.style.cssText = `
        position: relative;
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        align-items: center;
      `;

      const counter = document.createElement('div');
      counter.className = 'community-modal-counter';
      counter.style.cssText = `
        position: absolute;
        top: -60px;
        left: 0;
        background: rgba(0, 0, 0, 0.8);
        color: #ffffff;
        padding: 10px 15px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        backdrop-filter: blur(10px);
      `;

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '<svg width="64px" height="64px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM8.96963 8.96965C9.26252 8.67676 9.73739 8.67676 10.0303 8.96965L12 10.9393L13.9696 8.96967C14.2625 8.67678 14.7374 8.67678 15.0303 8.96967C15.3232 9.26256 15.3232 9.73744 15.0303 10.0303L13.0606 12L15.0303 13.9696C15.3232 14.2625 15.3232 14.7374 15.0303 15.0303C14.7374 15.3232 14.2625 15.3232 13.9696 15.0303L12 13.0607L10.0303 15.0303C9.73742 15.3232 9.26254 15.3232 8.96965 15.0303C8.67676 14.7374 8.67676 14.2625 8.96965 13.9697L10.9393 12L8.96963 10.0303C8.67673 9.73742 8.67673 9.26254 8.96963 8.96965Z" fill="#ffffff"></path> </g></svg>';
      closeBtn.className = 'community-modal-close';
      closeBtn.style.cssText = `
        position: absolute;
        top: -60px;
        right: 0;
        background: transparent;
        border: none;
        color: #ffffff;
        font-size: 24px;
        padding: 15px 18px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
      `;
      closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(255, 0, 0, 0.8)';
      closeBtn.onmouseleave = () => closeBtn.style.background = 'rgba(0, 0, 0, 0.8)';
      closeBtn.onclick = closeModal;

      const prevBtn = document.createElement('button');
      prevBtn.innerHTML = '<svg fill="#fff" width="64px" height="64px" viewBox="-8.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>left</title> <path d="M7.094 15.938l7.688 7.688-3.719 3.563-11.063-11.063 11.313-11.344 3.531 3.5z"></path> </g></svg>';
      prevBtn.className = 'community-modal-nav community-modal-prev';
      prevBtn.style.cssText = `
        position: absolute;
        top: 50%;
        left: -80px;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.8);
        border: none;
        color: #ffffff;
        font-size: 24px;
        padding: 15px 20px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 10;
      `;
      prevBtn.onmouseenter = () => {
        prevBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        prevBtn.style.transform = 'translateY(-50%) scale(1.1)';
      };
      prevBtn.onmouseleave = () => {
        prevBtn.style.background = 'rgba(0, 0, 0, 0.8)';
        prevBtn.style.transform = 'translateY(-50%) scale(1)';
      };
      prevBtn.onclick = () => navigateModal(-1);

      const nextBtn = document.createElement('button');
      nextBtn.innerHTML = '<svg fill="#fff" width="64px" height="64px" viewBox="-8.5 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>right</title> <path d="M7.75 16.063l-7.688-7.688 3.719-3.594 11.063 11.094-11.344 11.313-3.5-3.469z"></path> </g></svg>';
      nextBtn.className = 'community-modal-nav community-modal-next';
      nextBtn.style.cssText = `
        position: absolute;
        top: 50%;
        right: -80px;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.8);
        border: none;
        color: #ffffff;
        font-size: 24px;
        padding: 15px 20px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 10;
      `;
      nextBtn.onmouseenter = () => {
        nextBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        nextBtn.style.transform = 'translateY(-50%) scale(1.1)';
      };
      nextBtn.onmouseleave = () => {
        nextBtn.style.background = 'rgba(0, 0, 0, 0.8)';
        nextBtn.style.transform = 'translateY(-50%) scale(1)';
      };
      nextBtn.onclick = () => navigateModal(1);

      const image = document.createElement('img');
      image.id = 'community-modal-image';
      image.className = 'community-modal-image';
      image.style.cssText = `
        max-width: 100%;
        max-height: 80vh;
        object-fit: contain;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      `;

      const caption = document.createElement('div');
      caption.className = 'community-modal-caption';
      caption.style.cssText = `
        color: #ffffff;
        text-align: center;
        margin-top: 20px;
        font-size: 16px;
        font-weight: 500;
        max-width: 600px;
      `;

      // Mobile responsive styles
      const style = document.createElement('style');
      style.innerHTML = `
        @media (max-width: 768px) {
          .community-modal-nav {
            font-size: 20px !important;
            padding: 12px 15px !important;
          }
          .community-modal-prev {
            left: 10px !important;
          }
          .community-modal-next {
            right: 10px !important;
          }
          .community-modal-close {
            display: none !important;
          }
          .community-modal-counter {
            top: -20px !important;
            left: 20px !important;
            font-size: 12px !important;
            padding: 8px 12px !important;
          }
        }
      `;
      document.head.appendChild(style);

      content.appendChild(counter);
      content.appendChild(closeBtn);
      content.appendChild(prevBtn);
      content.appendChild(nextBtn);
      content.appendChild(image);
      content.appendChild(caption);
      modal.appendChild(content);
      document.body.appendChild(modal);

      // Close modal when clicking outside
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });

      // Keyboard navigation for modal
      document.addEventListener('keydown', handleModalKeyboard);

      return modal;
    }

    function openModal(index = 0) {
      modalCurrentIndex = index;
      const modal = document.getElementById('community-modal') || createModal();
      updateModalContent();
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      const modal = document.getElementById('community-modal');
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    }

    function navigateModal(direction) {
      modalCurrentIndex += direction;
      if (modalCurrentIndex < 0) modalCurrentIndex = photoItems.length - 1;
      if (modalCurrentIndex >= photoItems.length) modalCurrentIndex = 0;
      updateModalContent();
    }

    function updateModalContent() {
      const image = document.getElementById('community-modal-image');
      const caption = document.querySelector('.community-modal-caption');
      const counter = document.querySelector('.community-modal-counter');

      if (image && caption && counter) {
        const currentPhoto = photoItems[modalCurrentIndex];
        image.src = currentPhoto.src;
        image.alt = currentPhoto.alt;
        caption.textContent = currentPhoto.caption;
        counter.textContent = `${modalCurrentIndex + 1}/${photoItems.length}`;
      }
    }

    function handleModalKeyboard(e) {
      const modal = document.getElementById('community-modal');
      if (modal && modal.style.display === 'flex') {
        switch (e.key) {
          case 'ArrowLeft':
            navigateModal(-1);
            e.preventDefault();
            break;
          case 'ArrowRight':
            navigateModal(1);
            e.preventDefault();
            break;
          case 'Escape':
            closeModal();
            e.preventDefault();
            break;
        }
      }
    }

    // --- Functions ---
    function initialize() {
      const photoCollage = document.querySelector('.photo-collage');
      if (!photoCollage) return; // Guard: don't run if container doesn't exist

      const photoGrid = document.querySelector('.photo-grid');

      // Add click events to photo items to open modal
      const photoItems = document.querySelectorAll('.photo-item');
      photoItems.forEach((item, index) => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => openModal(index));
      });

      // Add total media counter
      const totalCounter = document.createElement('div');
      totalCounter.className = 'community-media-counter';
      totalCounter.textContent = `${photoItems.length} ảnh`;
      totalCounter.style.cssText = `
        position: absolute;
        top: 15px;
        left: 15px;
        background: rgba(0,0,0,0.8);
        color: #ffffff;
        padding: 8px 15px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.5px;
        pointer-events: none;
        z-index: 10;
        backdrop-filter: blur(10px);
      `;
      photoCollage.appendChild(totalCounter);

      // Add current photo indicator
      const currentIndicator = document.createElement('div');
      currentIndicator.className = 'community-current-indicator';
      currentIndicator.textContent = `1/${photoItems.length}`;
      currentIndicator.style.cssText = `
        position: absolute;
        top: 15px;
        right: 15px;
        background: rgba(0,0,0,0.8);
        color: #ffffff;
        padding: 8px 15px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.5px;
        pointer-events: none;
        z-index: 10;
        backdrop-filter: blur(10px);
      `;
      photoCollage.appendChild(currentIndicator);

      // Add navigation arrows
      const leftArrow = document.createElement('button');
      leftArrow.innerHTML = '<svg fill="#fff" width="30px" height="30px" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><path d="M30 14.5c-.004.276-.224.504-.5.5h-26c-.66 0-.664-1 0-1h26c.282-.004.504.218.5.5zm-15 14c0 .45-.554.663-.854.354l-14-14c-.195-.196-.195-.512 0-.708l14-14c.426-.442 1.167.248.708.708L1.207 14.5l13.647 13.646c.097.095.146.22.146.354z"/></svg>';
      leftArrow.style.cssText = `
        position: absolute;
        left: 15px;
        bottom: 15px;
        background: rgba(0,0,0,0.8);
        border: none;
        padding: 10px 15px;
        border-radius: 50%;
        cursor: pointer;
        z-index: 10;
        transition: all 0.3s ease;
        opacity: 0.8;
      `;
      leftArrow.onmouseenter = () => leftArrow.style.opacity = '1';
      leftArrow.onmouseleave = () => leftArrow.style.opacity = '0.8';
      leftArrow.onclick = () => navigate(-1);

      const rightArrow = document.createElement('button');
      rightArrow.innerHTML = '<svg fill="#fff" width="30px" height="30px" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><path d="M0 15.5c.004.276.224.504.5.5h26c.66 0 .664-1 0-1H.5c-.282-.004-.504.218-.5.5zm15 14c0 .45.554.663.854.354l14-14c.195-.195.195-.51 0-.707l-14-14c-.426-.443-1.167.248-.707.707L28.793 15.5 15.147 29.148c-.098.095-.147.218-.147.353z"/></svg>';
      rightArrow.style.cssText = `
        position: absolute;
        right: 15px;
        bottom: 15px;
        background: rgba(0,0,0,0.8);
        border: none;
        padding: 10px 15px;
        border-radius: 50%;
        cursor: pointer;
        z-index: 10;
        transition: all 0.3s ease;
        opacity: 0.8;
      `;
      rightArrow.onmouseenter = () => rightArrow.style.opacity = '1';
      rightArrow.onmouseleave = () => rightArrow.style.opacity = '0.8';
      rightArrow.onclick = () => navigate(1);

      photoCollage.appendChild(leftArrow);
      photoCollage.appendChild(rightArrow);

      // Touch events
      photoCollage.addEventListener('touchstart', handleTouchStart, { passive: false });
      photoCollage.addEventListener('touchmove', handleTouchMove, { passive: false });
      photoCollage.addEventListener('touchend', handleTouchEnd, { passive: false });

      // Keyboard navigation
      document.addEventListener('keydown', handleKeyboard);

      // Add dots indicator
      addDots();

      // Highlight first photo
      highlightCurrentPhoto();
    }

    function navigate(direction) {
      currentPhotoIndex += direction;
      if (currentPhotoIndex < 0) currentPhotoIndex = photoItems.length - 1;
      if (currentPhotoIndex >= photoItems.length) currentPhotoIndex = 0;

      updateIndicators();
      highlightCurrentPhoto();
    }

    function updateIndicators() {
      const currentIndicator = document.querySelector('.community-current-indicator');
      if (currentIndicator) {
        currentIndicator.textContent = `${currentPhotoIndex + 1}/${photoItems.length}`;
      }

      // Update dots
      const dots = document.querySelectorAll('.community-dot');
      dots.forEach((dot, index) => {
        const isActive = index === currentPhotoIndex;
        dot.style.background = isActive ? '#22c55e' : 'rgba(255,255,255,0.4)';
        dot.style.transform = isActive ? 'scale(1.2)' : 'scale(1)';
      });
    }

    function highlightCurrentPhoto() {
      const items = document.querySelectorAll('.photo-item');
      items.forEach((item, index) => {
        if (index === currentPhotoIndex) {
          item.style.transform = 'scale(1.1)';
          item.style.boxShadow = '0 10px 30px rgba(200, 255, 0, 0.6)';
          item.style.zIndex = '15';
        } else {
          item.style.transform = '';
          item.style.boxShadow = '';
          item.style.zIndex = '';
        }
      });
    }

    function addDots() {
      const photoCollage = document.querySelector('.photo-collage');
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'community-dots-container';
      dotsContainer.style.cssText = `
        position: absolute;
        bottom: 60px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        z-index: 10;
        backdrop-filter: blur(4px);
        background: rgba(0,0,0,0.2);
        padding: 8px 12px;
        border-radius: 20px;
      `;

      photoItems.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.className = 'community-dot';
        dot.style.cssText = `
          all: unset;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.6);
          background: ${index === 0 ? '#22c55e' : 'rgba(255,255,255,0.4)'};
          cursor: pointer;
          transition: all 0.3s ease;
        `;
        dot.onclick = () => {
          currentPhotoIndex = index;
          updateIndicators();
          highlightCurrentPhoto();
        };
        dotsContainer.appendChild(dot);
      });

      photoCollage.appendChild(dotsContainer);
    }

    // --- Touch handlers ---
    function handleTouchStart(e) {
      startX = e.touches[0].clientX;
    }
    function handleTouchMove(e) {
      if (!startX) return;
      e.preventDefault();
    }
    function handleTouchEnd(e) {
      if (!startX) return;
      endX = e.changedTouches[0].clientX;
      const diffX = startX - endX;
      const threshold = 50;
      if (Math.abs(diffX) > threshold) {
        navigate(diffX > 0 ? 1 : -1);
      }
      startX = 0;
      endX = 0;
    }

    // --- Keyboard navigation ---
    function handleKeyboard(e) {
      switch (e.key) {
        case 'ArrowLeft':
          navigate(-1);
          e.preventDefault();
          break;
        case 'ArrowRight':
          navigate(1);
          e.preventDefault();
          break;
      }
    }

    // Expose public API
    return {
      init: initialize,
      next: () => navigate(1),
      prev: () => navigate(-1),
      goTo: (index) => {
        currentPhotoIndex = Math.max(0, Math.min(photoItems.length - 1, index));
        updateIndicators();
        highlightCurrentPhoto();
      },
      openModal: (index = 0) => openModal(index),
      closeModal: closeModal
    };
  })();

  // Auto init when page loads
  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.photo-collage')) {
      window.CommunityGallery.init();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    if (window.CommunityPage && typeof window.CommunityPage.init === 'function') {
      window.CommunityPage.init();
    }
  });

// Global Chatbot Function
window.initializeChatbot = function(targetSelector = 'body', css = '') {
    if (document.getElementById('ai-chatbot')) {
        return false;
    }

    const chatbotHTML = `
        <div id="ai-chatbot" class="chatbot-container">
            <div class="chatbot-toggle" id="chatbot-toggle">
                <svg width="64px" height="64px" viewBox="0 -0.5 17 17" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="si-glyph si-glyph-bubble-message-dot-2" fill="#000000" stroke="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>1049</title> <defs> </defs> <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"> <path d="M9.019,1.04 C4.621,1.04 1.051,3.66 1.051,6.892 C1.051,9.842 4.026,12.276 7.893,12.679 L5.845,15.929 L11.964,12.326 C14.906,11.465 16.989,9.358 16.989,6.891 C16.989,3.66 13.42,1.04 9.019,1.04 L9.019,1.04 Z M6,8 L4,8 L4,6 L6,6 L6,8 L6,8 Z M10,8 L8,8 L8,6 L10,6 L10,8 L10,8 Z M14,8 L12,8 L12,6 L14,6 L14,8 L14,8 Z" fill="#34efeb" class="si-glyph-fill"> </path> </g> </g></svg>
                <span class="chatbot-badge">Auto</span>
            </div>
            
            <div class="chatbot-window" id="chatbot-window">
                <div class="chatbot-header">
                    <div class="chatbot-title">
                        <span>ICUE-AI Chatbot</span>
                    </div>
                    <button class="chatbot-close" id="chatbot-close">
                        <svg width="22px" height="22px" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                
                <div class="chatbot-messages" id="chatbot-messages">
                    <div class="message bot-message">
                        <div class="message-avatar">
                            <svg style="transform:translateY(6px)" width="22px" height="22px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g clip-path="url(#clip0_8_53)"> <path d="M16 12C15.87 12.0016 15.7409 11.9778 15.62 11.93C15.4971 11.8781 15.3852 11.8035 15.29 11.7101C15.2001 11.6179 15.1287 11.5092 15.08 11.39C15.0296 11.266 15.0025 11.1338 15 11C15.0011 10.7376 15.1053 10.4863 15.29 10.3C15.3825 10.2033 15.4952 10.1282 15.62 10.0801C15.8031 10.0047 16.0044 9.98535 16.1984 10.0245C16.3924 10.0637 16.5705 10.1596 16.71 10.3C16.8947 10.4863 16.9989 10.7376 17 11C16.9975 11.1338 16.9704 11.266 16.92 11.39C16.8713 11.5092 16.7999 11.6179 16.71 11.7101C16.6166 11.8027 16.5057 11.876 16.3839 11.9258C16.2621 11.9755 16.1316 12.0007 16 12Z" fill="#000000"></path> <path d="M12 12C11.87 12.0016 11.7409 11.9778 11.62 11.93C11.4971 11.8781 11.3852 11.8035 11.29 11.7101C11.2001 11.6179 11.1287 11.5092 11.08 11.39C11.0296 11.266 11.0025 11.1338 11 11C11.0011 10.7376 11.1053 10.4863 11.29 10.3C11.3825 10.2033 11.4952 10.1282 11.62 10.0801C11.8031 10.0047 12.0044 9.98535 12.1984 10.0245C12.3924 10.0637 12.5705 10.1596 12.71 10.3C12.8947 10.4863 12.9989 10.7376 13 11C12.9975 11.1338 12.9704 11.266 12.92 11.39C12.8713 11.5092 12.7999 11.6179 12.71 11.7101C12.6166 11.8027 12.5057 11.876 12.3839 11.9258C12.2621 11.9755 12.1316 12.0007 12 12Z" fill="#000000"></path> <path d="M8 12C7.86999 12.0016 7.74091 11.9778 7.62 11.93C7.49713 11.8781 7.38519 11.8035 7.29001 11.7101C7.20006 11.6179 7.12873 11.5092 7.07999 11.39C7.0296 11.266 7.0025 11.1338 7 11C7.0011 10.7376 7.10526 10.4863 7.29001 10.3C7.3825 10.2033 7.49516 10.1282 7.62 10.0801C7.80305 10.0047 8.00435 9.98535 8.19839 10.0245C8.39244 10.0637 8.57048 10.1596 8.70999 10.3C8.89474 10.4863 8.9989 10.7376 9 11C8.9975 11.1338 8.9704 11.266 8.92001 11.39C8.87127 11.5092 8.79994 11.6179 8.70999 11.7101C8.61655 11.8027 8.50575 11.876 8.38391 11.9258C8.26207 11.9755 8.13161 12.0007 8 12Z" fill="#000000"></path> </g> <path d="M4.99951 16.55V19.9C4.99922 20.3102 5.11905 20.7114 5.34418 21.0542C5.56931 21.397 5.88994 21.6665 6.26642 21.8292C6.6429 21.9919 7.05875 22.0408 7.46271 21.9698C7.86666 21.8989 8.24103 21.7113 8.53955 21.4301L11.1495 18.9701H12.0195C17.5395 18.9701 22.0195 15.1701 22.0195 10.4701C22.0195 5.77009 17.5395 1.97009 12.0195 1.97009C6.49953 1.97009 2.01953 5.78009 2.01953 10.4701C2.042 11.6389 2.32261 12.7882 2.84125 13.8358C3.35989 14.8835 4.10373 15.8035 5.01953 16.53L4.99951 16.55Z" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <defs> <clipPath id="clip0_8_53"> <rect width="10" height="2" fill="white" transform="translate(7 10)"></rect> </clipPath> </defs> </g></svg>
                        </div>
                        <div class="message-content">
                            Xin Chào! Tôi là trợ lý AI của ICUE. Tôi có thể giúp bạn tìm hiểu về các dự án, dịch vụ và thông tin của chúng tôi. Bạn cần hỗ trợ gì?
                        </div>
                    </div>
                </div>
                
                <div class="chatbot-input-area">
                    <div class="chatbot-input-container">
                        <input type="text" id="chatbot-input" placeholder="Hỏi bất cứ điều gì..." />
                        <button class="chatbot-send" id="chatbot-send">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="chatbot-suggestions">
                        <button class="suggestion-btn">Dịch Vụ</button>
                        <button class="suggestion-btn">Dự Án Gần Đây</button>
                        <button class="suggestion-btn">Liên Hệ</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inject CSS if provided
    if (css && !document.querySelector('#icue-chatbot-style')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'icue-chatbot-style';
        styleElement.textContent = css;
        document.head.appendChild(styleElement);
    }

    // Inject HTML
    const targetElement = document.querySelector(targetSelector);
    if (!targetElement) {
        console.error('Chatbot: Target element not found');
        return false;
    }

    targetElement.insertAdjacentHTML('beforeend', chatbotHTML);

    // Initialize chatbot functionality
    const chatbotKnowledge = createChatbotKnowledge();
    setupChatbotEvents(chatbotKnowledge);
    
    return true;

    function createChatbotKnowledge() {
      const kbCache = Object.create(null);
      const kbLoading = Object.create(null);
      const siteLang = ((document.documentElement.lang || 'vi').toLowerCase().startsWith('vi')) ? 'vi' : 'en';
      const kbPaths = {
        vi: '/public/chatbot/kb.vi.json',
        en: '/public/chatbot/kb.en.json'
      };

      // Warm the cache (non-blocking)
      // Prefetch both languages so we can route per-message.
      ensureKb('en').catch(() => {});
      ensureKb('vi').catch(() => {});

      return {
        siteLang,
        ensureKb,
        getResponse
      };

      async function ensureKb(lang) {
        const safeLang = (lang === 'en' || lang === 'vi') ? lang : siteLang;
        if (kbCache[safeLang]) return kbCache[safeLang];
        if (!kbLoading[safeLang]) {
          kbLoading[safeLang] = loadKb(safeLang)
            .catch(() => getFallbackKb(safeLang))
            .then((kb) => prepareKb(kb, safeLang));
        }
        kbCache[safeLang] = await kbLoading[safeLang];
        return kbCache[safeLang];
      }

      async function loadKb(lang) {
        const url = kbPaths[lang];
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`KB fetch failed: ${res.status}`);
        const kb = await res.json();
        if (!kb || !Array.isArray(kb.intents)) throw new Error('KB invalid shape');
        return kb;
      }

      function getFallbackKb(lang) {
        return {
          version: 1,
          language: lang,
          intents: [
            {
              id: 'contact',
              keywords: ['liên hệ', 'contact', 'email', 'điện thoại', 'hotline'],
              phrases: ['làm sao để liên hệ', 'thông tin liên hệ'],
              answer: lang === 'vi'
                ? 'Bạn có thể xem trang Liên hệ để biết email/số điện thoại/biểu mẫu.'
                : 'Please check the Contact page for email/phone/form details.',
              links: [{ label: 'Contact', url: '#/Contact' }]
            }
          ],
          fallback: {
            answer: lang === 'vi'
              ? 'Mình chưa chắc mình hiểu đúng câu hỏi. Bạn có thể nói rõ hơn bạn đang hỏi về mục nào không (Dịch vụ / Dự án / Tuyển dụng / Quyên góp / Liên hệ)?'
              : 'I’m not fully sure I understood. Could you clarify what you’re asking about (Services / Projects / Recruitment / Donations / Contact)?'
          }
        };
      }

      function prepareKb(kb, lang) {
        const safe = {
          version: kb.version || 1,
          language: kb.language || lang,
          intents: Array.isArray(kb.intents) ? kb.intents : [],
          fallback: kb.fallback || { answer: lang === 'vi' ? 'Bạn có thể nói rõ hơn giúp mình không?' : 'Could you clarify your question?' }
        };

        safe.intents = safe.intents
          .filter((it) => it && typeof it.answer === 'string')
          .map((it) => {
            const keywords = Array.isArray(it.keywords) ? it.keywords.filter(Boolean) : [];
            const phrases = Array.isArray(it.phrases) ? it.phrases.filter(Boolean) : [];
            const links = Array.isArray(it.links) ? it.links.filter(l => l && l.label && l.url) : [];
            const candidates = [...keywords, ...phrases]
              .map((s) => normalizeForSearch(String(s)))
              .filter(Boolean);
            const candidateTokens = candidates.map(tokenize);
            return {
              id: it.id || 'intent',
              answer: String(it.answer),
              links,
              _candidates: candidates,
              _candidateTokens: candidateTokens
            };
          });
        return safe;
      }

      async function getResponse(userMessage) {
        const raw = String(userMessage || '').trim();
        if (!raw) {
          const kb = await ensureKb(siteLang);
          return { content: kb.fallback?.answer || '', links: [] };
        }

        const unsupported = detectUnsupportedLanguage(raw);
        if (unsupported) {
          return {
            content: siteLang === 'vi'
              ? 'Hiện tại chatbot chỉ hỗ trợ Tiếng Việt và English. Vui lòng đặt câu hỏi bằng Tiếng Việt hoặc English (bạn có thể đổi ngôn ngữ bằng biểu tượng lá cờ trên thanh menu).'
              : 'This chatbot currently supports Vietnamese and English only. Please ask your question in Vietnamese or English (you can switch site language via the flag icon in the menu).',
            links: []
          };
        }

        const queryNorm = normalizeForSearch(raw);
        const queryTokens = tokenize(queryNorm);

        // Route language per-message. If detection is uncertain, score both KBs and pick the best match.
        const detectedLang = await routeLanguage(raw, queryNorm, queryTokens);
        const kb = await ensureKb(detectedLang);

        // 1) Match intents in KB
        const bestIntent = findBestIntent(kb, queryNorm, queryTokens);

        // 2) Match against FAQ data (if available)
        const bestFaq = findBestFaq(queryNorm, queryTokens, detectedLang);

        // Decide
        const intentScore = bestIntent?.score ?? 0;
        const faqScore = bestFaq?.score ?? 0;

        if (faqScore >= 0.52 && faqScore >= intentScore) {
          const links = [{ label: detectedLang === 'vi' ? 'Xem FAQ' : 'View FAQs', url: '#/faqs' }];
          return { content: bestFaq.answer, links };
        }

        if (intentScore >= 0.45) {
          return { content: bestIntent.intent.answer, links: bestIntent.intent.links || [] };
        }

        return {
          content: kb.fallback?.answer || (detectedLang === 'vi'
            ? 'Mình chưa chắc mình hiểu đúng câu hỏi. Bạn có thể nói rõ hơn giúp mình không?'
            : 'I’m not fully sure I understood. Could you clarify your question?'),
          links: [
            { label: detectedLang === 'vi' ? 'FAQ' : 'FAQs', url: '#/faqs' },
            { label: detectedLang === 'vi' ? 'Liên hệ' : 'Contact', url: '#/Contact' }
          ]
        };
      }

      async function routeLanguage(raw, queryNorm, queryTokens) {
        const direct = detectUserLanguage(raw);
        if (direct === 'en' || direct === 'vi') return direct;

        // If we can't confidently detect, compare intent match strength across both KBs.
        const [kbEn, kbVi] = await Promise.all([ensureKb('en'), ensureKb('vi')]);
        const bestEn = findBestIntent(kbEn, queryNorm, queryTokens);
        const bestVi = findBestIntent(kbVi, queryNorm, queryTokens);
        const enScore = bestEn?.score ?? 0;
        const viScore = bestVi?.score ?? 0;

        // Only switch away from siteLang if there's a clear winner.
        const minToSwitch = 0.45;
        const margin = 0.05;
        if (Math.max(enScore, viScore) >= minToSwitch && Math.abs(enScore - viScore) >= margin) {
          return enScore > viScore ? 'en' : 'vi';
        }
        return siteLang;
      }

      function detectUserLanguage(text) {
        const raw = String(text || '');
        const hasVietnameseDiacritics = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(raw);
        if (hasVietnameseDiacritics) return 'vi';

        // Also detect Vietnamese typed WITHOUT diacritics (e.g., "xin chao", "dich vu").
        const norm = normalizeForSearch(raw);
        const tokens = norm.split(' ').filter(Boolean);

        const viHints = new Set([
          'xin','chao','camon','cam','on','dich','vu','lien','he','tuyen','dung','ung','tuyen','du','an','quyen','gop',
          'bao','gia','chi','phi','gia','thoi','gian','quy','trinh','hop','tac','doi','tac','bao','chi','truyen','thong'
        ]);
        const enHints = new Set([
          'what','how','where','when','services','service','projects','project','contact','recruitment','donation','donate',
          'privacy','terms','cookies','gdpr','price','pricing','quote','proposal','meeting','schedule','internship','partner','press'
        ]);

        let viScore = 0;
        let enScore = 0;
        for (const t of tokens) {
          if (viHints.has(t)) viScore++;
          if (enHints.has(t)) enScore++;
        }

        if (viScore >= 2 && viScore > enScore) return 'vi';
        if (enScore >= 1 && enScore > viScore) return 'en';
        return null;
      }

      function detectUnsupportedLanguage(text) {
        const raw = String(text || '');

        // Script-based detection (high confidence).
        if (/[\u3040-\u30ff]/.test(raw)) return 'ja'; // Japanese Hiragana/Katakana
        if (/[\u4e00-\u9fff]/.test(raw)) return 'zh'; // CJK Unified Ideographs
        if (/[\uac00-\ud7af]/.test(raw)) return 'ko'; // Hangul
        if (/[\u0e00-\u0e7f]/.test(raw)) return 'th'; // Thai
        if (/[\u0400-\u04ff]/.test(raw)) return 'ru'; // Cyrillic
        if (/[\u0600-\u06ff]/.test(raw)) return 'ar'; // Arabic
        if (/[\u0590-\u05ff]/.test(raw)) return 'he'; // Hebrew

        // Latin-script heuristics for common unsupported languages.
        const norm = normalizeForSearch(raw);
        const tokens = norm.split(' ').filter(Boolean);
        if (!tokens.length) return null;

        const esHints = new Set(['hola','gracias','por','favor','buenos','dias','buenas','noches','donde','precio','contacto','ayuda','necesito','quiero']);
        const frHints = new Set(['bonjour','merci','svp','silvousplait','ou','prix','contact','aide','besoin','je','veux']);
        const deHints = new Set(['hallo','danke','bitte','preis','kontakt','hilfe','ich','brauche','mochte']);

        let es = 0;
        let fr = 0;
        let de = 0;
        for (const t of tokens) {
          if (esHints.has(t)) es++;
          if (frHints.has(t)) fr++;
          if (deHints.has(t)) de++;
        }
        const max = Math.max(es, fr, de);
        if (max >= 2) {
          if (es === max) return 'es';
          if (fr === max) return 'fr';
          if (de === max) return 'de';
        }
        return null;
      }

      function normalizeForSearch(text) {
        let s = String(text || '').toLowerCase();
        try {
          s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        } catch (e) {
          // ignore
        }
        s = s.replace(/[đ]/g, 'd');
        // After diacritics removal, keep it ASCII-only for compatibility.
        s = s.replace(/[^a-z0-9\s]/g, ' ');
        s = s.replace(/\s+/g, ' ').trim();
        return s;
      }

      function tokenize(normText) {
        const stop = new Set([
          'la','va','hoac','cua','cho','ve','o','toi','ban','minh','chung','toi','xin','vui','long','nhe','a','oi',
          'the','a','an','to','for','and','or','of','in','on','at','is','are','am','i','you','we','our','about','please'
        ]);
        return String(normText || '')
          .split(' ')
          .map(t => t.trim())
          .filter(t => t.length >= 2 && !stop.has(t));
      }

      function scoreTokens(queryTokens, candTokens, queryNorm, candNorm) {
        if (!candNorm) return 0;
        if (queryNorm === candNorm) return 1;
        if (queryNorm.includes(candNorm) || candNorm.includes(queryNorm)) return 0.92;

        const qSet = new Set(queryTokens);
        const cSet = new Set(candTokens);
        if (qSet.size === 0 || cSet.size === 0) return 0;

        let intersect = 0;
        for (const t of cSet) if (qSet.has(t)) intersect++;
        const union = qSet.size + cSet.size - intersect;
        const jaccard = union ? (intersect / union) : 0;
        const coverage = cSet.size ? (intersect / cSet.size) : 0;

        return (0.65 * jaccard) + (0.35 * coverage);
      }

      function findBestIntent(kb, queryNorm, queryTokens) {
        let best = null;
        for (const intent of kb.intents || []) {
          let bestScore = 0;
          const candidates = intent._candidates || [];
          const candidateTokens = intent._candidateTokens || [];
          for (let i = 0; i < candidates.length; i++) {
            const candNorm = candidates[i];
            const candTokens = candidateTokens[i] || [];
            const s = scoreTokens(queryTokens, candTokens, queryNorm, candNorm);
            if (s > bestScore) bestScore = s;
          }
          if (!best || bestScore > best.score) {
            best = { intent, score: bestScore };
          }
        }
        return best;
      }

      function findBestFaq(queryNorm, queryTokens, desiredLang) {
        const faqData = window.__icueFaqData;
        if (!faqData || typeof faqData !== 'object') return null;

        // Avoid answering in the wrong language via FAQ corpus.
        const faqLang = window.__icueFaqLang;
        if ((desiredLang === 'en' || desiredLang === 'vi') && (faqLang === 'en' || faqLang === 'vi') && faqLang !== desiredLang) {
          return null;
        }

        let best = null;
        for (const cat of Object.keys(faqData)) {
          const items = Array.isArray(faqData[cat]) ? faqData[cat] : [];
          for (const item of items) {
            const q = item?.q;
            const a = item?.a;
            if (!q || !a) continue;
            const qNorm = normalizeForSearch(q);
            const s = scoreTokens(queryTokens, tokenize(qNorm), queryNorm, qNorm);
            if (!best || s > best.score) {
              best = { question: q, answer: String(a), score: s };
            }
          }
        }
        return best;
      }
    }

    // Function to set up chatbot events
    function setupChatbotEvents(chatbotKnowledge) {
        const chatbotToggle = document.getElementById('chatbot-toggle');
        const chatbotWindow = document.getElementById('chatbot-window');
        const chatbotClose = document.getElementById('chatbot-close');
        const chatbotInput = document.getElementById('chatbot-input');
        const chatbotSend = document.getElementById('chatbot-send');
        const chatbotMessages = document.getElementById('chatbot-messages');
        const suggestionBtns = document.querySelectorAll('.suggestion-btn');
        
        if (!chatbotToggle || !chatbotWindow) return;
        
        // Local storage chat history
        const CHAT_HISTORY_KEY = 'icueChatbotHistory:vi';
        
        function saveChatHistory(history) {
            try {
                localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
            } catch (e) {
                console.warn('Could not save chat history to localStorage:', e);
            }
        }
        
        function loadChatHistory() {
            try {
                const raw = localStorage.getItem(CHAT_HISTORY_KEY);
                return raw ? JSON.parse(raw) : [];
            } catch (e) {
                console.warn('Could not load chat history from localStorage:', e);
                return [];
            }
        }
        
        let chatHistory = loadChatHistory();
        
        function addMessageToHistory(messageObj) {
            chatHistory.push({
                ...messageObj,
                timestamp: new Date().toISOString()
            });
            // Keep only last 50 messages to prevent localStorage bloat
            if (chatHistory.length > 50) {
                chatHistory = chatHistory.slice(-50);
            }
            saveChatHistory(chatHistory);
        }
        
        function createMessageElement(msg) {
          const messageDiv = document.createElement('div');
          const role = msg?.role === 'user' ? 'user' : 'bot';
          const content = String(msg?.content ?? '');
          const links = Array.isArray(msg?.links) ? msg.links : [];
          messageDiv.className = `message ${role === 'user' ? 'user-message' : 'bot-message'}`;

          if (role === 'user') {
            messageDiv.innerHTML = `
              <div class="message-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div class="message-content"></div>
            `;
          } else {
            messageDiv.innerHTML = `
              <div class="message-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04 1.05 4.4L1 22l5.6-2.05C8.96 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
                </svg>
              </div>
              <div class="message-content"></div>
            `;
          }

          const contentEl = messageDiv.querySelector('.message-content');
          if (contentEl) contentEl.textContent = content;

          if (role === 'bot' && links.length && contentEl) {
            const linksWrap = document.createElement('div');
            linksWrap.className = 'chatbot-links';
            links.forEach((l) => {
              if (!l || !l.label || !l.url) return;
              const a = document.createElement('a');
              a.href = String(l.url);
              a.textContent = String(l.label);
              a.style.display = 'inline-block';
              a.style.marginRight = '10px';
              a.style.marginTop = '6px';
              a.style.textDecoration = 'underline';
              a.addEventListener('click', (e) => {
                // allow hash routing; prevent full page reload
                if (String(l.url).startsWith('#/')) {
                  e.preventDefault();
                  window.location.hash = l.url;
                }
              });
              linksWrap.appendChild(a);
            });
            contentEl.appendChild(document.createElement('br'));
            contentEl.appendChild(linksWrap);
          }

          return messageDiv;
        }

        function renderChatHistory() {
            // Clear existing messages except the initial bot message
            const initialMessage = chatbotMessages.querySelector('.bot-message');
            chatbotMessages.innerHTML = '';
            
            // Re-add initial message if no history exists
            if (chatHistory.length === 0 && initialMessage) {
                chatbotMessages.appendChild(initialMessage);
                return;
            }
            
            // Render history
            chatHistory.forEach(msg => {
              chatbotMessages.appendChild(createMessageElement(msg));
            });
            
            // Scroll to bottom
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }
        
        // Auto-close chatbot functionality
        function closeChatbot() {
            chatbotWindow.classList.remove('open');
            isOpen = false;
        }
        
        // Auto-close on page load and navigation
        window.addEventListener('DOMContentLoaded', closeChatbot);
        window.addEventListener('hashchange', closeChatbot);
        
        // Auto-close when drawer menu opens/closes
        const originalToggleDrawerMenu = window.toggleDrawerMenu;
        if (originalToggleDrawerMenu) {
            window.toggleDrawerMenu = function() {
                closeChatbot(); // Close chatbot when drawer menu is toggled
                return originalToggleDrawerMenu.apply(this, arguments);
            };
        }
        
        const originalCloseDrawerMenu = window.closeDrawerMenu;
        if (originalCloseDrawerMenu) {
            window.closeDrawerMenu = function() {
                closeChatbot(); // Close chatbot when drawer menu is closed
                return originalCloseDrawerMenu.apply(this, arguments);
            };
        }
        
        let isOpen = false;
        
        // Toggle chatbot window
        chatbotToggle.addEventListener('click', () => {
            isOpen = !isOpen;
            if (isOpen) {
                chatbotWindow.classList.add('open');
                // Render chat history when opening
                renderChatHistory();
            } else {
                chatbotWindow.classList.remove('open');
            }
        });
        
        // Close chatbot
        chatbotClose?.addEventListener('click', () => {
            isOpen = false;
            chatbotWindow.classList.remove('open');
        });
        
        // Send message function
        const sendMessage = async (message) => {
            if (!message.trim()) return;
            
            // Add to chat history
            addMessageToHistory({
                role: 'user',
                content: message.trim()
            });
            
            // Add user message to UI
            chatbotMessages.appendChild(createMessageElement({ role: 'user', content: message.trim() }));
            
            // Clear input
            chatbotInput.value = '';
            
            // Scroll to bottom
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
            
            // Simulate bot response delay
            setTimeout(async () => {
              const resp = await chatbotKnowledge.getResponse(message);
              addMessageToHistory({
                role: 'bot',
                content: resp.content,
                links: resp.links || []
              });
              chatbotMessages.appendChild(createMessageElement({
                role: 'bot',
                content: resp.content,
                links: resp.links || []
              }));
              chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
            }, 700);
        };
        
        // Send button click
        chatbotSend?.addEventListener('click', async () => {
          await sendMessage(chatbotInput.value);
        });
        
        // Enter key to send
        chatbotInput?.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
            await sendMessage(chatbotInput.value);
            }
        });
        
        // Suggestion buttons
        suggestionBtns.forEach(btn => {
          btn.addEventListener('click', async () => {
            await sendMessage(btn.textContent || '');
          });
        });
        
        // Company deck link to open chatbot
        const openChatbotLink = document.getElementById('open-chatbot-link');
        if (openChatbotLink) {
            openChatbotLink.addEventListener('click', (e) => {
                e.preventDefault();
                isOpen = true;
                chatbotWindow.classList.add('open');
            });
        }
    }
    
    // Bot response generator now lives in createChatbotKnowledge().
};

document.addEventListener("DOMContentLoaded", function() {

  function setupLanguageSwitcher() {
    const pageSwitch = document.getElementById("page-switch");
    const langIcon = document.getElementById("langSwitcher");

    if (!pageSwitch || !langIcon) return;

    let currentHost = window.location.host;
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    const currentSearch = window.location.search;
    const currentProtocol = window.location.protocol;

    const siteConfig = {
      vietnamese: {
        domain: "icue.vn",
        flagClass: "flag-icon-vn",
        language: "vi"
      },
      english: {
        domain: "en.icue.vn", 
        flagClass: "flag-icon-gb",
        language: "en"
      }
    };

    // Handle localhost/development environment
    if (currentHost.includes("localhost") || currentHost.includes("127.0.0.1")) {
      // For local development, determine language from current site structure
      const isEnglishSite = currentHost.includes("en") || 
                           document.documentElement.lang === "en" ||
                           document.querySelector('meta[name="language"]')?.content === "en";
      
      currentHost = isEnglishSite ? siteConfig.english.domain : siteConfig.vietnamese.domain;
    }

    // Determine current site and target site
    let currentSite, targetSite;
    
    if (currentHost.startsWith("en.") || currentHost === siteConfig.english.domain) {
      currentSite = siteConfig.english;
      targetSite = siteConfig.vietnamese;
    } else {
      currentSite = siteConfig.vietnamese;
      targetSite = siteConfig.english;
    }

    // Get current page from hash or determine from context
    function getCurrentPage() {
      console.log('[Language Switcher] Detecting current page...');
      console.log('[Language Switcher] Current hash:', currentHash);
      console.log('[Language Switcher] Current path:', currentPath);
      console.log('[Language Switcher] Current URL:', window.location.href);
      
      // Check hash-based routing first (most reliable for SPA)
      if (currentHash && currentHash.startsWith('#/')) {
        const hashPage = currentHash.substring(2); // Remove '#/'
        console.log('[Language Switcher] Detected hash page:', hashPage);
        return hashPage;
      }
      
      if (typeof window.currentPage !== 'undefined' && window.currentPage) {
        console.log('[Language Switcher] Found global currentPage:', window.currentPage);
        return window.currentPage;
      }
      
      const activeNavLink = document.querySelector('nav a.active, .menu a.active, .drawer-menu a.active, [data-page].active');
      if (activeNavLink) {
        const dataPage = activeNavLink.getAttribute('data-page');
        if (dataPage) {
          console.log('[Language Switcher] Found active nav with data-page:', dataPage);
          return dataPage;
        }
      }
      
      // Check for data-page attribute on any currently highlighted/selected elements
      const currentPageElement = document.querySelector('[data-page].current, [data-page].selected');
      if (currentPageElement) {
        const dataPage = currentPageElement.getAttribute('data-page');
        console.log('[Language Switcher] Found current page element:', dataPage);
        return dataPage;
      }
      
      // Try to detect from URL path
      if (currentPath && currentPath !== '/') {
        const pathSegments = currentPath.split('/').filter(segment => segment);
        if (pathSegments.length > 0) {
          let pathPage = pathSegments[pathSegments.length - 1];
          // Remove .html extension if present
          pathPage = pathPage.replace('.html', '');
          console.log('[Language Switcher] Detected path page:', pathPage);
          
          // Check for static pages that don't follow hash routing
          if (['donations', 'gdpr', 'privacy', 'recruitment', 'terms', 'faqs'].includes(pathPage.toLowerCase())) {
            return pathPage.toLowerCase();
          }
          
          return pathPage;
        }
      }
      
      // Try to detect from page title or meta tags
      const titleElement = document.querySelector('title');
      if (titleElement) {
        const title = titleElement.textContent.toLowerCase();
        console.log('[Language Switcher] Checking title:', title);
        if (title.includes('about') || title.includes('chúng tôi')) return 'aboutUs';
        if (title.includes('service') || title.includes('dịch vụ')) return 'Services';
        if (title.includes('project') || title.includes('dự án')) return 'pastProjects';
        if (title.includes('news') || title.includes('tin tức')) return 'News';
        if (title.includes('contact') || title.includes('liên hệ')) return 'Contact';
        if (title.includes('people') || title.includes('nhân lực')) return 'ourPeople';
        if (title.includes('work') || title.includes('công việc')) return 'ourWork';
        if (title.includes('structure') || title.includes('cơ cấu')) return 'orgStructure';
        if (title.includes('expert') || title.includes('chuyên gia')) return 'meetOurExperts';
        if (title.includes('core') || title.includes('cán bộ')) return 'coreTeam';
        if (title.includes('donation') || title.includes('quyên góp')) return 'donations';
        if (title.includes('gdpr')) return 'gdpr';
        if (title.includes('privacy') || title.includes('bảo mật') || title.includes('riêng tư')) return 'privacy';
        if (title.includes('recruitment') || title.includes('tuyển dụng')) return 'recruitment';
        if (title.includes('terms') || title.includes('điều khoản')) return 'terms';
        if (title.includes('faq') || title.includes('hỏi đáp')) return 'faqs';
        if (title.includes('notableAward') || title.includes('giải thưởng nổi bật')) return 'notableAwards';
        if (title.includes('community') || title.includes('cộng đồng')) return 'communityActivities';
        if (title.includes('cookies') || title.includes('cookies')) return 'cookies';
      }
      
      // Try to detect from current content or active elements
      const activeNavLinkText = document.querySelector('nav a.active, .menu a.active, .drawer-menu a.active');
      if (activeNavLinkText) {
        const linkText = activeNavLinkText.textContent.toLowerCase().trim();
        console.log('[Language Switcher] Found active nav link:', linkText);
        if (title.includes('about') || title.includes('chúng tôi')) return 'aboutUs';
        if (title.includes('service') || title.includes('dịch vụ')) return 'Services';
        if (title.includes('project') || title.includes('dự án')) return 'pastProjects';
        if (title.includes('news') || title.includes('tin tức')) return 'News';
        if (title.includes('contact') || title.includes('liên hệ')) return 'Contact';
        if (title.includes('people') || title.includes('nhân lực')) return 'ourPeople';
        if (title.includes('work') || title.includes('công việc')) return 'ourWork';
        if (title.includes('structure') || title.includes('cơ cấu')) return 'orgStructure';
        if (title.includes('expert') || title.includes('chuyên gia')) return 'meetOurExperts';
        if (title.includes('core') || title.includes('cán bộ')) return 'coreTeam';
        if (title.includes('donation') || title.includes('quyên góp')) return 'donations';
        if (title.includes('gdpr')) return 'gdpr';
        if (title.includes('privacy') || title.includes('bảo mật') || title.includes('riêng tư')) return 'privacy';
        if (title.includes('recruitment') || title.includes('tuyển dụng')) return 'recruitment';
        if (title.includes('terms') || title.includes('điều khoản')) return 'terms';
        if (title.includes('faq') || title.includes('hỏi đáp')) return 'faqs';
        if (title.includes('notableAward') || title.includes('giải thưởng nổi bật')) return 'notableAwards';
        if (title.includes('community') || title.includes('cộng đồng')) return 'communityActivities';
        if (title.includes('cookies') || title.includes('cookies')) return 'cookies';
      }
      
      // Check for specific content identifiers on the page
      const contentArea = document.querySelector('#content, main, .content, .page-content');
      if (contentArea) {
        const contentText = contentArea.textContent.toLowerCase();
        console.log('[Language Switcher] Checking content for page indicators...');
        if (contentText.includes('about') || contentText.includes('giới thiệu')) return 'aboutUs';
        if (contentText.includes('organization') || contentText.includes('cơ cấu')) return 'orgStructure';
        if (contentText.includes('our work') || contentText.includes('công việc')) return 'ourWork';
        if (contentText.includes('projects') || contentText.includes('dự án')) return 'pastProjects';
        if (contentText.includes('news') || contentText.includes('tin tức')) return 'News';
        if (contentText.includes('contact') || contentText.includes('liên hệ')) return 'Contact';
        if (contentText.includes('experts') || contentText.includes('chuyên gia')) return 'meetOurExperts';
        if (contentText.includes('core team') || contentText.includes('cán bộ')) return 'coreTeam';
        if (contentText.includes('donation') || contentText.includes('quyên góp')) return 'donations';
        if (contentText.includes('gdpr') || contentText.includes('gdpr')) return 'gdpr';
        if (contentText.includes('privacy') || contentText.includes('bảo mật') || contentText.includes('riêng tư')) return 'privacy';
        if (contentText.includes('recruitment') || contentText.includes('tuyển dụng')) return 'recruitment';
        if (contentText.includes('terms') || contentText.includes('điều khoản')) return 'terms';
        if (contentText.includes('faq') || contentText.includes('hỏi đáp')) return 'faqs';
        if (contentText.includes('notableAward') || contentText.includes('giải thưởng nổi bật')) return 'notableAwards';
        if (contentText.includes('community') || contentText.includes('cộng đồng')) return 'communityActivities';
        if (contentText.includes('cookies') || contentText.includes('cookies')) return 'cookies';
      }
      
      // Default fallback
      console.log('[Language Switcher] Defaulting to Home page');
      return 'Home';
    }

    // Page mapping between languages (using actual page names from navigation)
    const pageMapping = {
      'Home': 'Home',
      'aboutUs': 'aboutUs', 
      'orgStructure': 'orgStructure',
      'ourWork': 'ourWork',
      'pastProjects': 'pastProjects',
      'News': 'News',
      'ourPeople': 'ourPeople',
      'meetOurExperts': 'meetOurExperts',
      'coreTeam': 'coreTeam',
      'Contact': 'Contact',
      'donations': 'donations',
      'gdpr': 'gdpr',
      'privacy': 'privacy',
      'recruitment': 'recruitment',
      'terms': 'terms',
      'faqs': 'faqs',
      'notableAwards': 'notableAwards',
      'communityActivities': 'communityActivities',
      'cookies': 'cookies',
    };

    // Get current page and map to target page
    const currentPageName = getCurrentPage();
    const targetPageName = pageMapping[currentPageName] || 'Home';
    
    console.log('[Language Switcher] Current page detected:', currentPageName);
    console.log('[Language Switcher] Target page mapped:', targetPageName);
    
    // Static pages that can be accessed via hash routing
    const staticPages = ['donations', 'gdpr', 'privacy', 'recruitment', 'terms', 'faqs', 'cookies', 'notableAwards', 'communityActivities'];
    
    // Build target path - using hash-based routing for consistency
    let targetPath = '';
    console.log('🔧 [DEBUG] Building target path for:', targetPageName);
    if (targetPageName === 'Home') {
      targetPath = '#/Home';
      console.log('🔧 [DEBUG] Home page - hash path:', targetPath);
    } else if (staticPages.includes(targetPageName)) {
      // Use hash-based routing for static pages too
      targetPath = `#/${targetPageName}`;
      console.log('🔧 [DEBUG] Static page - hash path:', targetPath);
    } else {
      // Hash-based routing for main navigation pages
      targetPath = `#/${targetPageName}`;
      console.log('🔧 [DEBUG] Regular page - hash path:', targetPath);
    }
    
    // Build target URL with mapped page (no extra slash before hash)
    const targetUrl = `${currentProtocol}//${targetSite.domain}${targetPath}${currentSearch}`;
    
    console.log('[Language Switcher] Target URL (hash-based):', targetUrl);
    
    // Update the language switcher elements
    langIcon.className = `flag-icon ${targetSite.flagClass}`;
    pageSwitch.href = targetUrl;
    
    // Optional: Add aria-label for accessibility
    pageSwitch.setAttribute('aria-label', `Switch to ${targetSite.language === 'en' ? 'English' : 'Vietnamese'} version`);
    
    // Optional: Add data attributes for easier debugging/testing
    pageSwitch.setAttribute('data-current-lang', currentSite.language);
    pageSwitch.setAttribute('data-target-lang', targetSite.language);
    pageSwitch.setAttribute('data-target-domain', targetSite.domain);

    // Add click event for analytics or additional handling
    pageSwitch.addEventListener('click', function(e) {
      // Optional: Add analytics tracking
      if (typeof gtag !== 'undefined') {
        gtag('event', 'language_switch', {
          'from_language': currentSite.language,
          'to_language': targetSite.language,
          'current_page': currentPageName,
          'target_page': targetPageName,
          'target_url': targetUrl
        });
      }
      
      // Optional: Store language preference in localStorage
      try {
        localStorage.setItem('preferredLanguage', targetSite.language);
        localStorage.setItem('lastVisitedPage', targetPageName);
      } catch (error) {
        console.warn('Could not save language preference:', error);
      }
      
      // Set flag for static page initialization if switching to a static page
      if (staticPages.includes(targetPageName)) {
        try {
          sessionStorage.setItem('language_switch_to_static', targetPageName);
          console.log('[Language Switcher] Set static page flag for:', targetPageName);
        } catch (error) {
          console.warn('Could not set static page flag:', error);
        }
      }
      
      // Allow normal navigation to proceed
      return true;
    });

    console.log(`Language switcher configured: ${currentSite.language} (${currentPageName}) → ${targetSite.language} (${targetPageName})`);
    console.log(`Target URL: ${targetUrl}`);
  }
  
  // Initialize language switcher on page load
  setupLanguageSwitcher();
  
  window.addEventListener('popstate', function() {
    console.log('[Language Switcher] Popstate event, updating language switcher...');
    setTimeout(() => setupLanguageSwitcher(), 100); 
  });
});

function initializePageFunctions() {
  console.log('[Init] Initializing page functions...');

  // If `loadPage()` already initialized the current SPA route recently, skip.
  // This prevents duplicate init work (and duplicate listeners/animations) on Home load.
  try {
    const hash = window.location.hash || '#/Home';
    const pageFromHash = hash.replace('#/', '') || 'Home';
    const st = window.__pageInitState;
    if (st && st.page === pageFromHash && (Date.now() - st.time) < 1500) {
      console.log('[Init] Skipping: page already initialized by loadPage()', { page: pageFromHash });
      return;
    }
  } catch (e) {
    // ignore
  }
  
  let languageSwitchTarget = null;
  try {
    languageSwitchTarget = sessionStorage.getItem('language_switch_to_static');
    console.log('🔄 [DEBUG] Language switch target from sessionStorage:', languageSwitchTarget);
    if (languageSwitchTarget) {
      sessionStorage.removeItem('language_switch_to_static');
      console.log('[Init] Detected language switch to static page:', languageSwitchTarget);
    }
  } catch (e) {
    console.warn('[Init] Could not check language switch flag:', e);
  }
  
  requestAnimationFrame(() => {
    retriggerMenuAnimations();
    updateCalendarSvgTime();
    initAudioVisualizer();
    calendarModal();
    updateHamburgerIcon();
    if (window.ICUEFooter && typeof window.ICUEFooter.autoInject === 'function') {
      window.ICUEFooter.autoInject();
    }
    CommunityGallery.init();
    initializeChatbot();
   
    if (typeof initFrequentlyAskedQuestions === 'function') {
      initFrequentlyAskedQuestions();
      console.log('[Init] FAQ functions initialized globally');
    }
    
    if (typeof JobBoard !== 'undefined' && JobBoard.init) {
      JobBoard.init();
      console.log('[Init] JobBoard initialized globally');
    }
    
    if (typeof DonationForm !== 'undefined' && DonationForm.init) {
      DonationForm.init();
      console.log('[Init] DonationForm initialized globally');
    }
    
    if (typeof AwardsPage !== 'undefined' && AwardsPage.init) {
      AwardsPage.init();
      console.log('[Init] AwardsPage initialized globally');
    }
    
    if (typeof CommunityPage !== 'undefined' && CommunityPage.init) {
      CommunityPage.init();
      console.log('[Init] CommunityPage initialized globally');
    }
    
    // Page-specific initializations based on current path or hash
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    
    // static page OR hash-routed page
    const staticPages = ['donations', 'gdpr', 'privacy', 'recruitment', 'terms', 'faqs', 'cookies', 'notableAwards', 'communityActivities'];
    const isStaticPage = staticPages.some(page => currentPath.includes(`${page}.html`)) || languageSwitchTarget;
    const isHashRoutedPage = currentHash && staticPages.some(page => currentHash.includes(page));
    
    console.log('📄 [DEBUG] languageSwitchTarget:', languageSwitchTarget);
    
    if (isStaticPage || languageSwitchTarget || isHashRoutedPage) {
      console.log('✅ [DEBUG] Static/Hash page detected, proceeding with initialization...');
      console.log('[Init] Detected static or hash-routed page, initializing specific functions...');
      
      // Determine which page
      let pageName = languageSwitchTarget;
      if (!pageName && isStaticPage) {
        pageName = staticPages.find(page => currentPath.includes(`${page}.html`));
      }
      if (!pageName && isHashRoutedPage) {
        pageName = staticPages.find(page => currentHash.includes(page));
      }
      console.log('🎯 [DEBUG] Determined pageName:', pageName);
      
      if (pageName === 'recruitment' || currentPath.includes('recruitment.html')) {
        if (typeof JobBoard !== 'undefined' && JobBoard.init) {
          JobBoard.init();
          console.log('[Init] JobBoard initialized');
        }
      } else if (pageName === 'donations' || currentPath.includes('donations.html')) {
        if (typeof DonationForm !== 'undefined' && DonationForm.init) {
          DonationForm.init();
          console.log('[Init] DonationForm initialized');
        }
      } else if (pageName === 'faqs' || currentPath.includes('faqs.html')) {
        if (typeof initFrequentlyAskedQuestions === 'function') {
          initFrequentlyAskedQuestions();
          console.log('[Init] FAQ functions initialized');
        }
      } else if (pageName === 'notableAwards' || currentPath.includes('notableAwards.html')) {
        if (typeof AwardsPage !== 'undefined' && AwardsPage.init) {
          AwardsPage.init();
          console.log('[Init] AwardsPage initialized');
        }
      } else if (pageName === 'communityActivities' || currentPath.includes('communityActivities.html')) {
        if (typeof CommunityPage !== 'undefined' && CommunityPage.init) {
          CommunityPage.init();
          console.log('[Init] CommunityPage initialized');
        }
      }
      
      // Add a small delay to ensure DOM is ready for static pages
      setTimeout(() => {
        console.log('[Init] Static page initialization complete for:', pageName);
      }, 100);
    }
    
    console.log('[Init] Page functions initialization complete');
  });
}

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

   
//Work-Page Script
window.initializeCarousel = () => {
  const nextButton = document.getElementById("work-next");
  const prevButton = document.getElementById("work-prev");
  const carousel = document.querySelector(".work-carousel");

  if (!nextButton || !prevButton || !carousel) {
    console.warn("Carousel initialization failed. Missing key DOM elements.");
    return;
  }

  const slider = carousel.querySelector(".work-list");
  const thumbnails = carousel.querySelector(".work-thumbnail");
  const timeBar = carousel.querySelector(".work-time");

  if (!slider || !thumbnails || !timeBar) {
    console.warn("Carousel structure incomplete.");
    return;
  }

  let autoAdvanceTimeout;
  let animationTimeout;
  const timeRunning = 3000;
  const timeAutoNext = 25000;

  const resetAutoAdvance = () => {
    clearTimeout(autoAdvanceTimeout);
    autoAdvanceTimeout = setTimeout(() => nextButton.click(), timeAutoNext);
  };

  const showSlide = (direction) => {
    const items = slider.querySelectorAll(".work-item");
    const thumbs = thumbnails.querySelectorAll(".work-item");

    if (direction === "work-next") {
      slider.appendChild(items[0]);
      thumbnails.appendChild(thumbs[0]);
      carousel.classList.add("work-next");
    } else if (direction === "work-prev") {
      slider.prepend(items[items.length - 1]);
      thumbnails.prepend(thumbs[thumbs.length - 1]);
      carousel.classList.add("work-prev");
    }
    clearTimeout(animationTimeout);
    animationTimeout = setTimeout(() => {
      carousel.classList.remove("work-next", "work-prev");
    }, timeRunning);

    resetAutoAdvance();
  };

  const goToSlide = (targetIndex) => {
  const currentSlide = slider.querySelector(".work-item");
  const currentIndex = parseInt(currentSlide.dataset.index, 10);

  if (targetIndex === currentIndex) return; // already active

  let steps = targetIndex - currentIndex;
  const totalItems = slider.querySelectorAll(".work-item").length;

  // Handle wrap-around (shortest path logic)
  if (steps < 0) steps += totalItems;

  for (let i = 0; i < steps; i++) {
    slider.appendChild(slider.firstElementChild);
    thumbnails.appendChild(thumbnails.firstElementChild);
  }

  carousel.classList.add("work-jump");

  clearTimeout(animationTimeout);
  animationTimeout = setTimeout(() => {
    carousel.classList.remove("work-jump");
  }, timeRunning);

  resetAutoAdvance();
};

  // Add click events to thumbnails
const initThumbnailClick = () => {
  const thumbItems = Array.from(thumbnails.querySelectorAll(".work-item"));
    thumbItems.forEach((thumb, index) => {
      thumb.addEventListener("click", () => {
        goToSlide(index);
      });
    });
  };

  initThumbnailClick();
  resetAutoAdvance();

  nextButton.onclick = () => showSlide("work-next");
  prevButton.onclick = () => showSlide("work-prev");
  carousel.setAttribute('data-loaded', 'true');
};

window.updateCalendarSvgTime = () => {
    const calendarMonthElement = document.getElementById('calendar-month');
    const calendarDayElement = document.getElementById('calendar-day');
    const calendarTimeElement = document.getElementById('calendar-time');

    if (!calendarMonthElement || !calendarDayElement || !calendarTimeElement) {
        console.warn("One or more calendar SVG text elements not found. Make sure IDs are correct.");
        return;
    }

    const now = new Date();

    const month = now.toLocaleString('en-US', { month: 'long' });

    const day = now.getDate();

    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // The hour '0' (midnight) should be '12'
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;

    const timeString = `${hours}:${formattedMinutes}${ampm}`;

    calendarMonthElement.textContent = month;
    calendarDayElement.textContent = day;
    calendarTimeElement.textContent = timeString;

    // Log for debugging (optional)
    console.log(`Updated calendar SVG: ${month} ${day}, ${timeString}`);
}

// Initial update when the page loads
updateCalendarSvgTime();

// Update the time every minute (60,000 milliseconds)
setInterval(updateCalendarSvgTime, 60 * 1000);

function initAudioVisualizer(
    audioSrc = 'public/music/royalty_free.mp3',
  barSelector = '.music-bars',
    clickTargetSelector = '#visualizer'
  ) {
    const clickTarget = document.querySelector(clickTargetSelector);

    const bindClickOnce = (audio, ctx) => {
      if (!clickTarget) return;
      // Element may be recreated on SPA navigation; bind at most once per element.
      if (clickTarget.hasAttribute('data-av-click-bound')) return;
      clickTarget.setAttribute('data-av-click-bound', '1');
      clickTarget.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (ctx.state === 'suspended') ctx.resume();
        audio.paused ? audio.play() : audio.pause();
      });
    };
  
    if (window.__audioVisualizer) {
      const { audio, ctx } = window.__audioVisualizer;

      bindClickOnce(audio, ctx);
      // Ensure loop is running if/when the visualizer exists.
      if (typeof startAudioVisualizerLoop === 'function') startAudioVisualizerLoop(barSelector);
      return;
    }
  
    const audio = new Audio(audioSrc);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    source.connect(analyser);
    analyser.connect(ctx.destination);
  
    const freqData = new Uint8Array(analyser.frequencyBinCount);
  
    window.__audioVisualizer = {
      audio,
      ctx,
      analyser,
      freqData
    };

    bindClickOnce(audio, ctx);
    if (typeof startAudioVisualizerLoop === 'function') startAudioVisualizerLoop(barSelector);
  }
  
  function startAudioVisualizerLoop(barSelector = '.music-bars') {
    const vizState = window.__audioVisualizerLoopState || {
      rafId: null,
      isRunning: false,
      lastTs: 0,
      cachedBars: null
    };
    window.__audioVisualizerLoopState = vizState;

    if (vizState.isRunning) return;

    const stopLoop = () => {
      vizState.isRunning = false;
      if (vizState.rafId) {
        cancelAnimationFrame(vizState.rafId);
        vizState.rafId = null;
      }
      vizState.cachedBars = null;
      vizState.lastTs = 0;
    };

    const loop = (ts) => {
      if (!vizState.isRunning) return;
      const av = window.__audioVisualizer;
      if (!av?.analyser) {
        stopLoop();
        return;
      }

      if (!vizState.cachedBars || vizState.cachedBars.length === 0 || !vizState.cachedBars[0].isConnected) {
        vizState.cachedBars = document.querySelectorAll(barSelector);
      }
      const bars = vizState.cachedBars || [];
      if (!bars.length) {
        stopLoop();
        return;
      }

      if (!document.hidden && ts - vizState.lastTs >= 33) {
        vizState.lastTs = ts;
        const { analyser, freqData } = av;
        analyser.getByteFrequencyData(freqData);
        bars.forEach((bar, i) => {
          const value = freqData[i];
          const scale = Math.max(0.5, value / 180);
          bar.style.transform = `scaleY(${scale})`;
        });
      }

      vizState.rafId = requestAnimationFrame(loop);
    };

    vizState.isRunning = true;
    vizState.lastTs = 0;
    vizState.rafId = requestAnimationFrame(loop);
  }

  function updateMusicBarColor(page) {
    const paths = document.querySelectorAll('.music-bars svg path');
  
    let color = '#000000'; // default
  
    switch (page) {
      case 'ourWork':
        color = '#ffcc00';
        break;
      case 'Contact':
        color = '#210000ff';
        break;
      case 'Home':
        color = '#ffffff';
        break;
      case 'pastProjects':
        color = '#a1c900ff';
        break;
      case 'communityActivities':
        color = '#ffffff';
        break;
      case 'aboutUs':
        color = '#9df8bd';
        break;
      default:
        color = '#000000';
    }
  
    paths.forEach(path => {
      path.setAttribute('stroke', color);
      path.setAttribute('fill', color); 
    });
  }

  function updateHamburgerIcon(page) {
    const darkBackgroundPages = ['communityActivities', 'aboutUs'];
    const useLightNav = darkBackgroundPages.includes(page);
    if (typeof window.setNavLinkContrast === 'function') {
      window.setNavLinkContrast(useLightNav);
    }
  }

  function enableCursorGradientTrail(color = 'yellow') {
    document.addEventListener('mousemove', (e) => {
      const trail = document.createElement('div');
      trail.className = 'cursor-trail';
  
      // Optional: customize color dynamically
      trail.style.background = `radial-gradient(circle, ${color}, transparent 60%)`;
  
      // Position at mouse location
      trail.style.left = `${e.clientX}px`;
      trail.style.top = `${e.clientY}px`;
  
      document.body.appendChild(trail);
  
      setTimeout(() => {
        trail.remove();
      }, 500); 
    });
  }
  
  enableCursorGradientTrail(); 

  window.preloadProfileImages = () => {
  // Images for meetourexperts.html
  const expertImages = [
    "public/profilePhotos/hanhnguyen.jpg",
     "public/profilePhotos/tam.png",
    "public/profilePhotos/tranthilananh.jpg",
    "public/profilePhotos/tranquoctoan.jpg",
    "public/profilePhotos/giaminh.jpg"
  ];
  // Images for coreTeam.html
  const coreTeamImages = [
    "public/profilePhotos/lyly.png",
    "public/profilePhotos/duong.png",
    "public/profilePhotos/tinh.png",
    "public/profilePhotos/lyicue.png",
    "public/profilePhotos/hien.png"
  ];
  [...expertImages, ...coreTeamImages].forEach(src => {
    const img = new Image();
    img.src = src;
  });
};

window.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 [DEBUG] Main DOMContentLoaded fired - calling preloadProfileImages');
  window.preloadProfileImages();
});

// hashchange is handled by `router`, and `loadPage` already sets `__pageInitState`
// so `initializePageFunctions` will early-exit. No need for redundant listeners here.