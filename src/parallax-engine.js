/**
 * Parallax Scroll & Dynamic Depth Engine
 */
export class ParallaxEngine {
  constructor() {
    this.elements = [];
    this.scrollY = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    
    this.init();
  }

  init() {
    // Bind Scroll Event
    window.addEventListener('scroll', () => {
      this.scrollY = window.scrollY || window.pageYOffset;
      this.updateParallax();
    }, { passive: true });

    // Bind Mouse Move Event for Floating Depth Elements
    window.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      this.updateMouseParallax();
    }, { passive: true });

    this.registerParallaxElements();
  }

  registerParallaxElements() {
    // Query elements with data-parallax attributes
    const targets = document.querySelectorAll('[data-parallax]');
    this.elements = Array.from(targets).map(el => {
      const speed = parseFloat(el.getAttribute('data-parallax-speed')) || 0.2;
      const direction = el.getAttribute('data-parallax-dir') || 'vertical';
      const mouseSpeed = parseFloat(el.getAttribute('data-mouse-speed')) || 15;
      
      return { el, speed, direction, mouseSpeed };
    });
  }

  updateParallax() {
    this.elements.forEach(({ el, speed, direction }) => {
      if (direction === 'vertical') {
        const translateY = this.scrollY * speed;
        el.style.transform = `translate3d(0, ${translateY}px, 0)`;
      } else if (direction === 'horizontal') {
        const translateX = this.scrollY * speed;
        el.style.transform = `translate3d(${translateX}px, 0, 0)`;
      } else if (direction === 'rotate') {
        const rotateDeg = this.scrollY * speed * 0.1;
        el.style.transform = `rotate(${rotateDeg}deg)`;
      }
    });
  }

  updateMouseParallax() {
    const floatingChars = document.querySelectorAll('.age-character-img, .hero-lightning-bg, .collector-hero-img');
    
    floatingChars.forEach((el, index) => {
      const factor = (index + 1) * 12;
      const moveX = this.mouseX * factor;
      const moveY = this.mouseY * factor;
      
      el.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) rotate(${moveX * 0.1}deg)`;
    });
  }
}
