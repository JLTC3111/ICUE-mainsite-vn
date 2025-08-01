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
    el.classList.remove('aos-animate'); // Let AOS re-trigger animation
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
      duration: 850,
      offset: 225,
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
  cacheAOSAttributes();
  console.log('[AOS] DOMContentLoaded');
  AOSManager.handleAOSByScreenSize();
});