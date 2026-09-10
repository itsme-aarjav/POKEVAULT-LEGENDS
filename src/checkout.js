/**
 * POKÉVAULT LEGENDS — Standalone Checkout Controller
 * Manages Trainer's Vault Checkout, order summary, shipping form, dispatch speed selection,
 * PayPal SDK integration, and Order creation API.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { getCart, getCartSubtotal, getPromoState, getInsuranceState, clearCart } from './utils/store.js';

class CheckoutPage {
  constructor() {
    this.cart = getCart();

    if (this.cart.length === 0) {
      alert('Your cart is empty! Redirecting to shop.');
      window.location.href = 'shop.html';
      return;
    }

    this.initLayout();
    this.renderSummary();
    this.initPayPalSDK();
    this.bindFormEvents();
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar('cart');
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  getCalculatedTotals() {
    const subtotal = getCartSubtotal();
    const promo = getPromoState();
    const dispatchSpeedEl = document.querySelector('input[name="dispatchSpeed"]:checked');
    const isExpress = dispatchSpeedEl ? dispatchSpeedEl.value === 'express' : true;
    const shipping = isExpress ? 9.99 : 0;

    let discount = 0;
    if (promo.discountPercent > 0) {
      discount = (subtotal * promo.discountPercent) / 100;
    }

    const total = Math.max(0.01, subtotal - discount + shipping);
    const vaultPoints = Math.floor(total);

    return { subtotal, discount, shipping, total, vaultPoints, promoCode: promo.code };
  }

  renderSummary() {
    const itemsList = document.getElementById('checkoutItemsList');
    const subtotalEl = document.getElementById('coSubtotal');
    const discountRow = document.getElementById('coDiscountRow');
    const discountEl = document.getElementById('coDiscount');
    const shippingEl = document.getElementById('coShipping');
    const totalEl = document.getElementById('coTotal');
    const pointsText = document.getElementById('coPointsText');

    if (!itemsList) return;

    itemsList.innerHTML = this.cart.map(item => {
      const p = item.product;
      if (!p) return '';
      const inrPrice = Math.round(p.price > 500 ? p.price : p.price * 83);
      return `
        <div class="co-item-row">
          <div class="co-item-thumb-box">
            <img src="${p.image}" alt="${p.name}" class="co-item-img" />
          </div>
          <div class="co-item-details">
            <div class="co-item-name">${item.quantity} x ${p.name}</div>
            <div class="co-item-price">₹${inrPrice.toLocaleString('en-IN')}</div>
          </div>
        </div>
      `;
    }).join('');

    const totals = this.getCalculatedTotals();
    const inrSubtotal = totals.subtotal > 500 ? totals.subtotal : totals.subtotal * 83;
    const inrShipping = totals.shipping > 0 ? (totals.shipping > 50 ? totals.shipping : 150) : 0;
    const inrDiscount = totals.discount > 500 ? totals.discount : totals.discount * 83;
    const inrTotal = inrSubtotal + inrShipping - inrDiscount;

    if (subtotalEl) subtotalEl.textContent = `₹${Math.round(inrSubtotal).toLocaleString('en-IN')}`;
    if (shippingEl) shippingEl.textContent = inrShipping > 0 ? `₹${inrShipping}` : 'FREE';

    if (discountRow) {
      if (inrDiscount > 0) {
        discountRow.style.display = 'flex';
        if (discountEl) discountEl.textContent = `-₹${Math.round(inrDiscount).toLocaleString('en-IN')}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (totalEl) totalEl.textContent = `₹${Math.round(inrTotal).toLocaleString('en-IN')}`;
    if (pointsText) pointsText.textContent = `⚡ Instant UPI Verification & 18% GST Receipt Guaranteed`;
  }

  bindFormEvents() {
    const form = document.getElementById('checkoutMasterForm');
    const cardExpress = document.getElementById('cardArmoredExpress');
    const cardStandard = document.getElementById('cardStandardGround');

    // Toggle Dispatch Speed Card Highlights
    const updateDispatchCards = (selected) => {
      if (selected === 'express') {
        cardExpress?.classList.add('active');
        cardStandard?.classList.remove('active');
        const checkE = cardExpress?.querySelector('.co-dispatch-check-icon');
        const checkS = cardStandard?.querySelector('.co-dispatch-check-icon');
        if (checkE) checkE.style.display = 'flex';
        if (checkS) checkS.style.display = 'none';
      } else {
        cardStandard?.classList.add('active');
        cardExpress?.classList.remove('active');
        const checkE = cardExpress?.querySelector('.co-dispatch-check-icon');
        const checkS = cardStandard?.querySelector('.co-dispatch-check-icon');
        if (checkE) checkE.style.display = 'none';
        if (checkS) checkS.style.display = 'flex';
      }
      this.renderSummary();
    };

    document.querySelectorAll('input[name="dispatchSpeed"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        updateDispatchCards(e.target.value);
      });
    });

    cardExpress?.addEventListener('click', () => {
      const radio = cardExpress.querySelector('input[type="radio"]');
      if (radio) { radio.checked = true; updateDispatchCards('express'); }
    });

    cardStandard?.addEventListener('click', () => {
      const radio = cardStandard.querySelector('input[type="radio"]');
      if (radio) { radio.checked = true; updateDispatchCards('standard'); }
    });

    // Handle Form Submit
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.processOrderPlacement('Credit Card / Vault Pay');
    });

    // PayPal Fallback Button Click
    const paypalFallback = document.getElementById('paypalExpressBtnFallback');
    paypalFallback?.addEventListener('click', async () => {
      await this.processOrderPlacement('PayPal Express');
    });
  }

  async processOrderPlacement(paymentMethod = 'PayPal') {
    const name = document.getElementById('custName')?.value || 'Vault Collector';
    const email = document.getElementById('custEmail')?.value || 'collector@pokevault.com';
    const street = document.getElementById('custStreet')?.value || '102 Pallet Town Way';
    const city = document.getElementById('custCity')?.value || 'Celadon City';
    const state = document.getElementById('custState')?.value || 'Kanto';
    const zip = document.getElementById('custZip')?.value || '90210';
    const totals = this.getCalculatedTotals();

    const orderPayload = {
      customerName: name,
      customerEmail: email,
      shippingAddress: `${street}, ${city}, ${state} ${zip}`,
      items: this.cart.map(i => ({ id: i.product?.id || i.id, name: i.product?.name || i.name, price: i.product?.price, qty: i.quantity })),
      promoCode: totals.promoCode || '',
      discountAmount: totals.discount,
      insuranceIncluded: totals.shipping > 0,
      insuranceCost: totals.shipping,
      paymentMethod
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();

      const orderId = data.orderId || `ORD-${Date.now()}`;
      clearCart();
      window.location.href = `order-confirmation.html?id=${orderId}`;
    } catch (err) {
      console.warn('Backend order placement offline, creating local order receipt:', err);
      const localId = `ORD-${Date.now()}`;
      localStorage.setItem(`pvOrder_${localId}`, JSON.stringify({ ...orderPayload, orderId: localId, totalAmount: totals.total, createdAt: new Date().toISOString() }));
      clearCart();
      window.location.href = `order-confirmation.html?id=${localId}`;
    }
  }

  initPayPalSDK() {
    const container = document.getElementById('paypalCheckoutContainer');
    if (!container || !window.paypal) return;

    try {
      window.paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },
        createOrder: async () => {
          const totals = this.getCalculatedTotals();
          try {
            const res = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: this.cart.map(i => ({ id: i.product?.id || i.id, qty: i.quantity })),
                discountAmount: totals.discount,
                insuranceIncluded: totals.shipping > 0,
                insuranceCost: totals.shipping
              })
            });
            const data = await res.json();
            return data.orderID || `DEMO-PAYPAL-${Date.now()}`;
          } catch (e) {
            return `DEMO-PAYPAL-${Date.now()}`;
          }
        },
        onApprove: async (data, actions) => {
          await this.processOrderPlacement('PayPal Express');
        }
      }).render('#paypalCheckoutContainer');
    } catch (err) {
      console.warn('PayPal button render warning:', err);
    }
  }
}

new CheckoutPage();
