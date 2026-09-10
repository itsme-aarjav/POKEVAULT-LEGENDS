/**
 * POKÉVAULT LEGENDS — High-AOV Conversion-Optimized Cart Drawer
 * Includes Gamified Free Shipping Bar, In-Cart Upsells, SSL Security Badges, and Micro-Copy Trust Signals.
 */

import { getCart, updateCartQty, removeFromCart, getCartSubtotal, applyPromoCode, getPromoState, addToCart } from '../utils/store.js';
import { getAllProducts } from '../data/products.js';

const FREE_SHIPPING_THRESHOLD = 100;

export function renderCartDrawer() {
  return `
    <div class="cart-overlay" id="cartOverlay"></div>
    <div class="cart-drawer" id="cartDrawer">
      <!-- HEADER -->
      <div class="cart-header">
        <div class="cart-title"><img src="assets/pokeball-emoji.png" alt="Pokéball" class="pokeball-emoji" /> YOUR VAULT CART</div>
        <button class="cart-close-btn" id="closeCartBtn">&times;</button>
      </div>

      <!-- GAMIFIED FREE SHIPPING BAR -->
      <div id="freeShippingBarBox" style="background:#FFFDE7; border-bottom:2px solid #000; padding:10px 16px;">
        <div id="freeShippingMsg" style="font-family:var(--font-mono); font-size:0.78rem; font-weight:800; text-align:center; margin-bottom:6px; color:#000;">
          Calculating shipping...
        </div>
        <div style="background:#E2E8F0; height:10px; border-radius:5px; border:1.5px solid #000; overflow:hidden;">
          <div id="freeShippingProgress" style="height:100%; width:0%; background:linear-gradient(90deg, #10B981, #059669); transition:width 0.4s ease;"></div>
        </div>
      </div>

      <!-- CART ITEMS LIST -->
      <div class="cart-items" id="cartItemsContainer">
        <!-- Rendered dynamically -->
      </div>

      <!-- INTELLIGENT IN-CART UPSELLS -->
      <div id="cartUpsellsBox" style="background:#F8FAFC; border-top:2px solid #000; border-bottom:2px solid #000; padding:12px 16px;">
        <div style="font-family:var(--font-mono); font-size:0.75rem; font-weight:900; letter-spacing:0.5px; color:#000; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          <span><img src="assets/pokeball-emoji.png" alt="Pokéball" class="pokeball-emoji-sm" /> RECOMMENDED VAULT ADD-ONS</span>
        </div>
        <div id="cartUpsellsList" style="display:flex; gap:10px; overflow-x:auto; padding-bottom:4px;">
          <!-- Injected dynamically -->
        </div>
      </div>

      <!-- PROMO CODE SECTION -->
      <div class="cart-promo-box" style="padding: 0.75rem 1rem; border-bottom: 2px solid #000; background: #FFF;">
        <div style="font-family: var(--font-mono); font-size: 0.75rem; font-weight: 700; margin-bottom: 6px;">PROMO / VIP DISCOUNT CODE</div>
        <form id="cartDrawerPromoForm" style="display:flex; gap:6px;">
          <input type="text" id="cartPromoInput" placeholder="e.g. POKEVAULT10" style="flex:1; padding:6px 10px; font-family:var(--font-mono); font-size:0.8rem; border:2px solid #000; text-transform:uppercase;" />
          <button type="submit" class="btn-inspect" style="padding:6px 12px; font-size:0.75rem;">Apply</button>
        </form>
        <div id="cartPromoMsg" style="font-family:var(--font-mono); font-size:0.75rem; margin-top:4px; font-weight:700;"></div>
      </div>

      <!-- FOOTER & CHECKOUT ACTION -->
      <div class="cart-footer">
        <div class="cart-subtotal-row" style="margin-top: 0.25rem;">
          <span>SUBTOTAL:</span>
          <span id="drawerCartSubtotal">$0.00</span>
        </div>
        <div id="drawerCartDiscountRow" style="display:none; justify-content:space-between; font-family:var(--font-mono); font-size:0.85rem; color:var(--accent-red); margin-bottom:0.5rem; font-weight:700;">
          <span>DISCOUNT:</span>
          <span id="drawerCartDiscount">-$0.00</span>
        </div>

        <a href="checkout.html" class="btn-pill" id="drawerCheckoutBtn" style="width: 100%; text-align:center; display:block; text-decoration:none; box-sizing:border-box; font-size:1.05rem; padding:14px;">
          <img src="assets/pokeball-emoji.png" alt="Pokéball" class="pokeball-emoji" /> Proceed to Secure Checkout &amp; Dispatch →
        </a>

        <!-- MICRO-COPY TRUST SIGNALS -->
        <div style="margin-top:10px; text-align:center; font-family:var(--font-mono); font-size:0.72rem; color:#475569; display:flex; flex-direction:column; gap:4px; align-items:center;">
          <div style="font-weight:700; color:#1E293B;">🔒 256-Bit SSL Encrypted Vault Checkout</div>
          <div style="color:#64748B;">💳 Visa • Mastercard • PayPal • Apple Pay • Google Pay</div>
          <div style="color:#059669; font-weight:800;"><img src="assets/pokeball-emoji.png" alt="Pokéball" class="pokeball-emoji-sm" /> Earn PokéCoins Rewards on this order</div>
        </div>
      </div>
    </div>
  `;
}

