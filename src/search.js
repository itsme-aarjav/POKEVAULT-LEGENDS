/**
 * POKÉVAULT LEGENDS — Search Results Page Controller
 * Reads ?q= from URL and displays matching products across all categories.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { renderProductCard, bindProductCardEvents } from './components/product-card.js';
import { searchProducts } from './data/products.js';

class SearchPage {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.query = params.get('q') || '';

    document.title = `Search "${this.query}" — POKÉVAULT LEGENDS`;

    this.initLayout();
    this.renderSearchResults();
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar('shop');
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  renderSearchResults() {
    const titleEl = document.getElementById('searchQueryTitle');
    const subtitleEl = document.getElementById('searchQuerySubtitle');
    const countEl = document.getElementById('searchResultsCount');
    const grid = document.getElementById('searchResultsGrid');
    if (!grid) return;

    if (titleEl) titleEl.textContent = this.query || 'All Merchandise';

    const results = searchProducts(this.query);

    if (countEl) countEl.textContent = `Found ${results.length} Product${results.length === 1 ? '' : 's'} matching "${this.query}"`;

    if (results.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: #FFF; border: 3px solid #000; box-shadow: 6px 6px 0px #000; border-radius: 8px;">
          <h3 style="font-family: var(--font-title); font-size: 1.8rem; color: var(--accent-red); margin-bottom: 0.75rem;">NO MATCHES FOUND</h3>
          <p style="font-family: var(--font-mono); color: #666; margin-bottom: 1.5rem;">We couldn't find any products matching "${this.query}". Try searching for "Pikachu", "Charizard", "Plush", or "Hoodie".</p>
          <a href="shop.html" class="btn-pill" style="text-decoration: none;">Browse All 60+ Products →</a>
        </div>
      `;
      return;
    }

    grid.innerHTML = results.map(p => renderProductCard(p)).join('');
    bindProductCardEvents(grid);
  }
}

new SearchPage();
