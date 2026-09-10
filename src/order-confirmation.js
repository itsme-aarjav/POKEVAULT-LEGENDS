/**
 * POKÉVAULT LEGENDS — Order Confirmation Controller
 * Reads ?id= from URL and renders live customer order receipt details.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';

import confettiModule from 'canvas-confetti';
const confetti = confettiModule?.default || confettiModule || ((typeof window !== 'undefined' && window.confetti) ? window.confetti : () => {});

class OrderConfirmationPage {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.orderId = params.get('id') || '';

    this.initLayout();
    this.loadOrderReceipt();

    // Trigger celebratory confetti burst
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 } });
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar('home');
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  async loadOrderReceipt() {
    const receiptIdEl = document.getElementById('receiptOrderId');
    const nameEl = document.getElementById('receiptCustName');
    const emailEl = document.getElementById('receiptCustEmail');
    const addrEl = document.getElementById('receiptAddress');
    const trkEl = document.getElementById('receiptTracking');
    const listEl = document.getElementById('receiptItemsList');
    const subtotalEl = document.getElementById('receiptSubtotal');
    const discountRow = document.getElementById('receiptDiscountRow');
    const discountLabel = document.getElementById('receiptDiscountLabel');
    const discountEl = document.getElementById('receiptDiscount');
    const shippingEl = document.getElementById('receiptShipping');
    const totalEl = document.getElementById('receiptTotal');

    let orderData = null;

    // 1. Try to fetch from Backend API
    if (this.orderId) {
      try {
        const res = await fetch(`/api/orders/${this.orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.data) {
            orderData = data.data;
          }
        }
      } catch (e) {
        console.warn('API fetch error, falling back to local cached receipt:', e);
      }
    }

    // 2. Fallback to LocalStorage cache
    if (!orderData && this.orderId) {
      try {
        const stored = localStorage.getItem(`pvOrder_${this.orderId}`);
        if (stored) orderData = JSON.parse(stored);
      } catch (e) {
        console.warn('LocalStorage read error:', e);
      }
    }

    // 3. Fallback to last placed order
    if (!orderData) {
      try {
        const lastOrder = localStorage.getItem('pvLastOrder');
        if (lastOrder) {
          orderData = JSON.parse(lastOrder);
          if (orderData.id || orderData.orderId) {
            this.orderId = orderData.id || orderData.orderId;
          }
        }
      } catch (e) {
        console.warn('Last order read error:', e);
      }
    }

    // If still no order found, create a blank placeholder structure
    if (!orderData) {
      orderData = {
        id: this.orderId || `ORD-${Date.now()}`,
        customer_name: 'Vault Collector',
        customer_email: 'collector@pokevault.com',
        shipping_address: '123 Pallet Town Way, Kanto',
        tracking_number: `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
        subtotal: 0,
        discount_amount: 0,
        insurance_cost: 0,
        total_amount: 0,
        order_items: []
      };
    }

    const finalOrderId = orderData.id || orderData.order_id || orderData.orderId || this.orderId || `ORD-${Date.now()}`;
    const custName = orderData.customer_name || orderData.customerName || 'Vault Collector';
    const custEmail = orderData.customer_email || orderData.customerEmail || 'collector@pokevault.com';
    const shippingAddr = orderData.shipping_address || orderData.shippingAddress || '123 Pallet Town Way, Kanto';
    const trackingNo = orderData.tracking_number || orderData.trackingNumber || `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const promoCode = orderData.promo_code || orderData.promoCode || '';
    const trackBtnEl = document.getElementById('receiptTrackBtn');

    if (receiptIdEl) receiptIdEl.textContent = finalOrderId;
    if (nameEl) nameEl.textContent = custName;
    if (emailEl) emailEl.textContent = custEmail;
    if (addrEl) addrEl.textContent = shippingAddr;
    if (trkEl) trkEl.textContent = `Tracking: ${trackingNo}`;
    if (trackBtnEl) trackBtnEl.href = `track.html?order=${finalOrderId}`;

    // Render Line Items
    const items = orderData.order_items || orderData.items || [];
    if (listEl) {
      if (items.length === 0) {
        listEl.innerHTML = `
          <div style="padding: 10px 0; font-family: var(--font-mono); font-size: 0.85rem; color: #64748B;">
            Vault Collectible Order Items Registered
          </div>
        `;
      } else {
        listEl.innerHTML = items.map(item => {
          const qty = Number(item.quantity || item.qty || 1);
          let rawPrice = Number(item.unit_price || item.price || 0);
          let inrUnitPrice = Number(item.inrPrice || (rawPrice > 500 ? rawPrice : rawPrice * 83));
          if (inrUnitPrice <= 0) inrUnitPrice = 2490;
          const lineTotalINR = inrUnitPrice * qty;

          return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px dashed #E2E8F0; font-family:var(--font-mono); font-size:0.85rem;">
              <div>
                <strong style="color:#000;">${item.card_name || item.name || item.title || 'Pokémon Collectible'}</strong>
                <div style="font-size:0.75rem; color:#64748B;">Quantity: ${qty} × ₹${Math.round(inrUnitPrice).toLocaleString('en-IN')}</div>
              </div>
              <div style="font-weight:900; color:var(--accent-red); font-size:0.95rem;">
                ₹${Math.round(lineTotalINR).toLocaleString('en-IN')}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Calculate Financials in INR
    let rawSubtotal = Number(orderData.subtotal || orderData.subtotalAmount || 0);
    let inrSubtotal = Number(orderData.subtotalINR || (rawSubtotal > 500 ? rawSubtotal : rawSubtotal * 83));
    
    // If subtotal is 0 but items exist, compute from items
    if (inrSubtotal <= 0 && items.length > 0) {
      inrSubtotal = items.reduce((sum, it) => {
        const q = Number(it.quantity || it.qty || 1);
        const p = Number(it.inrPrice || (it.price ? (it.price > 500 ? it.price : it.price * 83) : (it.unit_price ? it.unit_price * 83 : 0)));
        return sum + (p * q);
      }, 0);
    }

    let rawDiscount = Number(orderData.discount_amount || orderData.discountAmount || 0);
    let inrDiscount = Number(orderData.discountINR || (rawDiscount > 500 ? rawDiscount : rawDiscount * 83));

    // Handle 100% discount or full promo waiver
    if (promoCode && (inrDiscount <= 0 && rawDiscount <= 0)) {
      if (promoCode.includes('100') || promoCode.includes('FREE')) {
        inrDiscount = inrSubtotal;
      }
    }

    let rawShipping = Number(orderData.insurance_cost || orderData.shippingCost || (orderData.insurance_included ? 9.99 : 0));
    let inrShipping = Number(orderData.shippingINR !== undefined ? orderData.shippingINR : (rawShipping > 500 ? rawShipping : rawShipping * 83));

    // If 100% discount, waive shipping
    if (inrDiscount >= inrSubtotal && inrSubtotal > 0) {
      inrShipping = 0;
    }

    let rawTotal = Number(orderData.total_amount || orderData.totalAmount || 0);
    let inrTotal = Number(orderData.totalINR !== undefined ? orderData.totalINR : (rawTotal > 500 ? rawTotal : rawTotal * 83));
    
    if (inrDiscount >= inrSubtotal && inrSubtotal > 0) {
      inrTotal = 0;
    } else if (orderData.total_amount !== undefined && Number(orderData.total_amount) === 0) {
      inrTotal = 0;
    }

    if (subtotalEl) subtotalEl.textContent = `₹${Math.round(inrSubtotal).toLocaleString('en-IN')}`;

    if (discountRow) {
      if (inrDiscount > 0 || promoCode) {
        discountRow.style.display = 'flex';
        if (discountLabel) discountLabel.textContent = `Promo Discount (${promoCode || 'Applied'}):`;
        if (discountEl) discountEl.textContent = `-₹${Math.round(inrDiscount).toLocaleString('en-IN')}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (shippingEl) {
      shippingEl.textContent = inrShipping > 0 ? `₹${Math.round(inrShipping)}` : 'FREE (₹0)';
    }

    if (totalEl) {
      if (inrTotal === 0) {
        totalEl.innerHTML = `<span style="color:#166534;">₹0 (100% OFF FREE)</span>`;
      } else {
        totalEl.textContent = `₹${Math.round(inrTotal).toLocaleString('en-IN')}`;
      }
    }
  }
}

new OrderConfirmationPage();
