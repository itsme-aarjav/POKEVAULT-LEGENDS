/**
 * POKÉVAULT LEGENDS — Blog Journal Catalog Controller
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { getAllBlogs } from './data/blogs.js';

class BlogCatalogPage {
  constructor() {
    this.blogs = getAllBlogs();
    this.selectedCategory = 'all';

    this.initLayout();
    this.initFilters();
    this.renderBlogGrid();
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar();
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  initFilters() {
    const filterBtns = document.querySelectorAll('.blog-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedCategory = btn.getAttribute('data-cat');
        this.renderBlogGrid();
      });
    });
  }

  renderBlogGrid() {
    const container = document.getElementById('blogCatalogContainer');
    if (!container) return;

    const filtered = this.selectedCategory === 'all'
      ? this.blogs
      : this.blogs.filter(b => b.category === this.selectedCategory);

    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:3rem; font-family:var(--font-mono);">No articles found in this category.</div>`;
      return;
    }

    const featured = filtered[0];
    const rest = filtered.slice(1);

    container.innerHTML = `
      <!-- FEATURED HERO ARTICLE -->
      <article class="blog-featured-card animate-pop-in">
        <div class="blog-featured-img-wrap">
          <img src="${featured.heroImage}" alt="${featured.title}" class="blog-featured-img" />
          <span class="blog-cat-badge">${featured.category}</span>
        </div>
        <div class="blog-featured-content">
          <div style="font-family:var(--font-mono); font-size:0.8rem; color:#64748B; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
            <span>📅 ${featured.publishedDate}</span> • <span>⏱️ ${featured.readTime}</span>
          </div>
          <h2 class="blog-featured-title">
            <a href="blog-post.html?slug=${featured.slug}">${featured.title}</a>
          </h2>
          <p class="blog-featured-subtitle">
            ${featured.subtitle}
          </p>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.5rem; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.5rem;">${featured.author.avatar}</span>
              <div>
                <strong style="font-family:var(--font-title); font-size:0.9rem; color:#000; display:block;">${featured.author.name}</strong>
                <span style="font-family:var(--font-mono); font-size:0.75rem; color:#64748B;">${featured.author.title}</span>
              </div>
            </div>
            <a href="blog-post.html?slug=${featured.slug}" class="btn-pill" style="padding:10px 20px; font-size:0.9rem; text-decoration:none;">
              Read Full Guide →
            </a>
          </div>
        </div>
      </article>

      <!-- REMAINING ARTICLES GRID -->
      ${rest.length > 0 ? `
        <div class="blog-grid-cards">
          ${rest.map(post => `
            <article class="blog-card animate-pop-in">
              <div class="blog-card-img-wrap">
                <img src="${post.heroImage}" alt="${post.title}" class="blog-card-img" />
                <span class="blog-cat-badge-sm">${post.category}</span>
              </div>
              <div class="blog-card-body">
                <div style="font-family:var(--font-mono); font-size:0.75rem; color:#64748B; margin-bottom:6px;">
                  📅 ${post.publishedDate} • ⏱️ ${post.readTime}
                </div>
                <h3 class="blog-card-title">
                  <a href="blog-post.html?slug=${post.slug}">${post.title}</a>
                </h3>
                <p class="blog-card-desc">
                  ${post.subtitle}
                </p>
                <div style="margin-top:auto; padding-top:1rem; border-top:1px dashed #CBD5E1; display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-family:var(--font-mono); font-size:0.78rem; font-weight:700; color:#000;">
                    ${post.author.avatar} ${post.author.name}
                  </span>
                  <a href="blog-post.html?slug=${post.slug}" style="font-family:var(--font-mono); font-weight:800; font-size:0.8rem; color:var(--accent-red); text-decoration:underline;">Read Article →</a>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      ` : ''}
    `;
  }
}

new BlogCatalogPage();
