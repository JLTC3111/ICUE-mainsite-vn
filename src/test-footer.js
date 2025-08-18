// Clean footer injection function for testing
function testFooterInject() {
    const css = `
footer {
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
    display: flex;
    flex-direction: column;
    padding: 15px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.footer-container {
    max-width: 100vw;
    margin: 0 auto;
    padding: 35px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 40px;
    align-items: start;
}
.footer-section h3 {
    color: #ffffff;
    font-size: 18px;
    margin-bottom: 15px;
    text-align: center;
}
.footer-section a {
    display: block;
    color: #888;
    text-decoration: none;
    margin-bottom: 8px;
    text-align: center;
}
.footer-section a:hover {
    color: #c8ff00;
}
.footer-bottom {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 20px;
    text-align: center;
    color: #666;
}
@media (max-width: 768px) {
    .footer-container {
        grid-template-columns: 1fr;
        gap: 20px;
    }
}
`;

    const html = `
<footer>
    <div class="footer-container">
        <div class="footer-section">
            <h3>Công Ty</h3>
            <a href="#">Giải Thưởng Nổi Bật</a>
            <a href="#">Hoạt Động Cộng Đồng</a>
            <a href="#">Bản Tin</a>
        </div>
        <div class="footer-section">
            <h3>Các Trang Khác</h3>
            <a href="#/FAQs">Câu Hỏi Thường Gặp</a>
            <a href="#/recruitment">Tuyển Dụng</a>
            <a href="#/donations">Quyên Góp</a>
        </div>
        <div class="footer-section">
            <h3>Liên Hệ</h3>
            <a href="#">Norton Secured</a>
            <a href="#">SSL Encrypted</a>
            <a href="#">Visa | MasterCard</a>
        </div>
    </div>
    <div class="footer-bottom">
        <a href="#">Quyền Riêng Tư</a> | 
        <a href="#">Điều Khoản</a> | 
        <a href="#">GDPR</a>
    </div>
</footer>
`;

    try {
        // Inject CSS
        const styleElement = document.createElement('style');
        styleElement.textContent = css;
        document.head.appendChild(styleElement);

        // Inject HTML
        document.body.insertAdjacentHTML('beforeend', html);
        
        console.log('✅ Test footer injected successfully!');
        return true;
    } catch (error) {
        console.error('❌ Test footer injection failed:', error);
        return false;
    }
}

// Test the footer
console.log('=== TESTING CLEAN FOOTER ===');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testFooterInject);
} else {
    testFooterInject();
}
