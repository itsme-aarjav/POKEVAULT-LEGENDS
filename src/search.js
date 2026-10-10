import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { renderProductCard, bindProductCardEvents } from './components/product-card.js';
import { getProducts } from './lib/api.js';

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

  async renderSearchResults() {
    const titleEl = document.getElementById('searchQueryTitle');
    const subtitleEl = document.getElementById('searchQuerySubtitle');
    const countEl = document.getElementById('searchResultsCount');
    const grid = document.getElementById('searchResultsGrid');
    if (!grid) return;

    if (titleEl) titleEl.textContent = this.query || 'All Merchandise';
    if (countEl) countEl.textContent = 'Searching catalog microservice...';

    // Show Loading Skeleton
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
        <div style="font-size: 2.5rem; animation: liveTickerPulse 0.8s infinite; margin-bottom: 0.75rem;">🔍</div>
        <div style="font-family: var(--font-mono); font-size: 1rem; font-weight: 800; color: #1E293B; margin-bottom: 0.5rem;">
          SEARCHING VAULT CATALOG...
        </div>
        <div style="font-family: var(--font-mono); font-size: 0.82rem; color: #64748B;">
          Querying backend microservice for "${this.query}"
        </div>
      </div>
    `;

    try {
      const res = await getProducts(this.query ? { search: this.query } : {});
      if (!res.success) {
        if (countEl) countEl.textContent = 'Search failed';
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 2rem; background: #FFF; border: 3px solid #000; box-shadow: 6px 6px 0px #000; border-radius: 8px;">
            <h3 style="font-family: var(--font-title); font-size: 1.5rem; color: var(--accent-red); margin-bottom: 0.5rem;">SEARCH FAILED</h3>
            <p style="font-family: var(--font-mono); font-size: 0.85rem; color: #666; margin-bottom: 1.5rem;">Could not connect to the catalog microservice (${res.error || 'Backend unavailable'}).</p>
            <button id="retrySearchBtn" class="btn-pill" style="cursor: pointer;">⚡ Retry Search</button>
          </div>
        `;
        document.getElementById('retrySearchBtn')?.addEventListener('click', () => this.renderSearchResults());
        return;
      }

      const results = res.data || [];

      if (countEl) {
        countEl.textContent = `Found ${results.length} Product${results.length === 1 ? '' : 's'} matching "${this.query}"`;
      }

      if (results.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: #FFF; border: 3px solid #000; box-shadow: 6px 6px 0px #000; border-radius: 8px;">
            <h3 style="font-family: var(--font-title); font-size: 1.8rem; color: var(--accent-red); margin-bottom: 0.75rem;">NO MATCHES FOUND</h3>
            <p style="font-family: var(--font-mono); color: #666; margin-bottom: 1.5rem;">We couldn't find any products matching "${this.query}". Try searching for "Pikachu", "Charizard", "Plush", or "Hoodie".</p>
            <a href="shop.html" class="btn-pill" style="text-decoration: none;">Browse All Products →</a>
          </div>
        `;
        return;
      }

      grid.innerHTML = results.map(p => renderProductCard(p)).join('');
      bindProductCardEvents(grid);
    } catch (err) {
      if (countEl) countEl.textContent = 'Connection error';
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 2rem; background: #FFF; border: 3px solid #000; box-shadow: 6px 6px 0px #000; border-radius: 8px;">
          <h3 style="font-family: var(--font-title); font-size: 1.5rem; color: var(--accent-red); margin-bottom: 0.5rem;">CONNECTION ERROR</h3>
          <p style="font-family: var(--font-mono); font-size: 0.85rem; color: #666; margin-bottom: 1.5rem;">${err.message}</p>
          <button id="retrySearchBtn" class="btn-pill" style="cursor: pointer;">⚡ Retry Search</button>
        </div>
      `;
      document.getElementById('retrySearchBtn')?.addEventListener('click', () => this.renderSearchResults());
    }
  }
}

new SearchPage();
