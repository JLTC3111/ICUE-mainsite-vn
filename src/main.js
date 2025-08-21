import './script.js';

const AOSManager = (() => {
  const originalAOS = new Map();

  function cacheAOSAttributes() {
  document.querySelectorAll('.card.image-card').forEach(el => {
    if (!originalAOS.has(el)) {
      originalAOS.set(el, el.getAttribute('data-aos'));
    }
  });
}

function restoreAOSAttributes() {
  console.log('[AOS] Restoring AOS attributes');
  originalAOS.forEach((value, el) => {
    el.setAttribute('data-aos', value || 'flip-down');
    el.classList.add('aos-init'); // Add AOS classes back
    el.classList.remove('aos-animate'); 
    el.style.opacity = null; // Reset styles
    el.style.transform = null;
    el.style.filter = null;
  });

  if (window.AOS) {
    window.AOS.refreshHard(); // Recalculate positions and states
  }
}

function clearAOSAttributes() {
    console.log('[AOS] Clearing AOS attributes');
    document.querySelectorAll('[data-aos]').forEach(el => {
      if (!originalAOS.has(el)) {
        originalAOS.set(el, el.getAttribute('data-aos'));
      }
      el.removeAttribute('data-aos');
      el.classList.remove('aos-init', 'aos-animate');
      el.style.opacity = 1;
      el.style.transform = 'none';
      el.style.filter = 'none';
    });
  }

window.handleAOSByScreenSize = () => {
  const width = window.innerWidth;
    console.log(`[AOS] Window resized to: ${width}px`);

  if (typeof window.AOS === 'undefined') {
    console.warn('[AOS] AOS library not loaded.');
    return;
  }

  if (width < 1025) {
    console.log('[AOS] Small screen – disabling AOS');
    clearAOSAttributes();
  } else {
    console.log('[AOS] Large screen mode – Enabling AOS');
    restoreAOSAttributes();
    window.AOS.init({
      disable: false,
      duration: 1850,
      offset: 225,
      once: false
    });
  }
}

  return { handleAOSByScreenSize, cacheAOSAttributes };
})();

window.handleAOSByScreenSize = AOSManager.handleAOSByScreenSize;

// Debounce utility
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

window.addEventListener('resize', debounce(() => {
  console.log('[AOS] Resize triggered');
  AOSManager.handleAOSByScreenSize();
}, 50));

window.addEventListener('DOMContentLoaded', () => {
  AOSManager.cacheAOSAttributes();
  console.log('[AOS] DOMContentLoaded');
  AOSManager.handleAOSByScreenSize();
});

