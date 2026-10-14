/**
 * POKÉVAULT LEGENDS — Contact Page Controller
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';

class ContactPage {
  constructor() {
    this.initLayout();
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar('contact');
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }
}

new ContactPage();
