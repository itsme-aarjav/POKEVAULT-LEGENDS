/**
 * POKÉVAULT LEGENDS — About Page Controller
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';

class AboutPage {
  constructor() {
    this.initLayout();
    this.initAccordion();
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar('about');
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  initAccordion() {
    document.querySelectorAll('.faq-item').forEach(item => {
      const btn = item.querySelector('.faq-question-btn');
      btn?.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        if (!isOpen) {
          item.classList.add('active');
        }
      });
    });
  }
}

new AboutPage();
