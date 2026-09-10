/**
 * POKÉVAULT LEGENDS — Wishlist Page Controller
 * Displays saved favorites from localStorage and provides 1-click add to cart.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { renderProductCard, bindProductCardEvents } from './components/product-card.js';
import { getWishlist } from './utils/store.js';
import { getProductById } from './data/products.js';

class WishlistPage {
  constructor() {
    this.initLayout();
    this.renderWishlist();

    window.addEventListener('pv-wishlist-updated', () => this.renderWishlist());
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar('wishlist');
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  renderWishlist() {
    const grid = document.getElementById('wishlistGrid');
    const countText = document.getElementById('wishlistCountText');
    if (!grid) return;

    const wishlistIds = getWishlist();
    const products = wishlistIds.map(id => getProductById(id)).filter(Boolean);

    if (countText) countText.textContent = `${products.length} Saved Item${products.length === 1 ? '' : 's'} in Wishlist`;

    if (products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: #FFF; border: 3px solid #000; box-shadow: 6px 6px 0px #000; border-radius: 8px;">
          <h3 style="font-family: var(--font-title); font-size: 1.8rem; color: var(--accent-red); margin-bottom: 0.75rem;">YOUR WISHLIST IS EMPTY</h3>
          <p style="font-family: var(--font-mono); color: #666; margin-bottom: 1.5rem;">Click the heart icon on any card, plush, figure, or merch item to save it to your wishlist!</p>
          <a href="shop.html" class="btn-pill" style="text-decoration: none;">Browse Pokémon Marketplace →</a>
        </div>
      `;
      return;
    }

    grid.innerHTML = products.map(p => renderProductCard(p)).join('');
    bindProductCardEvents(grid);
  }
}

new WishlistPage();
