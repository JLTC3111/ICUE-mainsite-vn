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

.badge.norton {
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
    font-weight: 500;
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
    border: none;
    font-size: clamp(14px, 2.5vw, 18px);
    font-weight: 500;
    text-align: center;
    margin-bottom: 5px;
    cursor: pointer;
    width: 100%;
    padding: 10px 0;
    transition: transform 0.3s ease;
}
.footer-toggle:hover {
    transform: scale(1.025);
}
.footer-toggle .arrow {
    display: none;
    margin-left: 8px;
    transition: transform 0.3s ease;
}
.collapsible {
    display: flex;
    flex-direction: column;
}
@media (max-width: 768px) {
    footer { padding: 60px 30px 40px; }
    .footer-container { grid-template-columns: 1fr; gap: 30px; padding: 20px; }
    .footer-bottom { flex-direction: column; gap: 15px; text-align: center; }
    .footer-bottom-left { justify-content: center; }
}
`;

      const html = `
<footer>
    <div class="footer-container">
        <div class="footer-section">
            <button class="footer-toggle" aria-expanded="false">
                Công Ty
            </button>
            <div class="collapsible">
                <a href="#">Giải Thưởng Nổi Bật</a>
                <a href="#">Hoạt Động Cộng Đồng</a>
                <a href="#">Bản Tin</a>
            </div>
        </div>
        <div class="footer-section">
            <button class="footer-toggle" aria-expanded="false">
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
                    <div class="badge norton" data-tooltip="Được xác minh bởi Norton - Dữ liệu của bạn được bảo vệ">
                        <svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M12 2V7M12 2C11.2867 2 10.5909 2.07467 9.91991 2.21663M12 2C12.7132 2 13.4091 2.07467 14.08 2.21663M12 7C9.23855 7 7 9.2386 7 12M12 7C14.7614 7 17 9.2386 17 12M12 17V22M12 17C14.7614 17 17 14.7614 17 12M12 17C9.23855 17 7 14.7614 7 12M12 22C12.7122 22 13.407 21.9255 14.077 21.784M12 22C11.2851 22 10.5878 21.925 9.91545 21.7824M4.92891 4.92893L8.46444 8.46447M15.5355 15.5355L19.071 19.0711M2 12H7M2 12C2 12.7133 2.07466 13.4092 2.21664 14.0802M2 12C2 11.2857 2.07488 10.5888 2.21727 9.91683M17 12H22M22 12C22 11.2867 21.9253 10.5908 21.7833 9.91978M22 12C22 12.7131 21.9254 13.4086 21.7835 14.0794M4.92891 19.0711L8.46444 15.5355M15.5355 8.46447L19.071 4.92893M17.4466 3.61208C18.621 4.37619 19.6249 5.38023 20.3888 6.55469M20.386 17.4496C19.622 18.6229 18.6183 19.626 17.4445 20.3893M6.55371 20.3882C5.38104 19.6252 4.37831 18.623 3.61474 17.4508M3.61171 6.55387C4.37545 5.37994 5.37894 4.37633 6.55275 3.61244" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
                        Norton Secured
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
            <a href="#">Quyền Riêng Tư</a>
            <span>|</span>
            <a href="#">Điều Khoản</a>
            <span>|</span>
            <a href="#">GDPR</a>
            <span>|</span>
            <a href="#">Cookies</a>
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
            if (!document.querySelector('footer')) {
                injectFooter();
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectIfMissing);
        } else {
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
