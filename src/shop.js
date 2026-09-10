/**
 * POKÉVAULT LEGENDS — Shop Catalog Page Controller
 * Handles multi-filtering, sorting, category switching, search, and load-more.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { renderProductCard, bindProductCardEvents } from './components/product-card.js';
import { getAllProducts, filterProducts } from './data/products.js';
import { CATEGORIES_DATA } from './data/categories.js';

class ShopPage {
  constructor() {
    this.allProducts = getAllProducts();
    this.displayedCount = 12;
    this.currentFilters = {
      category: 'all',
      pokemon: 'all',
      maxPrice: 15000,
      rating: 0,
      inStockOnly: false,
      sortBy: 'featured'
    };

    // Parse URL params for pre-selected category or character
    const params = new URLSearchParams(window.location.search);
    if (params.has('category')) this.currentFilters.category = params.get('category');
    if (params.has('pokemon')) this.currentFilters.pokemon = params.get('pokemon');
    if (params.has('sort')) this.currentFilters.sortBy = params.get('sort');

    this.initLayout();
    this.renderCategorySidebar();
    this.bindFilterEvents();
    this.updateCatalog();
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar('shop');
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  renderCategorySidebar() {
    const container = document.getElementById('filterCategoryList');
    if (!container) return;

    const totalCount = this.allProducts.length;

    let html = `
      <li>
        <button class="filter-cat-btn ${this.currentFilters.category === 'all' ? 'active' : ''}" data-cat-id="all">
          <span>All Categories</span>
          <span class="cat-count-badge">${totalCount}</span>
        </button>
      </li>
    `;

    CATEGORIES_DATA.forEach(cat => {
      const catCount = this.allProducts.filter(p => p.category === cat.slug).length;
      html += `
        <li>
          <button class="filter-cat-btn ${this.currentFilters.category === cat.slug ? 'active' : ''}" data-cat-id="${cat.slug}">
            <span>${cat.icon} ${cat.shortName}</span>
            <span class="cat-count-badge">${catCount}</span>
          </button>
        </li>
      `;
    });

    container.innerHTML = html;

    // Bind Category Click Handlers
    container.querySelectorAll('.filter-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilters.category = btn.getAttribute('data-cat-id');
        this.displayedCount = 12;
        this.updateCatalog();
      });
    });
  }

  bindFilterEvents() {
    const pokemonSelect = document.getElementById('filterPokemonSelect');
    const priceRangeInput = document.getElementById('priceRangeInput');
    const priceDisplay = document.getElementById('priceValueDisplay');
    const inStockCheckbox = document.getElementById('inStockCheckbox');
    const sortBySelect = document.getElementById('sortBySelect');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const mobileFilterToggleBtn = document.getElementById('mobileFilterToggleBtn');
    const shopSidebar = document.getElementById('shopSidebar');

    // Mobile Filter Toggle Drawer
    mobileFilterToggleBtn?.addEventListener('click', () => {
      shopSidebar?.classList.toggle('open');
      const isOpen = shopSidebar?.classList.contains('open');
      if (mobileFilterToggleBtn) {
        mobileFilterToggleBtn.innerHTML = isOpen
          ? '<span>⚡ Hide Filters</span> <span style="font-size:1.1rem;">▲</span>'
          : '<span>⚡ Filter &amp; Sort Products</span> <span style="font-size:1.1rem;">▼</span>';
      }
    });

    // Pre-populate filters if set from URL
    if (pokemonSelect && this.currentFilters.pokemon !== 'all') {
      pokemonSelect.value = this.currentFilters.pokemon;
    }
    if (sortBySelect && this.currentFilters.sortBy !== 'featured') {
      sortBySelect.value = this.currentFilters.sortBy;
    }

    pokemonSelect?.addEventListener('change', (e) => {
      this.currentFilters.pokemon = e.target.value;
      this.displayedCount = 12;
      this.updateCatalog();
    });

    priceRangeInput?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.currentFilters.maxPrice = val;
      if (priceDisplay) priceDisplay.textContent = `$${val.toLocaleString()}`;
      this.displayedCount = 12;
      this.updateCatalog();
    });

    document.querySelectorAll('input[name="ratingFilter"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.currentFilters.rating = parseFloat(e.target.value);
        this.displayedCount = 12;
        this.updateCatalog();
      });
    });

    inStockCheckbox?.addEventListener('change', (e) => {
      this.currentFilters.inStockOnly = e.target.checked;
      this.displayedCount = 12;
      this.updateCatalog();
    });

    sortBySelect?.addEventListener('change', (e) => {
      this.currentFilters.sortBy = e.target.value;
      this.updateCatalog();
    });

    clearFiltersBtn?.addEventListener('click', () => {
      this.currentFilters = {
        category: 'all',
        pokemon: 'all',
        maxPrice: 15000,
        rating: 0,
        inStockOnly: false,
        sortBy: 'featured'
      };

      if (pokemonSelect) pokemonSelect.value = 'all';
      if (priceRangeInput) priceRangeInput.value = 15000;
      if (priceDisplay) priceDisplay.textContent = '$15,000';
      if (inStockCheckbox) inStockCheckbox.checked = false;
      if (sortBySelect) sortBySelect.value = 'featured';
      document.querySelector('input[name="ratingFilter"][value="0"]').checked = true;

      this.renderCategorySidebar();
      this.displayedCount = 12;
      this.updateCatalog();
    });

    loadMoreBtn?.addEventListener('click', () => {
      this.displayedCount += 12;
      this.updateCatalog();
    });
  }

  updateCatalog() {
    const grid = document.getElementById('shopProductsGrid');
    const resultsCountEl = document.getElementById('resultsCount');
    const loadMoreWrap = document.getElementById('loadMoreWrap');
    if (!grid) return;

    const filtered = filterProducts({
      category: this.currentFilters.category,
      pokemon: this.currentFilters.pokemon,
      maxPrice: this.currentFilters.maxPrice,
      rating: this.currentFilters.rating,
      inStockOnly: this.currentFilters.inStockOnly,
      sortBy: this.currentFilters.sortBy
    });

    if (resultsCountEl) {
      resultsCountEl.textContent = `Showing ${Math.min(this.displayedCount, filtered.length)} of ${filtered.length} Products`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 5rem 2rem; background: #FFF; border: 3px solid #000; box-shadow: 6px 6px 0px #000; border-radius: 8px;">
          <h2 style="font-family: var(--font-title); font-size: 2rem; color: var(--accent-red); margin-bottom: 1rem;">NO PRODUCTS FOUND</h2>
          <p style="font-family: var(--font-mono); color: #666; margin-bottom: 1.5rem;">No merchandise items match your selected filters. Try adjusting price or category filters.</p>
          <button class="btn-pill" id="resetEmptyBtn">Reset Filters</button>
        </div>
      `;
      document.getElementById('resetEmptyBtn')?.addEventListener('click', () => {
        document.getElementById('clearFiltersBtn')?.click();
      });
      if (loadMoreWrap) loadMoreWrap.style.display = 'none';
      return;
    }

    const visibleItems = filtered.slice(0, this.displayedCount);
    grid.innerHTML = visibleItems.map(p => renderProductCard(p)).join('');
    bindProductCardEvents(grid);

    if (loadMoreWrap) {
      loadMoreWrap.style.display = this.displayedCount < filtered.length ? 'block' : 'none';
    }
  }
}

new ShopPage();
