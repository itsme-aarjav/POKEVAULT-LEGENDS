/**
 * POKÉVAULT LEGENDS — Single Category Page Controller
 * Reads ?id= from URL and renders category hero + category-specific products.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { renderProductCard, bindProductCardEvents } from './components/product-card.js';
import { getProductsByCategory } from './data/products.js';
import { getCategoryById } from './data/categories.js';

class CategoryDetailPage {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    const catSlug = params.get('id') || 'trading-cards';

    this.category = getCategoryById(catSlug) || {
      id: catSlug,
      name: catSlug.replace('-', ' ').toUpperCase(),
      description: `Explore authentic Pokémon items in ${catSlug}.`,
      icon: '🏷️',
      bannerColor: 'linear-gradient(135deg, #FFF056 0%, #FFD700 100%)'
    };

    this.products = getProductsByCategory(catSlug);
    this.currentSort = 'featured';

    document.title = `${this.category.name} — POKÉVAULT LEGENDS`;

    this.initLayout();
    this.renderCategoryHeader();
    this.renderCategoryProducts();
    this.bindEvents();
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar('categories');
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  renderCategoryHeader() {
    const banner = document.getElementById('categoryHeroBanner');
    const title = document.getElementById('catTitle');
    const breadcrumb = document.getElementById('catBreadcrumbTitle');
    const subtitle = document.getElementById('catSubtitle');
    const icon = document.getElementById('catIcon');

    if (banner) banner.style.background = this.category.bannerColor || 'linear-gradient(135deg, #FFF056 0%, #FFD700 100%)';
    if (title) title.textContent = this.category.name.toUpperCase();
    if (breadcrumb) breadcrumb.textContent = this.category.name;
    if (subtitle) subtitle.textContent = this.category.description;
    if (icon) icon.textContent = this.category.icon || '🏷️';
  }

  bindEvents() {
    const sortSelect = document.getElementById('catSortBy');
    sortSelect?.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.renderCategoryProducts();
    });
  }

  renderCategoryProducts() {
    const grid = document.getElementById('categoryProductsGrid');
    const countEl = document.getElementById('categoryCount');
    if (!grid) return;

    if (countEl) countEl.textContent = `Showing ${this.products.length} Products in ${this.category.name}`;

    let list = [...this.products];
    switch (this.currentSort) {
      case 'price-low':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        list.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'featured':
      default:
        list.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        break;
    }

    if (list.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: #FFF; border: 3px solid #000; box-shadow: 6px 6px 0px #000; border-radius: 8px;">
          <h3 style="font-family: var(--font-title); font-size: 1.5rem; color: var(--accent-red); margin-bottom: 0.5rem;">NO PRODUCTS IN THIS CATEGORY YET</h3>
          <p style="font-family: var(--font-mono); color: #666; margin-bottom: 1.5rem;">Check back soon for new inventory drops!</p>
          <a href="shop.html" class="btn-pill" style="text-decoration: none;">Browse All Products →</a>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(p => renderProductCard(p)).join('');
    bindProductCardEvents(grid);
  }
}

new CategoryDetailPage();
