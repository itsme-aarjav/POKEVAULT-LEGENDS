import { getCart, getWishlist, getCurrency, setCurrency } from '../utils/store.js';
import { searchProducts } from '../data/products.js';
import { initSocialProofToast } from '../utils/social-proof.js';

export function renderNavbar(activePage = 'home') {
  const cart = getCart();
  const wishlist = getWishlist();
  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalWishlistCount = wishlist.length;
  const currentCurr = getCurrency();

  return `
    <!-- TOP TICKER MARQUEE (Trust, Pop Culture & Urgency) -->
    <div class="ticker-wrap">
      <div class="ticker-move">
        <span class="ticker-item"><img src="assets/pokeball-emoji.png" alt="Pokéball" class="pokeball-emoji-sm" /> 🔥 POP CULTURE WATCH: 1st Edition Charizard &amp; Illustrator Pikachu Slabs Surge +214% in 2026</span>
        <span class="ticker-item"><img src="assets/pokeball-emoji.png" alt="Pokéball" class="pokeball-emoji-sm" /> 🌸 DIRECT FROM TOKYO: Authentic Akihabara Pokémon Center Exclusives with Japanese Tags</span>
        <span class="ticker-item"><img src="assets/pokeball-emoji.png" alt="Pokéball" class="pokeball-emoji-sm" /> ⚡ FREE INSURED BLUEDART VAULT AIR SHIPPING ON ORDERS ₹2,500+</span>
        <span class="ticker-item"><img src="assets/pokeball-emoji.png" alt="Pokéball" class="pokeball-emoji-sm" /> 🛡️ 100% PSA &amp; BGS AUTHENTICITY WITH 5-POINT FORENSIC VAULT AUDIT</span>
        <span class="ticker-item"><img src="assets/pokeball-emoji.png" alt="Pokéball" class="pokeball-emoji-sm" /> 🎁 USE CODE "POKEVAULT10" FOR 10% OFF YOUR COLLECTOR ORDER</span>
      </div>
    </div>

    <!-- MAIN NAVBAR -->
    <header class="navbar">
      <div class="nav-left">
        <button class="icon-btn" id="cartBtn" aria-label="View Shopping Cart">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span class="cart-count" id="cartCount">${totalCartUnits}</span>
        </button>

        <a href="wishlist.html" class="icon-btn" aria-label="Wishlist">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span class="cart-count" id="wishlistCount" style="background:var(--accent-red);">${totalWishlistCount}</span>
        </a>
      </div>

      <a href="index.html" class="logo-stamp">
        <div class="logo-badge"><img src="assets/pokeball-emoji.png" alt="Pokéball" class="pokeball-emoji-sm" style="margin-right: 3px;" /> POKÉVAULT</div>
        <div style="font-family: var(--font-display); font-size: 1.5rem; color: var(--accent-red); margin-top: 2px;">LEGENDS</div>
      </a>

      <!-- SEARCH BAR -->
      <div class="nav-search-wrap">
        <form action="search.html" method="GET" class="nav-search-form">
          <input type="text" name="q" id="navSearchInput" class="nav-search-input" placeholder="Search Pikachu, Plush, Cards, Apparel..." autocomplete="off" />
          <button type="submit" class="nav-search-btn" aria-label="Search">🔍</button>
        </form>
        <div class="search-results-dropdown" id="searchDropdown"></div>
      </div>

      <nav class="nav-right">
        <ul class="nav-links">
          <li><a href="index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">Home</a></li>
          <li><a href="shop.html" class="nav-link ${activePage === 'shop' ? 'active' : ''}">Shop</a></li>
          <li><a href="categories.html" class="nav-link ${activePage === 'categories' ? 'active' : ''}">All Categories</a></li>
          <li class="nav-item-dropdown" id="navFeaturesDropdown">
            <button type="button" class="nav-dropdown-trigger ${['verify', 'rewards', 'mystery', 'blog'].includes(activePage) ? 'active' : ''}" id="featuresDropdownBtn" aria-haspopup="true" aria-expanded="false">
              Vault Features <span class="nav-dropdown-chevron">▼</span>
            </button>
            <div class="nav-dropdown-menu" id="featuresDropdownMenu" role="menu">
              <a href="verify.html" class="nav-dropdown-item ${activePage === 'verify' ? 'active' : ''}" role="menuitem">
                <span class="nav-dropdown-icon">🔍</span>
                <div class="nav-dropdown-text">
                  <span class="nav-dropdown-title">Verify Certs</span>
                  <span class="nav-dropdown-desc">PSA &amp; BGS Forensic Audit</span>
                </div>
              </a>
              <a href="mystery-vault.html" class="nav-dropdown-item ${activePage === 'mystery' ? 'active' : ''}" role="menuitem">
                <span class="nav-dropdown-icon">🎁</span>
                <div class="nav-dropdown-text">
                  <span class="nav-dropdown-title">Mystery Vault</span>
                  <span class="nav-dropdown-desc">Live Box Simulator &amp; Drops</span>
                </div>
              </a>
              <a href="blog.html" class="nav-dropdown-item ${activePage === 'blog' ? 'active' : ''}" role="menuitem">
                <span class="nav-dropdown-icon">📰</span>
                <div class="nav-dropdown-text">
                  <span class="nav-dropdown-title">The Journal</span>
                  <span class="nav-dropdown-desc">Market News &amp; Master Guides</span>
                </div>
              </a>
              <a href="rewards.html" class="nav-dropdown-item ${activePage === 'rewards' ? 'active' : ''}" role="menuitem">
                <span class="nav-dropdown-icon">🪙</span>
                <div class="nav-dropdown-text">
                  <span class="nav-dropdown-title">VIP Rewards</span>
                  <span class="nav-dropdown-desc">PokéCoins &amp; Collector Perks</span>
                </div>
              </a>
            </div>
          </li>
          <li><a href="about.html" class="nav-link ${activePage === 'about' ? 'active' : ''}">About</a></li>
        </ul>

        <button class="mobile-nav-toggle" id="mobileNavToggleBtn" aria-label="Open Mobile Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </nav>
    </header>

    <!-- MOBILE NAVIGATION DRAWER OVERLAY -->
    <div class="mobile-nav-overlay" id="mobileNavOverlay">
      <div class="mobile-nav-menu">
        <div class="mobile-nav-header">
          <div class="logo-stamp">
            <div class="logo-badge">POKÉVAULT</div>
          </div>
          <button class="mobile-nav-close" id="closeMobileNavBtn" aria-label="Close Mobile Menu">&times;</button>
        </div>
        <ul class="mobile-nav-links">
          <li><a href="index.html" class="mobile-nav-link ${activePage === 'home' ? 'active' : ''}">⚡ Home</a></li>
          <li><a href="shop.html" class="mobile-nav-link ${activePage === 'shop' ? 'active' : ''}">🛒 Shop All Merchandise</a></li>
          <li><a href="categories.html" class="mobile-nav-link ${activePage === 'categories' ? 'active' : ''}">🏷️ All Categories</a></li>
          <li class="mobile-nav-divider"><span>VAULT FEATURES</span></li>
          <li><a href="verify.html" class="mobile-nav-link ${activePage === 'verify' ? 'active' : ''}">🔍 Verify PSA Slabs</a></li>
          <li><a href="mystery-vault.html" class="mobile-nav-link ${activePage === 'mystery' ? 'active' : ''}">🎁 Mystery Vault Simulator</a></li>
          <li><a href="blog.html" class="mobile-nav-link ${activePage === 'blog' ? 'active' : ''}">📰 The PokéVault Journal</a></li>
          <li><a href="rewards.html" class="mobile-nav-link ${activePage === 'rewards' ? 'active' : ''}">🪙 PokéCoins VIP Rewards</a></li>
          <li class="mobile-nav-divider"><span>MORE</span></li>
          <li><a href="track.html" class="mobile-nav-link ${activePage === 'track' ? 'active' : ''}">📦 Track My Package</a></li>
          <li><a href="about.html" class="mobile-nav-link ${activePage === 'about' ? 'active' : ''}">📜 About PokéVault</a></li>
          <li><a href="wishlist.html" class="mobile-nav-link ${activePage === 'wishlist' ? 'active' : ''}">❤️ My Saved Wishlist</a></li>
          <li><a href="cart.html" class="mobile-nav-link ${activePage === 'cart' ? 'active' : ''}">🛍️ Shopping Cart</a></li>
        </ul>
      </div>
    </div>

    <!-- STICKY MOBILE BOTTOM NAVIGATION BAR -->
    <nav class="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      <a href="index.html" class="mob-nav-item ${activePage === 'home' ? 'active' : ''}">
        <span class="mob-nav-icon">🏠</span>
        <span>Home</span>
      </a>
      <a href="shop.html" class="mob-nav-item ${activePage === 'shop' ? 'active' : ''}">
        <span class="mob-nav-icon">🛍️</span>
        <span>Shop</span>
      </a>
      <a href="rewards.html" class="mob-nav-item ${activePage === 'rewards' ? 'active' : ''}">
        <span class="mob-nav-icon">🪙</span>
        <span>Rewards</span>
      </a>
      <a href="track.html" class="mob-nav-item ${activePage === 'track' ? 'active' : ''}">
        <span class="mob-nav-icon">📦</span>
        <span>Track</span>
      </a>
      <a href="cart.html" class="mob-nav-item ${activePage === 'cart' ? 'active' : ''}" id="mobCartBtn">
        <span class="mob-nav-icon">🛒</span>
        <span>Cart</span>
        <span class="mob-nav-badge" id="mobCartCount">${totalCartUnits}</span>
      </a>
    </nav>
  `;
}

