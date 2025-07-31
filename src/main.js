import './script.js';

window.handleAOSByScreenSize = () => {
  if (window.innerWidth > 550) {
    AOS.init({
      duration: 750,
      offset: 100,
      once: false
    });
  } else {
    document.querySelectorAll('[data-aos]').forEach(el => {
      el.removeAttribute('data-aos');
      el.classList.remove('aos-init', 'aos-animate');
      el.style.opacity = 1;
      el.style.transform = 'none';
      el.style.filter = 'none';
    });
  }
}


 



 