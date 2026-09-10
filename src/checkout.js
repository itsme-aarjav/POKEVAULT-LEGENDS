/**
 * POKÉVAULT LEGENDS — Standalone Checkout Controller
 * Manages Trainer's Vault Checkout, order summary, shipping form, dispatch speed selection,
 * promo voucher system, PayPal SDK integration, and Order creation API.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { getCart, getCartSubtotal, getPromoState, applyPromoCode, removePromoCode, clearCart } from './utils/store.js';

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
    this.bindPromoEvents();

    window.addEventListener('pv-promo-updated', () => this.renderSummary());
    window.addEventListener('pv-cart-updated', () => {
      this.cart = getCart();
      this.renderSummary();
    });
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar('cart');
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  getCalculatedTotals() {
    const subtotal = getCartSubtotal(); // in USD
    const promo = getPromoState();
    const dispatchSpeedEl = document.querySelector('input[name="dispatchSpeed"]:checked');
    const isExpress = dispatchSpeedEl ? dispatchSpeedEl.value === 'express' : true;

    let shipping = 0;
    let inrShipping = 0;
    if (isExpress && !promo.freeShipping) {
      shipping = 9.99;
      inrShipping = 150;
    }

    let discount = 0;
    let inrDiscount = 0;
    const inrSubtotal = Math.round(subtotal * 83);

    if (promo.type === 'fixed' && promo.fixedINR) {
      inrDiscount = Math.min(inrSubtotal, promo.fixedINR);
      discount = inrDiscount / 83;
    } else if (promo.discountPercent > 0) {
      inrDiscount = Math.round((inrSubtotal * promo.discountPercent) / 100);
      discount = (subtotal * promo.discountPercent) / 100;
    }

    const inrTotal = Math.max(0, inrSubtotal - inrDiscount + inrShipping);
    const total = Math.max(0.01, subtotal - discount + shipping);
    const vaultPoints = Math.floor(inrTotal / 10);

    return { 
      subtotal, 
      discount, 
      shipping, 
      total, 
      inrSubtotal, 
      inrDiscount, 
      inrShipping, 
      inrTotal, 
      vaultPoints, 
      promoCode: promo.code || '', 
      promo 
    };
  }

  renderSummary() {
    const itemsList = document.getElementById('checkoutItemsList');
    const subtotalEl = document.getElementById('coSubtotal');
    const discountRow = document.getElementById('coDiscountRow');
    const discountLabel = document.getElementById('coDiscountLabel');
    const discountEl = document.getElementById('coDiscount');
    const shippingEl = document.getElementById('coShipping');
    const totalEl = document.getElementById('coTotal');
    const pointsText = document.getElementById('coPointsText');

    if (!itemsList) return;

    itemsList.innerHTML = this.cart.map(item => {
      const p = item.product;
      if (!p) return '';
      const unitPriceINR = Math.round(p.price * 83);
      const itemTotalINR = unitPriceINR * item.quantity;
      return `
        <div class="co-item-row" style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #E2E8F0;">
          <div class="co-item-thumb-box" style="width:52px; height:52px; border:1.5px solid #000; border-radius:6px; background:#FFF; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <img src="${p.image}" alt="${p.name}" class="co-item-img" style="max-width:100%; max-height:100%; object-fit:contain;" />
          </div>
          <div class="co-item-details" style="flex:1; min-width:0;">
            <div class="co-item-name" style="font-family:var(--font-title); font-size:0.85rem; font-weight:900; color:#000; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${item.quantity} × ${p.name}
            </div>
            <div style="font-family:var(--font-mono); font-size:0.75rem; color:#64748B;">
              ₹${unitPriceINR.toLocaleString('en-IN')} each
            </div>
          </div>
          <div class="co-item-price" style="font-family:var(--font-mono); font-weight:900; font-size:0.9rem; color:var(--accent-red); text-align:right;">
            ₹${itemTotalINR.toLocaleString('en-IN')}
          </div>
        </div>
      `;
    }).join('');

    const totals = this.getCalculatedTotals();

    if (subtotalEl) subtotalEl.textContent = `₹${totals.inrSubtotal.toLocaleString('en-IN')}`;
    if (shippingEl) shippingEl.textContent = totals.inrShipping > 0 ? `₹${totals.inrShipping}` : 'FREE';

    if (discountRow) {
      if (totals.inrDiscount > 0) {
        discountRow.style.display = 'flex';
        if (discountLabel) discountLabel.textContent = `Discount (${totals.promoCode}):`;
        if (discountEl) discountEl.textContent = `-₹${totals.inrDiscount.toLocaleString('en-IN')}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (totalEl) totalEl.textContent = `₹${totals.inrTotal.toLocaleString('en-IN')}`;
    if (pointsText) pointsText.textContent = `⚡ Earn ${totals.vaultPoints.toLocaleString('en-IN')} PokéCoins & 18% GST Receipt Guaranteed`;

    // Render Promo Box State
    const activeBadge = document.getElementById('coActivePromoBadge');
    const inputRow = document.getElementById('coPromoInputRow');
    const appliedRow = document.getElementById('coAppliedPromoRow');
    const appliedText = document.getElementById('coAppliedPromoText');
    const promoInput = document.getElementById('coPromoInput');

    if (totals.promo && totals.promo.code) {
      if (activeBadge) {
        activeBadge.textContent = totals.promo.code;
        activeBadge.style.display = 'inline-block';
      }
      if (inputRow) inputRow.style.display = 'none';
      if (appliedRow) {
        appliedRow.style.display = 'flex';
        if (appliedText) {
          appliedText.innerHTML = `✓ <strong>${totals.promo.code}</strong> — ${totals.promo.description || 'Discount Applied'}`;
        }
      }
    } else {
      if (activeBadge) activeBadge.style.display = 'none';
      if (inputRow) inputRow.style.display = 'flex';
      if (appliedRow) appliedRow.style.display = 'none';
      if (promoInput) promoInput.value = '';
    }
  }

  bindPromoEvents() {
    const applyBtn = document.getElementById('coApplyPromoBtn');
    const removeBtn = document.getElementById('coRemovePromoBtn');
    const promoInput = document.getElementById('coPromoInput');
    const promoStatus = document.getElementById('coPromoStatus');

    const handleApply = () => {
      const code = promoInput?.value;
      if (!code || !code.trim()) {
        if (promoStatus) {
          promoStatus.textContent = 'Please enter a coupon code.';
          promoStatus.style.color = 'var(--accent-red)';
        }
        return;
      }
      const res = applyPromoCode(code);
      if (promoStatus) {
        promoStatus.textContent = res.message;
        promoStatus.style.color = res.success ? '#166534' : 'var(--accent-red)';
      }
      this.renderSummary();
    };

    applyBtn?.addEventListener('click', handleApply);
    promoInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleApply();
      }
    });

    removeBtn?.addEventListener('click', () => {
      const res = removePromoCode();
      if (promoStatus) {
        promoStatus.textContent = res.message;
        promoStatus.style.color = '#64748B';
      }
      this.renderSummary();
    });
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
      items: this.cart.map(i => ({ 
        id: i.product?.id || i.id, 
        name: i.product?.name || i.name, 
        price: i.product?.price, 
        inrPrice: Math.round((i.product?.price || 0) * 83),
        qty: i.quantity 
      })),
      promoCode: totals.promoCode || '',
      discountAmount: totals.discount,
      discountINR: totals.inrDiscount,
      subtotalAmount: totals.subtotal,
      subtotalINR: totals.inrSubtotal,
      shippingCost: totals.shipping,
      shippingINR: totals.inrShipping,
      totalAmount: totals.total,
      totalINR: totals.inrTotal,
      insuranceIncluded: totals.inrShipping > 0,
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
      localStorage.setItem(`pvOrder_${localId}`, JSON.stringify({ ...orderPayload, orderId: localId, createdAt: new Date().toISOString() }));
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
