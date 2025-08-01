import './script.js';

const AOSManager = (() => {
  const originalAOS = new Map();

  function restoreAOSAttributes() {
    document.querySelectorAll('[data-aos]').forEach(el => {
      if (!originalAOS.has(el)) {
        originalAOS.set(el, el.getAttribute('data-aos'));
      }
    });
    originalAOS.forEach((value, el) => {
      el.setAttribute('data-aos', value);
    });
  }

  function clearAOSAttributes() {
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

  // Always restore attributes before initializing AOS
  if (width < 1025) {
    console.log('[AOS] Small screen – disabling AOS');
    clearAOSAttributes();
  } else {
    console.log('[AOS] Large screen mode – Enabling AOS');
    restoreAOSAttributes();
    AOS.init({
      duration: 750,
      offset: 200,
      once: false
    });
  }
}

  return { handleAOSByScreenSize };
})();

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
  console.log('[AOS] DOMContentLoaded');
  AOSManager.handleAOSByScreenSize();
});