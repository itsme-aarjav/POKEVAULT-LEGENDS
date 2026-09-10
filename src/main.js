/**
 * POKÉVAULT LEGENDS — Main Storefront Landing Controller
 * Powers homepage 3D WebGL stage, best seller product cards grid, and admin modal.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { renderProductCard, bindProductCardEvents } from './components/product-card.js';
import { getAllProducts } from './data/products.js';
import { Hero3DSlab } from './components/hero-3d.js';
import { ThreeCardViewer } from './three-card-viewer.js';
import { addToCart } from './utils/store.js';

import confettiModule from 'canvas-confetti';
const confetti = confettiModule?.default || confettiModule || ((typeof window !== 'undefined' && window.confetti) ? window.confetti : () => {});

class MainStore {
  constructor() {
    this.products = getAllProducts();
    this.heroStage = null;
    this.modalViewer = null;

    this.initLayout();
    this.initHeroStage();
    this.renderBestSellers();
    this.initModals();
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar('home');
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  initHeroStage() {
    const container = document.getElementById('hero3DStageContainer');
    if (container) {
      this.heroStage = new Hero3DSlab('hero3DStageContainer', 'charizard');

      // Card Switcher Pills
      document.querySelectorAll('.hero-3d-card-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          document.querySelectorAll('.hero-3d-card-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const cardKey = pill.getAttribute('data-card');
          if (this.heroStage) this.heroStage.switchCard(cardKey);
        });
      });
    }
  }

  renderBestSellers() {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;

    // Pick top best seller items across categories
    const bestSellers = this.products.filter(p => p.isBestseller || p.isFeatured).slice(0, 8);
    grid.innerHTML = bestSellers.map(p => renderProductCard(p)).join('');
    bindProductCardEvents(grid);
  }

  initModals() {
    // 3D Inspect Modal
    const modal3DOverlay = document.getElementById('modal3DOverlay');
    const close3DModalBtn = document.getElementById('close3DModalBtn');
    const modalContainer = document.getElementById('modal3DCanvasContainer');

    if (modalContainer && !this.modalViewer) {
      this.modalViewer = new ThreeCardViewer();
    }

    close3DModalBtn?.addEventListener('click', () => {
      modal3DOverlay?.classList.remove('open');
    });
  }
}

new MainStore();
