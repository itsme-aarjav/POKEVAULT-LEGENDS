/**
 * POKÉVAULT LEGENDS — Live Order Tracking Controller
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';

const SAMPLE_ORDERS = {
  "PVL-10248": {
    orderId: "PVL-10248",
    item: "1st Edition Shadowless Charizard PSA 10 + Loungefly Mini Backpack",
    orderDate: "2026-08-23 14:32",
    courier: "BlueDart Express Priority Air",
    trackingNo: "BD-8839201948IN",
    origin: "PokéVault Central Vault (Mumbai Air Hub)",
    destination: "Bengaluru, Karnataka",
    currentStage: 3, // 1 to 5
    statusText: "IN BLUE DART AIR TRANSIT — MUMBAI TO BENGALURU",
    estDelivery: "Tomorrow by 2:00 PM",
    timeline: [
      { time: "2026-08-23 14:32", title: "Order Confirmed & Payment Verified", desc: "Payment authenticated via 256-bit encrypted gateway." },
      { time: "2026-08-23 16:15", title: "5-Point Vault Inspection & Hologram Serialized", desc: "PSA 10 case verified under UV spectrum. Tamper-evident seal #PV-9938 applied." },
      { time: "2026-08-23 18:40", title: "Armored Foam Insert Packaging Complete", desc: "Dispatched from Mumbai Central Vault in custom heavy-duty armored flight box." },
      { time: "2026-08-24 06:10", title: "Sorted at BlueDart Air Hub (Flight BD-402)", desc: "Departed Mumbai Cargo Terminal to Bengaluru Airport Hub." }
    ]
  },
  "PVL-88392": {
    orderId: "PVL-88392",
    item: "Charizard 1996 Volcanic Battle Canvas Art + Pokédex Journal",
    orderDate: "2026-08-22 10:15",
    courier: "BlueDart Priority Courier",
    trackingNo: "BD-9481920381IN",
    origin: "PokéVault Central Vault (Mumbai Hub)",
    destination: "New Delhi, NCR",
    currentStage: 4,
    statusText: "OUT FOR DELIVERY — COURIER ON VAN ROUTE",
    estDelivery: "Today by 6:00 PM",
    timeline: [
      { time: "2026-08-22 10:15", title: "Order Verified", desc: "Order details received." },
      { time: "2026-08-22 13:00", title: "Vault Inspection Passed", desc: "Passed 100% mint inspection audit." },
      { time: "2026-08-22 17:30", title: "Armored Dispatch Handover", desc: "Handed to BlueDart Express team." },
      { time: "2026-08-23 11:20", title: "Arrived at Delhi Hub", desc: "Processed at Okhla Sorting Facility." },
      { time: "2026-08-24 09:30", title: "Out for Courier Delivery", desc: "Assigned to courier agent Rajesh K. (Vehicle #DL-04-A-9812)." }
    ]
  }
};

class OrderTracker {
  constructor() {
    this.initLayout();
    this.initSearch();

    const params = new URLSearchParams(window.location.search);
    const orderQuery = params.get('order') || 'PVL-10248';
    this.displayOrder(orderQuery);
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

    document.querySelectorAll('.sample-track-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const order = btn.getAttribute('data-order');
        if (input) input.value = order;
        this.displayOrder(order);
      });
    });
  }

  displayOrder(orderId) {
    const container = document.getElementById('trackResultContainer');
    if (!container) return;

    const data = SAMPLE_ORDERS[orderId] || {
      orderId: orderId,
      item: "Official Pokémon Vault Merchandise Order",
      orderDate: new Date().toISOString().split('T')[0],
      courier: "BlueDart Express Priority",
      trackingNo: `BD-${Math.floor(1000000000 + Math.random() * 9000000000)}IN`,
      origin: "PokéVault Central Vault (Mumbai Air Hub)",
      destination: "Your Delivery Address",
      currentStage: 2,
      statusText: "ARMORED VAULT PACKAGING IN PROGRESS",
      estDelivery: "In 2 Business Days",
      timeline: [
        { time: "Today", title: "Order Verified & Payment Authenticated", desc: "Vault curator team assigned." },
        { time: "Today", title: "5-Point Vault Inspection & Hologram Serialized", desc: "Undergoing UV foil and casing inspection." }
      ]
    };

    const stages = [
      { num: 1, label: "Order Verified", icon: "✓" },
      { num: 2, label: "Vault Audit & Seal", icon: "🛡️" },
      { num: 3, label: "Armored Packaged", icon: "📦" },
      { num: 4, label: "Air Transit", icon: "✈️" },
      { num: 5, label: "Delivered", icon: "🏠" }
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
          ${stages.map(st => `
            <div class="timeline-step ${st.num < data.currentStage ? 'completed' : (st.num === data.currentStage ? 'current' : '')}">
              <div class="timeline-icon-box">${st.icon}</div>
              <div style="font-family:var(--font-title); font-weight:900; font-size:0.85rem; color:#000;">${st.label}</div>
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
