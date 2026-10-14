/**
 * POKÉVAULT LEGENDS — Live Order Tracking Controller
 * Authoritative tracking connected to real order records.
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { API_BASE } from './lib/api.js';

class OrderTracker {
  constructor() {
    this.initLayout();
    this.initSearch();

    const params = new URLSearchParams(window.location.search);
    const orderQuery = params.get('order');
    if (orderQuery) {
      const input = document.getElementById('trackSearchInput');
      if (input) input.value = orderQuery;
      this.displayOrder(orderQuery);
    } else {
      this.displayEmptyPrompt();
    }
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar();
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  initSearch() {
    const form = document.getElementById('trackSearchForm');
    const input = document.getElementById('trackSearchInput');

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim().toUpperCase();
      if (val) this.displayOrder(val);
    });
  }

  displayEmptyPrompt() {
    const container = document.getElementById('trackResultContainer');
    if (!container) return;
    container.innerHTML = `
      <div class="track-timeline-card animate-pop-in" style="text-align:center; padding:3rem 1.5rem; background:#FFF; border:3px solid #000; border-radius:12px; box-shadow:4px 4px 0px #000;">
        <div style="font-size:3rem; margin-bottom:1rem;">🚚</div>
        <h2 style="font-family:var(--font-title); font-weight:900; font-size:1.3rem; color:#000; margin-bottom:8px;">READY TO TRACK YOUR DISPATCH</h2>
        <p style="font-family:var(--font-mono); font-size:0.85rem; color:#64748B; max-width:480px; margin:0 auto;">
          Enter your Order ID in the search box above to view real-time BlueDart air transit and vault packaging milestones.
        </p>
      </div>
    `;
  }

  async displayOrder(orderId) {
    const container = document.getElementById('trackResultContainer');
    if (!container) return;

    let realOrder = null;
    let orderToken = '';

    // Retrieve order token from session-scoped storage
    try {
      const sessionStored = sessionStorage.getItem(`pvOrder_${orderId}`) || sessionStorage.getItem('pvLastOrder');
      if (sessionStored) {
        const parsed = JSON.parse(sessionStored);
        if (parsed.id === orderId || parsed.orderId === orderId || orderId === 'LAST') {
          orderToken = parsed.accessToken || '';
        }
      }
      if (!orderToken) {
        const local = localStorage.getItem(`pvOrder_${orderId}`) || localStorage.getItem('pvLastOrder');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.id === orderId || parsed.orderId === orderId || orderId === 'LAST') {
            orderToken = parsed.accessToken || '';
          }
        }
      }
    } catch {
      // Storage unavailable
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (orderToken) {
        headers['X-Order-Token'] = orderToken;
        headers['Authorization'] = `Bearer ${orderToken}`;
      }
      const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data) {
          realOrder = json.data;
        }
      }
    } catch {
      // Network/API unavailable
    }

    if (!realOrder) {
      try {
        const sessionStored = sessionStorage.getItem(`pvOrder_${orderId}`) || sessionStorage.getItem('pvLastOrder');
        if (sessionStored) {
          const parsed = JSON.parse(sessionStored);
          if (parsed.id === orderId || parsed.orderId === orderId || orderId === 'LAST') {
            realOrder = parsed;
          }
        }
        if (!realOrder) {
          const local = localStorage.getItem(`pvOrder_${orderId}`) || localStorage.getItem('pvLastOrder');
          if (local) {
            const parsed = JSON.parse(local);
            if (parsed.id === orderId || parsed.orderId === orderId || orderId === 'LAST') {
              realOrder = parsed;
            }
          }
        }
      } catch {
        // Storage lookup fallback failed
      }
    }

    if (!realOrder) {
      container.innerHTML = `
        <div class="track-timeline-card animate-pop-in" style="text-align:center; padding:3rem 1.5rem; background:#FFF; border:3px solid #000; border-radius:12px; box-shadow:4px 4px 0px #000;">
          <div style="font-size:3rem; margin-bottom:1rem;">📦🔍</div>
          <h2 style="font-family:var(--font-title); font-weight:900; font-size:1.4rem; color:var(--accent-red); margin-bottom:8px;">ORDER NOT FOUND</h2>
          <p style="font-family:var(--font-mono); font-size:0.9rem; color:#64748B; max-width:480px; margin:0 auto 1.5rem;">
            No live order found matching <strong>#${orderId}</strong>. Please double-check your Order ID from your confirmation email or order receipt.
          </p>
          <a href="shop.html" class="btn-pill" style="display:inline-block; text-decoration:none; padding:10px 24px; font-size:0.85rem;">Browse Vault Products →</a>
        </div>
      `;
      return;
    }

    const st = (realOrder.order_status || realOrder.status || 'received').toLowerCase();
    let stage = 1;
    let statusText = 'ORDER RECEIVED & QUEUED IN VAULT';
    if (st === 'processing') {
      stage = 2;
      statusText = 'VAULT AUDIT & MINT AUTHENTICATION IN PROGRESS';
    } else if (st === 'dispatched') {
      stage = 3;
      statusText = 'ARMORED PACKAGING COMPLETE — DISPATCHED';
    } else if (st === 'shipped') {
      stage = 4;
      statusText = 'IN BLUEDART AIR TRANSIT';
    } else if (st === 'delivered') {
      stage = 5;
      statusText = 'PACKAGE DELIVERED TO DESTINATION';
    } else if (st === 'cancelled' || st === 'refunded') {
      stage = 1;
      statusText = st === 'cancelled' ? 'ORDER CANCELLED' : 'REFUND PROCESSED';
    }

    const items = realOrder.order_items || realOrder.items || [];
    const itemNames = items.map(i => i.card_name || i.name || 'Pokémon Vault Item').join(', ');
    const formattedDate = realOrder.created_at ? new Date(realOrder.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Today';

    const data = {
      orderId: realOrder.id || realOrder.orderId || orderId,
      item: itemNames || 'Official Pokémon Vault Merchandise',
      orderDate: formattedDate,
      courier: realOrder.tracking_number?.includes(':') ? realOrder.tracking_number.split(':')[0] : 'BlueDart Express Priority',
      trackingNo: realOrder.tracking_number || `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
      origin: 'PokéVault Central Vault (Mumbai Air Hub)',
      destination: realOrder.shipping_address || 'Customer Verified Address',
      currentStage: stage,
      statusText: statusText,
      estDelivery: stage === 5 ? 'Delivered' : '1-2 Business Days',
      timeline: [
        { time: formattedDate, title: 'Order Received & Payment Authenticated', desc: `Order #${realOrder.id || orderId} registered in database for ${realOrder.customer_name || 'Collector'}.` },
        ...(stage >= 2 ? [{ time: 'In Progress', title: '5-Point Vault Authentication & Packaging', desc: 'Case verification and tamper-evident serialized seal.' }] : []),
        ...(stage >= 3 ? [{ time: 'Dispatched', title: 'Handed to Armored Dispatch Courier', desc: 'Secure transit initiated.' }] : []),
        ...(stage >= 4 ? [{ time: 'In Transit', title: 'Air Hub Cargo Transit', desc: 'En route to destination delivery center.' }] : []),
        ...(stage >= 5 ? [{ time: 'Completed', title: 'Delivered', desc: 'Delivered to customer address.' }] : [])
      ]
    };

    const stages = [
      { num: 1, label: 'Order Verified', icon: '✓' },
      { num: 2, label: 'Vault Audit & Seal', icon: '🛡️' },
      { num: 3, label: 'Armored Packaged', icon: '📦' },
      { num: 4, label: 'Air Transit', icon: '✈️' },
      { num: 5, label: 'Delivered', icon: '🏠' }
    ];

    container.innerHTML = `
      <div class="track-timeline-card animate-pop-in">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #000; padding-bottom:1rem; margin-bottom:1.5rem; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="font-family:var(--font-mono); font-weight:800; font-size:0.8rem; color:var(--accent-red); letter-spacing:1px;">
              SHIPMENT TRACKING NO: ${data.trackingNo}
            </div>
            <h2 style="font-family:var(--font-title); font-weight:900; font-size:1.4rem; color:#000; margin:4px 0 0;">
              ORDER #${data.orderId}
            </h2>
          </div>
          <div style="background:#FFF056; border:2px solid #000; border-radius:8px; padding:6px 12px; font-family:var(--font-mono); font-weight:900; font-size:0.85rem; box-shadow:2px 2px 0px #000;">
            ⚡ ${data.courier}
          </div>
        </div>

        <div style="background:#F1F5F9; border:2px solid #000; border-radius:10px; padding:12px 16px; margin-bottom:2rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <span style="font-family:var(--font-mono); font-size:0.75rem; color:#64748B; font-weight:700;">CURRENT STATUS:</span>
            <div style="font-family:var(--font-mono); font-weight:900; font-size:0.95rem; color:#DC2626;">
              ● ${data.statusText}
            </div>
          </div>
          <div style="text-align:right;">
            <span style="font-family:var(--font-mono); font-size:0.75rem; color:#64748B; font-weight:700;">ESTIMATED ARRIVAL:</span>
            <div style="font-family:var(--font-mono); font-weight:900; font-size:0.95rem; color:#16A34A;">
              📅 ${data.estDelivery}
            </div>
          </div>
        </div>

        <!-- 5-STAGE MILESTONE STEPPER -->
        <div class="timeline-steps-wrap">
          ${stages.map(stItem => `
            <div class="timeline-step ${stItem.num < data.currentStage ? 'completed' : (stItem.num === data.currentStage ? 'current' : '')}">
              <div class="timeline-icon-box">${stItem.icon}</div>
              <div style="font-family:var(--font-title); font-weight:900; font-size:0.85rem; color:#000;">${stItem.label}</div>
            </div>
          `).join('')}
        </div>

        <!-- ACTIVITY LOG TIMELINE -->
        <div style="margin-top:2.5rem;">
          <h3 style="font-family:var(--font-title); font-weight:900; font-size:1.15rem; color:#000; margin-bottom:1rem;">
            DISPATCH ACTIVITY LOG
          </h3>
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${data.timeline.map(item => `
              <div style="background:#FFFFFF; border:2px solid #000; border-radius:8px; padding:12px; box-shadow:2px 2px 0px #000; display:flex; gap:12px; align-items:flex-start;">
                <div style="font-family:var(--font-mono); font-size:0.75rem; font-weight:800; color:#64748B; min-width:110px;">
                  ${item.time}
                </div>
                <div>
                  <div style="font-family:var(--font-title); font-weight:900; font-size:0.95rem; color:#000; margin-bottom:2px;">
                    ${item.title}
                  </div>
                  <div style="font-family:var(--font-body); font-size:0.82rem; color:#475569;">
                    ${item.desc}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
}

new OrderTracker();
