/**
 * POKÉVAULT LEGENDS — Shop Catalog Page Controller
 * Handles multi-filtering, sorting, category switching, search, and load-more.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { renderProductCard, bindProductCardEvents } from './components/product-card.js';
import { getProducts } from './lib/api.js';
import { CATEGORIES_DATA } from './data/categories.js';

class ShopPage {
  constructor() {
    this.allProducts = [];
    this.displayedCount = 12;
    this.isLoading = true;
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
    this.bindFilterEvents();
    this.loadCatalog();
  }

  async loadCatalog() {
    const grid = document.getElementById('shopProductsGrid');
    const resultsCountEl = document.getElementById('resultsCount');
    if (resultsCountEl) resultsCountEl.textContent = 'Connecting to catalog microservice...';

    if (grid) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
          <div style="font-size: 2.5rem; animation: liveTickerPulse 0.8s infinite; margin-bottom: 0.75rem;">⚡</div>
          <div style="font-family: var(--font-mono); font-size: 1rem; font-weight: 800; color: #1E293B; margin-bottom: 0.5rem;">
            LOADING VAULT CATALOG...
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.82rem; color: #64748B;">
            Fetching authentic live pricing and stock from backend microservice
          </div>
        </div>
      `;
    }

    try {
      const res = await getProducts();
      if (!res.success) {
        if (resultsCountEl) resultsCountEl.textContent = 'Error loading catalog';
        if (grid) {
          grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 2rem; background: #FFF; border: 3px solid #000; box-shadow: 6px 6px 0px #000; border-radius: 8px;">
              <h3 style="font-family: var(--font-title); font-size: 1.5rem; color: var(--accent-red); margin-bottom: 0.5rem;">UNABLE TO LOAD CATALOG PRODUCTS</h3>
              <p style="font-family: var(--font-mono); font-size: 0.85rem; color: #666; margin-bottom: 1.5rem;">Could not connect to the catalog microservice (${res.error || 'Backend unavailable'}).</p>
              <button id="retryShopBtn" class="btn-pill" style="cursor: pointer;">⚡ Retry Loading Catalog</button>
            </div>
          `;
          document.getElementById('retryShopBtn')?.addEventListener('click', () => this.loadCatalog());
        }
        return;
      }

      this.allProducts = res.data || [];
      this.isLoading = false;
      this.renderCategorySidebar();
      this.updateCatalog();
    } catch (err) {
      if (resultsCountEl) resultsCountEl.textContent = 'Connection error';
      if (grid) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 2rem; background: #FFF; border: 3px solid #000; box-shadow: 6px 6px 0px #000; border-radius: 8px;">
            <h3 style="font-family: var(--font-title); font-size: 1.5rem; color: var(--accent-red); margin-bottom: 0.5rem;">CONNECTION ERROR</h3>
            <p style="font-family: var(--font-mono); font-size: 0.85rem; color: #666; margin-bottom: 1.5rem;">${err.message}</p>
            <button id="retryShopBtn" class="btn-pill" style="cursor: pointer;">⚡ Retry Loading Catalog</button>
          </div>
        `;
        document.getElementById('retryShopBtn')?.addEventListener('click', () => this.loadCatalog());
      }
    }
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

  filterProducts(list, {
    category = 'all',
    pokemon = 'all',
    maxPrice = 15000,
    rating = 0,
    inStockOnly = false,
    sortBy = 'featured'
  }) {
    let result = (list || []).filter(p => {
      if (category !== 'all' && p.category !== category) return false;
      if (pokemon !== 'all' && p.pokemon && p.pokemon.toLowerCase() !== pokemon.toLowerCase()) return false;
      if (p.price > maxPrice) return false;
      if (p.rating < rating) return false;
      const stock = p.in_stock !== undefined ? Number(p.in_stock) : (p.inStock !== undefined ? Number(p.inStock) : 10);
      if (inStockOnly && stock <= 0) return false;
      return true;
    });

    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.sort((a, b) => (b.isNew || b.is_new ? 1 : 0) - (a.isNew || a.is_new ? 1 : 0));
        break;
      case 'popular':
        result.sort((a, b) => (b.reviewCount || b.review_count || 0) - (a.reviewCount || a.review_count || 0));
        break;
      case 'featured':
      default:
        result.sort((a, b) => (b.isFeatured || b.is_featured ? 1 : 0) - (a.isFeatured || a.is_featured ? 1 : 0));
        break;
    }
    return result;
  }

  updateCatalog() {
    const grid = document.getElementById('shopProductsGrid');
    const resultsCountEl = document.getElementById('resultsCount');
    const loadMoreWrap = document.getElementById('loadMoreWrap');
    if (!grid) return;

    if (this.isLoading) return;

    const filtered = this.filterProducts(this.allProducts, {
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
