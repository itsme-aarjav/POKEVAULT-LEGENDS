/**
 * POKÉVAULT LEGENDS — Categories Directory Page Controller
 * Displays all 18 categories with cover art, item counts, descriptions, and direct links.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { CATEGORIES_DATA } from './data/categories.js';

class CategoriesPage {
  constructor() {
    this.initLayout();
    this.renderDirectory();
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar('categories');
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  renderDirectory() {
    const grid = document.getElementById('categoriesDirectoryGrid');
    if (!grid) return;

    grid.innerHTML = CATEGORIES_DATA.map(cat => `
      <div class="category-directory-card">
        <div class="category-card-img-wrap">
          ${cat.image ? `<img src="${cat.image}" alt="${cat.name}" class="category-card-img" />` : `<span class="category-card-emoji-large">${cat.icon}</span>`}
          <span class="category-count-badge">
            ${cat.count} Items
          </span>
          <span class="category-card-icon-badge">
            ${cat.icon}
          </span>
        </div>

        <div class="category-card-body">
          <div>
            <h3 class="category-card-title">
              ${cat.name}
            </h3>
            <p class="category-card-desc">
              ${cat.description}
            </p>
          </div>

          <div class="category-card-actions">
            <a href="category.html?id=${cat.slug}" class="btn-pill btn-explore-cat">
              Explore →
            </a>
            <a href="shop.html?category=${cat.slug}" class="btn-inspect btn-filter-cat">
              Filter Shop
            </a>
          </div>
        </div>
      </div>
    `).join('');
  }
}

new CategoriesPage();
