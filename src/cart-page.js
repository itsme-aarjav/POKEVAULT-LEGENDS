/**
 * POKÉVAULT LEGENDS — Standalone Full Cart Page Controller
 * Manages cart items table, multi-item price calculations, promo discounts, insurance, and summary calculations.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { getCart, updateCartQty, removeFromCart, clearCart, getCartSubtotal, applyPromoCode, removePromoCode, getPromoState, setInsurance, getInsuranceState } from './utils/store.js';

class CartPage {
  constructor() {
    this.initLayout();
    this.renderCartTable();
    this.bindCartPageEvents();

    window.addEventListener('pv-cart-updated', () => this.renderCartTable());
    window.addEventListener('pv-promo-updated', () => this.renderCartTable());
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar('cart');
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  renderCartTable() {
    const tableContainer = document.getElementById('cartPageItemsTable');
    const subtotalText = document.getElementById('cartSubtotalText');
    const discountRow = document.getElementById('discountRow');
    const discountLabel = document.getElementById('cartDiscountLabel');
    const discountText = document.getElementById('cartDiscountText');
    const shippingText = document.getElementById('shippingText');
    const totalText = document.getElementById('cartTotalText');
    if (!tableContainer) return;

    const cart = getCart();

    if (cart.length === 0) {
      tableContainer.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem; background: #FFF;">
          <h3 style="font-family: var(--font-title); font-size: 1.8rem; color: var(--accent-red); margin-bottom: 0.75rem;">YOUR CART IS EMPTY</h3>
          <p style="font-family: var(--font-mono); color: #666; margin-bottom: 1.5rem;">Explore over 60+ Pokémon plushies, cards, figures, and apparel in our marketplace.</p>
          <a href="shop.html" class="btn-pill" style="text-decoration: none;">Browse Pokémon Marketplace →</a>
        </div>
      `;
      if (subtotalText) subtotalText.textContent = '₹0';
      if (discountRow) discountRow.style.display = 'none';
      if (shippingText) shippingText.textContent = '₹0';
      if (totalText) totalText.textContent = '₹0';
      return;
    }

    const subtotalUSD = getCartSubtotal();
    const inrSubtotal = Math.round(subtotalUSD * 83);
    const promo = getPromoState();
    const insuranceIncluded = getInsuranceState();
    const inrShipping = (insuranceIncluded && !promo.freeShipping) ? 150 : 0;

    let inrDiscount = 0;
    if (promo.type === 'fixed' && promo.fixedINR) {
      inrDiscount = Math.min(inrSubtotal, promo.fixedINR);
    } else if (promo.discountPercent > 0) {
      inrDiscount = Math.round((inrSubtotal * promo.discountPercent) / 100);
    }

    const grandTotal = Math.max(0, inrSubtotal - inrDiscount + inrShipping);

    tableContainer.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Unit Price</th>
            <th>Quantity</th>
            <th>Item Total</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${cart.map(item => {
            const p = item.product;
            if (!p) return '';
            const unitPriceINR = Math.round(p.price * 83);
            const itemTotalINR = unitPriceINR * item.quantity;
            return `
              <tr>
                <td style="display:flex; align-items:center; gap:12px;">
                  <img src="${p.image}" style="width:50px; height:50px; object-fit:contain; background:#FFFFFF; border-radius:6px; border:1px solid #000; position:relative; z-index:2;" alt="${p.name}" />
                  <div>
                    <a href="product.html?id=${p.id}" style="font-family:var(--font-title); font-weight:900; font-size:0.95rem; color:#000; text-decoration:none;">${p.name}</a>
                    <div style="font-size:0.75rem; color:#666;">SKU: ${p.sku || p.id}</div>
                  </div>
                </td>
                <td style="font-weight:700;">${p.categoryName}</td>
                <td style="font-weight:700;">₹${unitPriceINR.toLocaleString('en-IN')}</td>
                <td>
                  <div class="qty-control-box">
                    <button class="btn-qty page-qty-dec" data-id="${p.id}">-</button>
                    <span style="font-family:var(--font-mono); font-weight:700; font-size:0.95rem; padding:0 6px;">${item.quantity}</span>
                    <button class="btn-qty page-qty-inc" data-id="${p.id}">+</button>
                  </div>
                </td>
                <td style="font-weight:900; color:var(--accent-red);">₹${itemTotalINR.toLocaleString('en-IN')}</td>
                <td>
                  <button class="btn-inspect page-remove-item" data-id="${p.id}" style="padding:4px 10px; font-size:0.75rem; color:var(--accent-red);">✕ Remove</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    if (subtotalText) subtotalText.textContent = `₹${inrSubtotal.toLocaleString('en-IN')}`;
    if (shippingText) shippingText.textContent = inrShipping > 0 ? '₹150' : 'FREE';

    if (discountRow) {
      if (inrDiscount > 0) {
        discountRow.style.display = 'flex';
        if (discountLabel) discountLabel.textContent = `Discount Applied (${promo.code}):`;
        if (discountText) discountText.textContent = `-₹${inrDiscount.toLocaleString('en-IN')}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (totalText) totalText.textContent = `₹${grandTotal.toLocaleString('en-IN')}`;

    // Update Promo Box in Cart Page
    const activeBadge = document.getElementById('cartPageActivePromoBadge');
    const promoForm = document.getElementById('cartPagePromoForm');
    const appliedRow = document.getElementById('cartPageAppliedPromoRow');
    const appliedText = document.getElementById('cartPageAppliedPromoText');
    const promoInput = document.getElementById('cartPagePromoInput');

    if (promo && promo.code) {
      if (activeBadge) {
        activeBadge.textContent = promo.code;
        activeBadge.style.display = 'inline-block';
      }
      if (promoForm) promoForm.style.display = 'none';
      if (appliedRow) {
        appliedRow.style.display = 'flex';
        if (appliedText) {
          appliedText.innerHTML = `✓ <strong>${promo.code}</strong> — ${promo.description || 'Discount Applied'}`;
        }
      }
    } else {
      if (activeBadge) activeBadge.style.display = 'none';
      if (promoForm) promoForm.style.display = 'flex';
      if (appliedRow) appliedRow.style.display = 'none';
      if (promoInput) promoInput.value = '';
    }

    // Bind Table Controls
    tableContainer.querySelectorAll('.page-qty-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = cart.find(i => i.id === id);
        if (item) updateCartQty(id, item.quantity - 1);
      });
    });

    tableContainer.querySelectorAll('.page-qty-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = cart.find(i => i.id === id);
        if (item) updateCartQty(id, item.quantity + 1);
      });
    });

    tableContainer.querySelectorAll('.page-remove-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        removeFromCart(id);
      });
    });
  }

  bindCartPageEvents() {
    const clearBtn = document.getElementById('clearCartPageBtn');
    const insuranceCheckbox = document.getElementById('insuranceCheckbox');
    const promoForm = document.getElementById('cartPagePromoForm');
    const removePromoBtn = document.getElementById('cartPageRemovePromoBtn');

    clearBtn?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your cart?')) {
        clearCart();
      }
    });

    insuranceCheckbox?.addEventListener('change', (e) => {
      setInsurance(e.target.checked);
      this.renderCartTable();
    });

    promoForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('cartPagePromoInput');
      const status = document.getElementById('cartPagePromoStatus');
      const res = applyPromoCode(input?.value);
      if (status) {
        status.textContent = res.message;
        status.style.color = res.success ? '#166534' : 'var(--accent-red)';
      }
      this.renderCartTable();
    });

    removePromoBtn?.addEventListener('click', () => {
      const res = removePromoCode();
      const status = document.getElementById('cartPagePromoStatus');
      if (status) {
        status.textContent = res.message;
        status.style.color = '#64748B';
      }
      this.renderCartTable();
    });
  }
}

new CartPage();