export function initNavbarEvents() {
  // Initialize Global Social Proof Toast notifications
  initSocialProofToast();

  // Mobile Nav Handlers
  const mobileNavToggleBtn = document.getElementById('mobileNavToggleBtn');
  const mobileNavOverlay = document.getElementById('mobileNavOverlay');
  const closeMobileNavBtn = document.getElementById('closeMobileNavBtn');

  mobileNavToggleBtn?.addEventListener('click', () => mobileNavOverlay?.classList.add('open'));
  closeMobileNavBtn?.addEventListener('click', () => mobileNavOverlay?.classList.remove('open'));
  mobileNavOverlay?.addEventListener('click', (e) => {
    if (e.target === mobileNavOverlay) mobileNavOverlay.classList.remove('open');
  });

  // Auto-close mobile nav when any link inside is tapped
  mobileNavOverlay?.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => mobileNavOverlay.classList.remove('open'));
  });

  // Live Instant Search Dropdown
  const searchInput = document.getElementById('navSearchInput');
  const searchDropdown = document.getElementById('searchDropdown');

  if (searchInput && searchDropdown) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (q.length < 2) {
        searchDropdown.style.display = 'none';
        return;
      }

      const matches = searchProducts(q).slice(0, 5);
      if (matches.length === 0) {
        searchDropdown.innerHTML = `<div class="search-no-result">No Pokémon merchandise found matching "${q}"</div>`;
      } else {
        searchDropdown.innerHTML = matches.map(item => `
          <a href="product.html?id=${item.id}" class="search-dropdown-item">
            <img src="${item.image}" alt="${item.name}" loading="lazy" width="40" height="40" />
            <div>
              <div class="search-item-title">${item.name}</div>
              <div class="search-item-meta">${item.categoryName} • ₹${Math.round(item.price > 500 ? item.price : item.price * 83).toLocaleString('en-IN')}</div>
            </div>
          </a>
        `).join('') + `<a href="search.html?q=${encodeURIComponent(q)}" class="search-view-all">View all results for "${q}" →</a>`;
      }
      searchDropdown.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.style.display = 'none';
      }
    });
  }

  // Vault Features Dropdown Click & Accessibility Handlers
  const featuresDropdownBtn = document.getElementById('featuresDropdownBtn');
  const navFeaturesDropdown = document.getElementById('navFeaturesDropdown');

  if (featuresDropdownBtn && navFeaturesDropdown) {
    featuresDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navFeaturesDropdown.classList.toggle('open');
      featuresDropdownBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!navFeaturesDropdown.contains(e.target)) {
        navFeaturesDropdown.classList.remove('open');
        featuresDropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        navFeaturesDropdown.classList.remove('open');
        featuresDropdownBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Update Dynamic Badges on Custom Events
  window.addEventListener('pv-cart-updated', (e) => {
    const cart = e.detail || getCart();
    const count = cart.reduce((sum, i) => sum + i.quantity, 0);
    const countEl = document.getElementById('cartCount');
    if (countEl) countEl.textContent = count;
    const mobCountEl = document.getElementById('mobCartCount');
    if (mobCountEl) mobCountEl.textContent = count;
  });

  window.addEventListener('pv-wishlist-updated', (e) => {
    const wishlist = e.detail || getWishlist();
    const count = wishlist.length;
    const countEl = document.getElementById('wishlistCount');
    if (countEl) countEl.textContent = count;
    const mobCountEl = document.getElementById('mobWishlistCount');
    if (mobCountEl) mobCountEl.textContent = count;
  });
}
