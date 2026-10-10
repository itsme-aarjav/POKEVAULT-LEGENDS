/**
 * POKÉVAULT LEGENDS — Main Storefront Landing Controller
 * Powers homepage 3D WebGL stage, best seller product cards grid, and admin modal.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { renderProductCard, bindProductCardEvents } from './components/product-card.js';
import { getProducts } from './lib/api.js';
import { Hero3DSlab } from './components/hero-3d.js';
import { ThreeCardViewer } from './three-card-viewer.js';
import { addToCart } from './utils/store.js';

import confettiModule from 'canvas-confetti';
const confetti = confettiModule?.default || confettiModule || ((typeof window !== 'undefined' && window.confetti) ? window.confetti : () => {});

class MainStore {
  constructor() {
    this.products = [];
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

  async renderBestSellers() {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;

    // Show Loading Skeleton
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
        <div style="font-size: 2.5rem; animation: liveTickerPulse 0.8s infinite; margin-bottom: 0.75rem;">⚡</div>
        <div style="font-family: var(--font-mono); font-size: 1rem; font-weight: 800; color: #1E293B; margin-bottom: 0.5rem;">
          CONNECTING TO VAULT CATALOG MICROSERVICE...
        </div>
        <div style="font-family: var(--font-mono); font-size: 0.82rem; color: #64748B;">
          Loading authoritative products, pricing &amp; vault stock
        </div>
      </div>
    `;

    try {
      const res = await getProducts();
      if (!res.success) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 2rem; background: #FFF; border: 3px solid #000; box-shadow: 6px 6px 0px #000; border-radius: 8px;">
            <h3 style="font-family: var(--font-title); font-size: 1.5rem; color: var(--accent-red); margin-bottom: 0.5rem;">UNABLE TO LOAD CATALOG PRODUCTS</h3>
            <p style="font-family: var(--font-mono); font-size: 0.85rem; color: #666; margin-bottom: 1.5rem;">Could not connect to the catalog microservice (${res.error || 'Backend unavailable'}).</p>
            <button id="retryBestSellersBtn" class="btn-pill" style="cursor: pointer;">⚡ Retry Loading Catalog</button>
          </div>
        `;
        document.getElementById('retryBestSellersBtn')?.addEventListener('click', () => this.renderBestSellers());
        return;
      }

      this.products = res.data || [];
      if (this.products.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 2rem; background: #FFF; border: 3px solid #000; box-shadow: 6px 6px 0px #000; border-radius: 8px;">
            <h3 style="font-family: var(--font-title); font-size: 1.4rem; color: #000; margin-bottom: 0.5rem;">NO PRODUCTS IN VAULT CATALOG</h3>
            <p style="font-family: var(--font-mono); font-size: 0.85rem; color: #666;">Check back soon for new inventory drops!</p>
          </div>
        `;
        return;
      }

      // Pick top best seller items across categories
      const bestSellers = this.products.filter(p => p.isBestseller || p.isFeatured || p.is_bestseller || p.is_featured);
      const displayItems = (bestSellers.length >= 4 ? bestSellers : this.products).slice(0, 8);

      grid.innerHTML = displayItems.map(p => renderProductCard(p)).join('');
      bindProductCardEvents(grid);
    } catch (err) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 2rem; background: #FFF; border: 3px solid #000; box-shadow: 6px 6px 0px #000; border-radius: 8px;">
          <h3 style="font-family: var(--font-title); font-size: 1.5rem; color: var(--accent-red); margin-bottom: 0.5rem;">CATALOG CONNECTION ERROR</h3>
          <p style="font-family: var(--font-mono); font-size: 0.85rem; color: #666; margin-bottom: 1.5rem;">${err.message}</p>
          <button id="retryBestSellersBtn" class="btn-pill" style="cursor: pointer;">⚡ Retry Loading Catalog</button>
        </div>
      `;
      document.getElementById('retryBestSellersBtn')?.addEventListener('click', () => this.renderBestSellers());
    }
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