export function updateCartDrawerUI() {
  const container = document.getElementById('cartItemsContainer');
  const subtotalEl = document.getElementById('drawerCartSubtotal');
  const discountRow = document.getElementById('drawerCartDiscountRow');
  const discountEl = document.getElementById('drawerCartDiscount');
  const freeMsg = document.getElementById('freeShippingMsg');
  const freeProgress = document.getElementById('freeShippingProgress');
  const upsellsList = document.getElementById('cartUpsellsList');
  if (!container) return;

  const cart = getCart();
  const subtotal = getCartSubtotal();

  // Update Free Shipping Progress Bar (India BlueDart: ₹999 threshold)
  const FREE_SHIPPING_INR = 999;
  const inrSubtotal = subtotal > 500 ? subtotal : subtotal * 83;

  if (inrSubtotal === 0) {
    if (freeMsg) freeMsg.innerHTML = `Add items to qualify for <strong>FREE BlueDart Express Delivery (India)</strong>!`;
    if (freeProgress) freeProgress.style.width = '0%';
  } else if (inrSubtotal >= FREE_SHIPPING_INR) {
    if (freeMsg) freeMsg.innerHTML = `🎉 <strong>UNLOCKED!</strong> You qualified for <strong>FREE BlueDart Express Delivery</strong>!`;
    if (freeProgress) freeProgress.style.width = '100%';
  } else {
    const diff = FREE_SHIPPING_INR - inrSubtotal;
    const pct = Math.min(100, Math.round((inrSubtotal / FREE_SHIPPING_INR) * 100));
    if (freeMsg) freeMsg.innerHTML = `Add <strong>₹${Math.round(diff).toLocaleString('en-IN')}</strong> more for <strong>FREE BlueDart Express Delivery</strong>!`;
    if (freeProgress) freeProgress.style.width = `${pct}%`;
  }

  // Handle Empty Cart
  if (cart.length === 0) {
    container.innerHTML = `<div class="cart-empty-msg">YOUR VAULT CART IS EMPTY. DISCOVER AUTHENTIC LEGENDS!</div>`;
    if (subtotalEl) subtotalEl.textContent = '₹0';
    if (discountRow) discountRow.style.display = 'none';
    if (upsellsList) upsellsList.innerHTML = '';
    return;
  }

  const promo = getPromoState();
  let discountAmount = 0;
  if (promo.discountPercent > 0) {
    discountAmount = (inrSubtotal * promo.discountPercent) / 100;
  }

  container.innerHTML = cart.map(item => {
    const p = item.product;
    if (!p) return '';
    const itemPriceINR = Math.round(p.price > 500 ? p.price : p.price * 83);
    return `
      <div class="cart-item-row" data-id="${p.id}">
        <img src="${p.image}" class="cart-item-thumb" alt="${p.name}" loading="lazy" />
        <div class="cart-item-details">
          <div class="cart-item-title">${p.name}</div>
          <div class="cart-item-meta">${p.categoryName}</div>
          <div class="cart-item-price">₹${(itemPriceINR * item.quantity).toLocaleString('en-IN')}</div>
          <div class="cart-qty-row" style="margin-top:6px; display:flex; align-items:center; gap:6px;">
            <button class="btn-qty drawer-qty-dec" data-id="${p.id}">-</button>
            <span style="font-family:var(--font-mono); font-weight:700; font-size:0.85rem;">${item.quantity}</span>
            <button class="btn-qty drawer-qty-inc" data-id="${p.id}">+</button>
            <button class="cart-item-remove drawer-remove-item" data-id="${p.id}" style="margin-left:auto; background:none; border:none; color:var(--accent-red); cursor:pointer; font-size:0.8rem; font-weight:700;">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Render In-Cart Upsells in INR
  if (upsellsList) {
    const all = getAllProducts();
    const cartIds = new Set(cart.map(i => i.id));
    const suggested = all.filter(p => !cartIds.has(p.id)).slice(0, 3);

    upsellsList.innerHTML = suggested.map(p => {
      const upsellPriceINR = Math.round(p.price > 500 ? p.price : p.price * 83);
      return `
      <div style="background:#FFF; border:2px solid #000; border-radius:6px; padding:6px 10px; display:flex; align-items:center; gap:8px; min-width:210px; flex-shrink:0;">
        <img src="${p.image}" style="width:40px; height:40px; object-fit:contain;" alt="${p.name}" />
        <div style="flex:1; overflow:hidden;">
          <div style="font-family:var(--font-title); font-size:0.75rem; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#000;">${p.name}</div>
          <div style="font-family:var(--font-mono); font-size:0.75rem; font-weight:700; color:var(--accent-red);">₹${upsellPriceINR.toLocaleString('en-IN')}</div>
        </div>
        <button class="btn-pill drawer-upsell-add-btn" data-upsell-id="${p.id}" style="padding:4px 8px; font-size:0.7rem;">+ Add</button>
      </div>
    `}).join('');

    upsellsList.querySelectorAll('.drawer-upsell-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-upsell-id');
        addToCart(id, 1);
      });
    });
  }

  if (subtotalEl) subtotalEl.textContent = `₹${Math.round(inrSubtotal - discountAmount).toLocaleString('en-IN')}`;
  if (discountRow) {
    if (discountAmount > 0) {
      discountRow.style.display = 'flex';
      if (discountEl) discountEl.textContent = `-₹${Math.round(discountAmount).toLocaleString('en-IN')}`;
    } else {
      discountRow.style.display = 'none';
    }
  }

  // Bind item controls
  container.querySelectorAll('.drawer-qty-dec').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const item = cart.find(i => i.id === id);
      if (item) updateCartQty(id, item.quantity - 1);
    });
  });

  container.querySelectorAll('.drawer-qty-inc').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const item = cart.find(i => i.id === id);
      if (item) updateCartQty(id, item.quantity + 1);
    });
  });

  container.querySelectorAll('.drawer-remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      removeFromCart(id);
    });
  });
}

export function initCartDrawerEvents() {
  const cartBtn = document.getElementById('cartBtn');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartDrawer = document.getElementById('cartDrawer');
  const promoForm = document.getElementById('cartDrawerPromoForm');

  const openDrawer = () => {
    cartOverlay?.classList.add('open');
    cartDrawer?.classList.add('open');
    updateCartDrawerUI();
  };

  const closeDrawer = () => {
    cartOverlay?.classList.remove('open');
    cartDrawer?.classList.remove('open');
  };

  cartBtn?.addEventListener('click', openDrawer);
  closeCartBtn?.addEventListener('click', closeDrawer);
  cartOverlay?.addEventListener('click', closeDrawer);

  promoForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('cartPromoInput');
    const msg = document.getElementById('cartPromoMsg');
    const res = applyPromoCode(input?.value);
    if (msg) {
      msg.textContent = res.message;
      msg.style.color = res.success ? '#166534' : 'var(--accent-red)';
    }
    updateCartDrawerUI();
  });

  window.addEventListener('pv-cart-updated', updateCartDrawerUI);
}
