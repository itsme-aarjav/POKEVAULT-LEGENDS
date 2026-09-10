/**
 * POKÉVAULT LEGENDS — Standalone Full Cart Page Controller
 * Manages cart items table, promo discounts, insurance, and summary calculations.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { getCart, updateCartQty, removeFromCart, clearCart, getCartSubtotal, applyPromoCode, getPromoState, setInsurance, getInsuranceState } from './utils/store.js';

class CartPage {
  constructor() {
    this.initLayout();
    this.renderCartTable();
    this.bindCartPageEvents();

    window.addEventListener('pv-cart-updated', () => this.renderCartTable());
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
      if (subtotalText) subtotalText.textContent = '$0.00';
      if (discountRow) discountRow.style.display = 'none';
      if (shippingText) shippingText.textContent = '$0.00';
      if (totalText) totalText.textContent = '$0.00';
      return;
    }

    const subtotal = getCartSubtotal();
    const promo = getPromoState();
    const insuranceIncluded = getInsuranceState();
    const shippingCost = insuranceIncluded ? 9.99 : 0;

    let discountAmount = 0;
    if (promo.discountPercent > 0) {
      discountAmount = (subtotal * promo.discountPercent) / 100;
    }

    const grandTotal = Math.max(0, subtotal - discountAmount + shippingCost);

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
            const itemTotal = p.price * item.quantity;
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
                <td style="font-weight:700;">$${p.price.toFixed(2)}</td>
                <td>
                  <div class="qty-control-box">
                    <button class="btn-qty page-qty-dec" data-id="${p.id}">-</button>
                    <span style="font-family:var(--font-mono); font-weight:700; font-size:0.95rem; padding:0 6px;">${item.quantity}</span>
                    <button class="btn-qty page-qty-inc" data-id="${p.id}">+</button>
                  </div>
                </td>
                <td style="font-weight:900; color:var(--accent-red);">$${itemTotal.toFixed(2)}</td>
                <td>
                  <button class="btn-inspect page-remove-item" data-id="${p.id}" style="padding:4px 10px; font-size:0.75rem; color:var(--accent-red);">✕ Remove</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    if (subtotalText) subtotalText.textContent = `$${subtotal.toFixed(2)}`;
    if (shippingText) shippingText.textContent = insuranceIncluded ? '$9.99' : 'FREE';

    if (discountRow) {
      if (discountAmount > 0) {
        discountRow.style.display = 'flex';
        if (discountText) discountText.textContent = `-$${discountAmount.toFixed(2)}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (totalText) totalText.textContent = `$${grandTotal.toFixed(2)}`;

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
  }
}

new CartPage();
