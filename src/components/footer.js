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

.legal-links {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.legal-links a {
    color: #666;
    text-decoration: none;
    font-size: 13px;
    transition: color 0.3s ease;
}

.legal-links a:hover {
    color: #c8ff00;
}

.legal-links span {
    color: #333;
    font-size: 13px;
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

.footer-column h3:hover {
    transform: scale(1.025);
}

.footer-column h3 {
    color: #ffffff;
    font-size: clamp(14px, 2.5vw, 18px);
    font-weight: 500;
    text-align: center;
    margin-bottom: 5px;
}

.footer-column a {
    display: block;
    color: #888;
    font-size: clamp(12px, 2.5vw, 15px);
    text-align: center;
    text-decoration: none;
    margin-bottom: 12px;
    transition: color 0.3s ease;
}

.footer-column a:hover {
    color: #c8ff00;
    text-decoration: underline;
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
@media (max-width: 768px) {
    footer {
        padding: 60px 30px 40px;
    }

    .footer-container {
        grid-template-columns: 1fr;
        gap: 40px;
        text-align: center;
    }

    .footer-bottom {
        flex-direction: column;
        gap: 20px;
        text-align: center;
    }

    .footer-bottom-left {
        justify-content: center;
    }

    .footer-column h3 {
        text-decoration: underline;
    }
}`;

const html = `
<footer>
    <div class="footer-container">
        <div class="footer-section">
            <h3>Công Ty</h3>
            <div class="collapsible">
                <a href="#">Giải Thưởng Nổi Bật</a>
                <a href="#">Hoạt Động Cộng Đồng</a>
                <a href="#">Bản Tin</a>
            </div>
        </div>
        <div class="footer-section">
            <h3>Các Trang Khác</h3>
            <div class="collapsible">
                <a href="#/FAQs">Câu Hỏi Thường Gặp</a>
                <a href="#/recruitment">Tuyển Dụng</a>
                <a href="#/donations">Quyên Góp</a>
            </div>
        </div>
        <div class="footer-brand">
            <div class="security-badges">
                <div class="badge norton">
                    <svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff">
                        <path d="M12 2V7M12 2C11.2867 2 10.5909 2.07467 9.91991 2.21663M12 2C12.7132 2 13.4091 2.07467 14.08 2.21663M12 7C9.23855 7 7 9.2386 7 12M12 7C14.7614 7 17 9.2386 17 12M12 17V22M12 17C14.7614 17 17 14.7614 17 12M12 17C9.23855 17 7 14.7614 7 12M12 22C12.7122 22 13.407 21.9255 14.077 21.784M12 22C11.2851 22 10.5878 21.925 9.91545 21.7824" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Norton Secured
                </div>
                <div class="badge ssl">
                    <svg width="16px" height="16px" viewBox="0 0 24 24" fill="#ffffff">
                        <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M12 7C13.4 7 14.8 8.6 14.8 10.2V11H16V16H8V11H9.2V10.2C9.2 8.6 10.6 7 12 7M12 8.2C11.2 8.2 10.4 8.7 10.4 10.2V11H13.6V10.2C13.6 8.7 12.8 8.2 12 8.2Z"/>
                    </svg>
                    SSL Encrypted
                </div>
                <div class="badge payment">
                    <svg fill="#ffffff" width="16px" height="16px" viewBox="0 0 32 32">
                        <path d="M29.005 5.5h-26.009c-1.657 0-3 1.343-3 3v15c0 1.657 1.343 3 3 3h26.009c1.657 0 3-1.343 3-3v-15c0-1.657-1.343-3-3-3z"/>
                    </svg>
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
            </a>
        </div>
    </div>
</footer>`;

        // Inject CSS
        const styleElement = document.createElement('style');
        styleElement.textContent = css;
        document.head.appendChild(styleElement);

        // Inject HTML
        const targetElement = document.querySelector(targetSelector);
        if (!targetElement) {
            console.error('ICUEFooter: Target element not found');
            return false;
        }

        targetElement.insertAdjacentHTML('beforeend', html);

        // Inject JavaScript for mobile toggles
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

// Auto-inject function
function autoInjectFooter() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!document.querySelector('footer')) {
                injectFooter();
            }
        });
    } else {
        if (!document.querySelector('footer')) {
            injectFooter();
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ICUEFooter = {
        inject: injectFooter,
        autoInject: autoInjectFooter,
        
        // Method to inject into specific element
        injectInto: function(element) {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            
            if (!element) {
                console.error('ICUEFooter: Element not found');
                return false;
            }

            return injectFooter(element);
        },

        // Method to update footer links
        updateLinks: function(newLinks) {
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
}

// Auto-inject if this script is loaded directly
autoInjectFooter();
