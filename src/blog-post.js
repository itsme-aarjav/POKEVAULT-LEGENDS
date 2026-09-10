/**
 * POKÉVAULT LEGENDS — Individual Blog Post Article Controller
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { getBlogBySlug, getAllBlogs } from './data/blogs.js';
import { getProductById } from './data/products.js';
import { renderProductCard, bindProductCardEvents } from './components/product-card.js';

class BlogPostPage {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug') || 'top-10-vintage-pokemon-cards-2026-value-guide';
    this.post = getBlogBySlug(slug) || getAllBlogs()[0];

    this.initSeo();
    this.initLayout();
    this.renderArticle();
  }

  initSeo() {
    if (!this.post) return;
    document.title = `${this.post.title} — POKÉVAULT LEGENDS`;

    // Inject Schema.org Article JSON-LD
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": this.post.title,
      "description": this.post.metaDescription,
      "image": `https://pokevault-legends.com${this.post.heroImage}`,
      "author": {
        "@type": "Person",
        "name": this.post.author.name,
        "jobTitle": this.post.author.title
      },
      "publisher": {
        "@type": "Organization",
        "name": "PokéVault Legends",
        "logo": {
          "@type": "ImageObject",
          "url": "https://pokevault-legends.com/assets/charizard.png"
        }
      },
      "datePublished": "2026-08-20",
      "dateModified": "2026-08-24"
    };

    let scriptTag = document.getElementById('blogJsonLd');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'blogJsonLd';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(jsonLd);
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar();
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  renderArticle() {
    const container = document.getElementById('blogArticleContainer');
    if (!container || !this.post) return;

    const p = this.post;
    const relatedProducts = (p.relatedProductIds || [])
      .map(id => getProductById(id))
      .filter(Boolean);

    container.innerHTML = `
      <!-- BREADCRUMBS -->
      <div class="breadcrumb-nav" style="margin-bottom: 1.5rem;">
        <a href="index.html">Home</a> <span>/</span> 
        <a href="blog.html">The PokéVault Journal</a> <span>/</span> 
        <span class="current">${p.category}</span>
      </div>

      <!-- ARTICLE HEADER -->
      <header class="blog-article-header">
        <div style="display:inline-block; background:#FFF056; border:2px solid #000; padding:4px 12px; border-radius:20px; font-family:var(--font-mono); font-weight:900; font-size:0.8rem; margin-bottom:12px; box-shadow:2px 2px 0px #000;">
          ${p.category}
        </div>
        <h1 class="blog-article-title">${p.title}</h1>
        <p class="blog-article-subtitle">${p.subtitle}</p>

        <!-- AUTHOR & METADATA BAR -->
        <div class="blog-author-bar">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:48px; height:48px; border:2px solid #000; border-radius:50%; background:#FFF056; display:flex; align-items:center; justify-content:center; font-size:1.6rem; box-shadow:2px 2px 0px #000;">
              ${p.author.avatar}
            </div>
            <div>
              <div style="font-family:var(--font-title); font-weight:900; font-size:1rem; color:#000;">${p.author.name}</div>
              <div style="font-family:var(--font-mono); font-size:0.75rem; color:#64748B;">${p.author.title}</div>
            </div>
          </div>

          <div style="font-family:var(--font-mono); font-size:0.8rem; color:#475569; display:flex; gap:16px;">
            <span>📅 ${p.publishedDate}</span>
            <span>⏱️ ${p.readTime}</span>
          </div>
        </div>
      </header>

      <!-- HERO IMAGE -->
      <div class="blog-hero-image-box">
        <img src="${p.heroImage}" alt="${p.title}" class="blog-article-hero-img" />
      </div>

      <!-- ARTICLE BODY -->
      <div class="blog-article-content">
        ${p.content}
      </div>

      <!-- TAGS & SHARE BAR -->
      <div class="blog-tags-share-bar">
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <span style="font-family:var(--font-mono); font-weight:900; font-size:0.8rem; color:#000;">TAGS:</span>
          ${p.tags.map(t => `<span class="blog-tag-pill">#${t}</span>`).join('')}
        </div>

        <div style="display:flex; gap:8px; align-items:center;">
          <span style="font-family:var(--font-mono); font-weight:900; font-size:0.8rem;">SHARE:</span>
          <button onclick="navigator.clipboard.writeText(window.location.href); alert('Article URL copied to clipboard!');" class="btn-inspect" style="padding:4px 10px; font-size:0.75rem;">📋 Copy Link</button>
        </div>
      </div>

      <!-- RELATED STORE GRAILS BLOCK -->
      ${relatedProducts.length > 0 ? `
        <section class="blog-related-products-section">
          <div style="font-family:var(--font-mono); font-weight:800; font-size:0.8rem; color:var(--accent-red); letter-spacing:1px; margin-bottom:4px;">
            FEATURED IN THIS ARTICLE
          </div>
          <h2 class="title-section" style="font-size:1.5rem; margin-bottom:1.5rem;">VAULT ARTIFACTS &amp; MERCHANDISE</h2>
          <div class="cards-grid" id="blogRelatedGrid">
            ${relatedProducts.map(prod => renderProductCard(prod)).join('')}
          </div>
        </section>
      ` : ''}

      <!-- BACK TO JOURNAL CTA -->
      <div style="text-align:center; margin:3.5rem 0;">
        <a href="blog.html" class="btn-pill" style="text-decoration:none; padding:14px 28px; font-size:1rem;">
          ← Return to All Journal Articles
        </a>
      </div>
    `;

    const relatedGrid = document.getElementById('blogRelatedGrid');
    if (relatedGrid) bindProductCardEvents(relatedGrid);
  }
}

new BlogPostPage();