(function (global) {
    function injectFooter(targetSelector = 'body') {
        try {
            const css = `
footer {
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
    display: flex;
    flex-direction: column;
    padding: 15px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.footer-container {
    max-width: 100vw;
    margin: 0 auto;
    padding: 35px;
    display: grid;
    grid-template-columns: minmax(200px, 2fr) minmax(125px, 1fr) minmax(150px, 1fr);
    gap: clamp(50px, 17.5vw, 450px);
    align-items: start;
    justify-content: center;
}
.footer-section {
    display: block;
}
.footer-section h3 {
    color: #ffffff;
    font-size: clamp(14px, 2.5vw, 18px);
    font-weight: 500;
    margin-bottom: 15px;
    text-align: center;
    transition: transform 0.3s ease;
}
.footer-section h3:hover {
    transform: scale(1.025);
}
.footer-section a {
    display: block;
    color: #888;
    font-size: clamp(12px, 2.5vw, 15px);
    text-decoration: none;
    margin-bottom: 12px;
    text-align: center;
    transition: color 0.3s ease;
}
.footer-section a:hover {
    color: #c8ff00;
    text-decoration: underline;
}
.footer-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}
.badge {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 175px;
    color: #888;
    font-size: clamp(10px, 2.5vw, 14px);
    padding: 8px 12px;
    margin-top: 5px;
    border-radius: 6px;
    position: relative;
    cursor: pointer;
    transition: all 0.3s ease;
}

.badge:hover {
    filter: brightness(1.5);
    text-decoration: underline;
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-1.5px);
}

.badge::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: #fff;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 1000;
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 8px;
}

.badge::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #1a1a1a;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 1001;
    margin-bottom: 3px;
}

.badge:hover::after,
.badge:hover::before {
    opacity: 1;
    visibility: visible;
}

.badge.trustwave {
    color: #ffd700;
}

.badge.ssl {
    color: #4CAF50;
}

.badge.payment {
    color: #2196F3;
}
.footer-bottom {
    width: 100%;
    padding: 15px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.footer-bottom-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}
.footer-bottom-left a {
    color: #666;
    text-decoration: none;
    font-size: clamp(12px, 1.5vw, 14px);
    transition: color 0.3s ease;
}
.footer-bottom-left a:hover {
    color: #c8ff00;
    text-decoration: underline;
}
.footer-bottom-left span {
    color: #333;
    font-size: clamp(12px, 1.5vw, 14px);
}
.footer-bottom-right {
    display: flex;
    align-items: center;
}
.company-deck {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    background: #c8ff00;
    color: #000;
    padding: 8px 20px;
    border-radius: 50px;
    text-decoration: none;
    font-size: 14px;
    transition: all 0.4s ease;
    overflow: hidden;
    z-index: 1;
}
.company-deck::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to right, #ffffff, #ffffff, #ffffff, #ffffff);
    z-index: -1;
    transform: translateX(-100%);
    transition: transform 0.4s ease-out;
    border-radius: 50px;
}
.company-deck:hover::before {
    transform: translateX(0%);
}
.company-deck:hover {
    color: #000000;
}
.company-deck svg {
    width: 14px;
    height: 14px;
}
.footer-toggle {
    color: #ffffff;
    background: none;
    font-size: clamp(14px, 2.5vw, 18px);
    font-weight: 500;
    text-align: center;
    margin-bottom: 15px;
    cursor: pointer;
    width: 100%;
    padding: 10px 0;
    transition: transform 0.3s ease;
}
.footer-toggle:hover {
    transform: scale(1.025);
}
.collapsible {
    display: flex;
    flex-direction: column;
    gap: 15px;
}
.underline-hover {
  position: relative;
  display: inline-block;
  color: #fff;
  text-decoration: none;
}
.underline-hover::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 25%; 
  width: 50%; 
  height: 1px;
  background-color: #ffffff;
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.3s ease;
}
.underline-hover:hover::after {
  transform: scaleX(1);
}

@media (max-width: 768px) {
    footer { padding: 60px 30px 40px; }
    .footer-toggle {
        text-decoration: underline;
    }
    .footer-container { grid-template-columns: 1fr; gap: 30px; padding: 20px; }
    .footer-bottom { flex-direction: column; gap: 15px; text-align: center; }
    .footer-bottom-left { justify-content: center; }
}
`;

      const html = `
        <footer>
            <div class="footer-container">
                <div class="footer-section">
                    <button class="footer-toggle underline-hover" aria-expanded="false">
                        Công Ty
                    </button>
                    <div class="collapsible">
                        <a href="#/notableAwards">Giải Thưởng Nổi Bật</a>
                        <a href="#/communityActivities">Hoạt Động Cộng Đồng</a>
                    </div>
                </div>
                <div class="footer-section">
                    <button class="footer-toggle underline-hover" aria-expanded="false">
                        Các Trang Khác
                    </button>
                    <div class="collapsible">
                        <a href="#/FAQs">Câu Hỏi Thường Gặp</a>
                        <a href="#/recruitment">Tuyển Dụng</a>
                        <a href="#/donations">Quyên Góp</a>
                    </div>
                </div>
                <div class="footer-brand">
                        <div class="security-badges">
                            <div class="badge trustwave" data-tooltip="Verified by Trustwave">
                                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="#fff" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M11.5283 1.5999C11.7686 1.29437 12.2314 1.29437 12.4717 1.5999L14.2805 3.90051C14.4309 4.09173 14.6818 4.17325 14.9158 4.10693L17.7314 3.3089C18.1054 3.20292 18.4799 3.475 18.4946 3.86338L18.6057 6.78783C18.615 7.03089 18.77 7.24433 18.9984 7.32823L21.7453 8.33761C22.1101 8.47166 22.2532 8.91189 22.0368 9.23478L20.4078 11.666C20.2724 11.8681 20.2724 12.1319 20.4078 12.334L22.0368 14.7652C22.2532 15.0881 22.1101 15.5283 21.7453 15.6624L18.9984 16.6718C18.77 16.7557 18.615 16.9691 18.6057 17.2122L18.4946 20.1366C18.4799 20.525 18.1054 20.7971 17.7314 20.6911L14.9158 19.8931C14.6818 19.8267 14.4309 19.9083 14.2805 20.0995L12.4717 22.4001C12.2314 22.7056 11.7686 22.7056 11.5283 22.4001L9.71949 20.0995C9.56915 19.9083 9.31823 19.8267 9.08421 19.8931L6.26856 20.6911C5.89463 20.7971 5.52014 20.525 5.50539 20.1366L5.39427 17.2122C5.38503 16.9691 5.22996 16.7557 5.00164 16.6718L2.25467 15.6624C1.88986 15.5283 1.74682 15.0881 1.96317 14.7652L3.59221 12.334C3.72761 12.1319 3.72761 11.8681 3.59221 11.666L1.96317 9.23478C1.74682 8.91189 1.88986 8.47166 2.25467 8.33761L5.00165 7.32823C5.22996 7.24433 5.38503 7.03089 5.39427 6.78783L5.50539 3.86338C5.52014 3.475 5.89463 3.20292 6.26857 3.3089L9.08421 4.10693C9.31823 4.17325 9.56915 4.09173 9.71949 3.90051L11.5283 1.5999Z" stroke="#000000" stroke-width="1.5"></path> <path d="M9 12L11 14L15 10" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
                                Trustwave Verified
                            </div>
                            <div class="badge ssl" data-tooltip="Mã hóa SSL 256-bit bảo mật tất cả các giao dịch">
                                <svg width="16px" height="16px" viewBox="0 0 8.4666669 8.4666669" id="svg8" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:svg="http://www.w3.org/2000/svg">

                                <defs id="defs2"/>

                                <g id="layer1" transform="translate(0,-288.53332)">

                                <path d="M 16,1 C 12.139297,1 9,4.1392882 9,8 v 5 H 7 c -0.5522619,5.5e-5 -0.9999448,0.447738 -1,1 v 16 c 5.52e-5,0.552262 0.4477381,0.999945 1,1 h 18 c 0.552262,-5.5e-5 0.999945,-0.447738 1,-1 V 14 c -5.5e-5,-0.552262 -0.447738,-0.999945 -1,-1 H 23 V 8 C 23,4.1392882 19.860703,1 16,1 Z m 0,2 c 2.787297,0 5,2.212674 5,5 v 5 H 11 V 8 C 11,5.212674 13.212703,3 16,3 Z M 8,15 H 24 V 29 H 8 Z" id="rect864" style="color:#ffffff;font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:medium;line-height:normal;font-family:sans-serif;font-variant-ligatures:normal;font-variant-position:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-alternates:normal;font-feature-settings:normal;text-indent:0;text-align:start;text-decoration:none;text-decoration-line:none;text-decoration-style:solid;text-decoration-color:#ffffff;letter-spacing:normal;word-spacing:normal;text-transform:none;writing-mode:lr-tb;direction:ltr;text-orientation:mixed;dominant-baseline:auto;baseline-shift:baseline;text-anchor:start;white-space:normal;shape-padding:0;clip-rule:nonzero;display:inline;overflow:visible;visibility:visible;opacity:1;isolation:auto;mix-blend-mode:normal;color-interpolation:sRGB;color-interpolation-filters:linearRGB;solid-color:#ffffff;solid-opacity:1;vector-effect:none;fill:#ffffff;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:1.99999988;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;paint-order:stroke fill markers;color-rendering:auto;image-rendering:auto;shape-rendering:auto;text-rendering:auto;enable-background:accumulate" transform="matrix(0.26458333,0,0,0.26458333,0,288.53332)"/>

                                <path d="m 4.4979169,294.36786 a 0.26458332,0.26458332 0 0 1 -0.2645833,0.26458 0.26458332,0.26458332 0 0 1 -0.2645833,-0.26458 0.26458332,0.26458332 0 0 1 0.2645833,-0.26458 0.26458332,0.26458332 0 0 1 0.2645833,0.26458 z" id="path877" style="opacity:1;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:0.52916664;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;paint-order:stroke fill markers"/>

                                </g>

                                </svg>
                                SSL Encrypted
                            </div>
                            <div class="badge payment" data-tooltip="Chúng tôi chấp nhận tất cả các phương thức thanh toán chính">
                                <svg fill="#ffffff" width="16px" height="16px" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M29.005 5.5h-26.009c-1.657 0-3 1.343-3 3v15c0 1.657 1.343 3 3 3h26.009c1.657 0 3-1.343 3-3v-15c0-1.657-1.343-3-3-3zM2.995 7.5h26.009c0.552 0 1 0.448 1 1v2h-28.009v-2c0-0.552 0.449-1 1-1zM29.005 24.5h-26.009c-0.552 0-1-0.448-1-1v-9h28.009v9c0 0.552-0.448 1-1 1z"></path> </g></svg>
                                Visa | MasterCard
                            </div>
                        </div>
                    </div>
            </div>
            <div class="footer-bottom">
                <div class="footer-bottom-left">
                    <a href="#/privacy">Chính Sách</a>
                    <span>|</span>
                    <a href="#/terms">Điều Khoản</a>
                    <span>|</span>
                    <a href="#/gdpr">GDPR</a>
                    <span>|</span>
                    <a href="#/cookies">Cookies</a>
                </div>
                <div class="footer-bottom-right">
                    <a href="#" class="company-deck">
                        Hợp Tác Cùng Chúng Tôi
                        <svg fill="currentColor" viewBox="0 0 24 24">
                            <path d="M7 14l5-5 5 5z"/>
                        </svg>
                    </a>
                </div>
            </div>
        </footer>
        `;
            // Inject CSS once
            if (!document.querySelector('#icue-footer-style')) {
                const styleElement = document.createElement('style');
                styleElement.id = 'icue-footer-style';
                styleElement.textContent = css;
                document.head.appendChild(styleElement);
            }

            // Inject HTML
            const targetElement = document.querySelector(targetSelector);
            if (!targetElement) {
                console.error('ICUEFooter: Target element not found');
                return false;
            }

            targetElement.insertAdjacentHTML('beforeend', html);

            // Optional JS behaviors
            const toggles = document.querySelectorAll(".footer-toggle");
            toggles.forEach(toggle => {
                toggle.addEventListener("click", () => {
                    const section = toggle.closest(".footer-section");
                    section.classList.toggle("open");
                    const expanded = toggle.getAttribute("aria-expanded") === "true";
                    toggle.setAttribute("aria-expanded", !expanded);
                });
            });

            console.log('ICUEFooter: Successfully injected footer');
            return true;
        } catch (error) {
            console.error('ICUEFooter: Error injecting footer', error);
            return false;
        }
    }

     function autoInjectFooter() {
        
        const injectIfMissing = () => {
            const allowedPages = ['#/aboutUs', '#/orgStructure', '#/meetOurExperts', '#/coreTeam', '#/Contact', '#/cookies', '#/privacy', '#/gdpr', '#/terms', '#/FAQs', '#/recruitment', '#/donations', '#/notableAwards', '#/communityActivities'];
            const currentPage = window.location.hash.trim();
            console.log("Current page:", currentPage);
            const normalizedPage = currentPage.replace(/\/$/, '').toLowerCase();

            if (!allowedPages.map(p => p.toLowerCase()).includes(normalizedPage)) {
                const footer = document.querySelector('footer'); 
                if (footer) {
                footer.remove();
            }
                return;
            }

            if (!document.querySelector('footer')) {
                injectFooter();
            } else {
                console.log("Footer already exists.");
            }
        };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', injectIfMissing);
            } else {
                console.log("Footer already exists, skipping injection.");
                injectIfMissing();
            }
    }

    // Expose globally
    global.ICUEFooter = {
        inject: injectFooter,
        autoInject: autoInjectFooter,
        injectInto(element) {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            if (!element) {
                console.error('ICUEFooter: Element not found');
                return false;
            }
            return injectFooter(element);
        },
        updateLinks(newLinks) {
            const footerColumns = document.querySelectorAll('.footer-section');
            if (newLinks.company && footerColumns[0]) {
                const companyLinks = footerColumns[0].querySelector('.collapsible');
                companyLinks.innerHTML = newLinks.company.map(link =>
                    `<a href="${link.url}">${link.text}</a>`
                ).join('');
            }
            if (newLinks.pages && footerColumns[1]) {
                const pageLinks = footerColumns[1].querySelector('.collapsible');
                pageLinks.innerHTML = newLinks.pages.map(link =>
                    `<a href="${link.url}">${link.text}</a>`
                ).join('');
            }
        }
    };
})(window);
