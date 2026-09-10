/**
 * POKÉVAULT LEGENDS — Order Confirmation Controller
 * Reads ?id= from URL and renders order receipt details.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';

import confettiModule from 'canvas-confetti';
const confetti = confettiModule?.default || confettiModule || ((typeof window !== 'undefined' && window.confetti) ? window.confetti : () => {});

class OrderConfirmationPage {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.orderId = params.get('id') || `ORD-${Date.now()}`;

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
    const shippingEl = document.getElementById('receiptShipping');
    const totalEl = document.getElementById('receiptTotal');

    if (receiptIdEl) receiptIdEl.textContent = this.orderId;

    let orderData = null;
    try {
      const res = await fetch(`/api/orders/${this.orderId}`);
      const data = await res.json();
      if (data.success && data.data) orderData = data.data;
    } catch (e) {
      console.warn('API fetch offline, checking local order store:', e);
    }

    if (!orderData) {
      const stored = localStorage.getItem(`pvOrder_${this.orderId}`);
      if (stored) orderData = JSON.parse(stored);
    }

    if (!orderData) {
      orderData = {
        customerName: 'Vault Trainer',
        customerEmail: 'trainer@pokevault.com',
        shippingAddress: '102 Pallet Town Way, Kanto 90210',
        trackingNumber: `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
        subtotal: 149.99,
        insuranceCost: 9.99,
        totalAmount: 159.98,
        items: [
          { card_name: 'Master Vault XL Mystery Chest', quantity: 1, unit_price: 149.99 }
        ]
      };
    }

    if (nameEl) nameEl.textContent = orderData.customerName || orderData.customer_name || 'Vault Trainer';
    if (emailEl) emailEl.textContent = orderData.customerEmail || orderData.customer_email || 'trainer@pokevault.com';
    if (addrEl) addrEl.textContent = orderData.shippingAddress || orderData.shipping_address || '102 Pallet Town Way, Kanto';
    if (trkEl) trkEl.textContent = `Tracking Number: ${orderData.trackingNumber || orderData.tracking_number || 'TRK-90123847'}`;

    const items = orderData.items || orderData.order_items || [];
    if (listEl) {
      listEl.innerHTML = items.map(item => `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #EEE; font-family:var(--font-mono); font-size:0.85rem;">
          <div>
            <strong style="color:#000;">${item.card_name || item.name || 'Pokémon Collector Product'}</strong>
            <div style="font-size:0.75rem; color:#666;">Quantity: ${item.quantity || 1} × $${Number(item.unit_price || item.price || 0).toFixed(2)}</div>
          </div>
          <div style="font-weight:900; color:var(--accent-red);">$${(Number(item.unit_price || item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</div>
        </div>
      `).join('');
    }

    const sub = Number(orderData.subtotal || 149.99);
    const ship = Number(orderData.insuranceCost || orderData.insurance_cost || 9.99);
    const tot = Number(orderData.totalAmount || orderData.total_amount || (sub + ship));

    if (subtotalEl) subtotalEl.textContent = `$${sub.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = `$${ship.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${tot.toFixed(2)}`;
  }
}

new OrderConfirmationPage();
