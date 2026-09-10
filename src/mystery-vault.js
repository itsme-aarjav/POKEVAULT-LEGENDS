/**
 * POKÉVAULT LEGENDS — Virtual Mystery Chest Unboxing Simulator Controller
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { getAllProducts } from './data/products.js';
import { addToCart } from './utils/store.js';

import confettiModule from 'canvas-confetti';
const confetti = confettiModule?.default || confettiModule || ((typeof window !== 'undefined' && window.confetti) ? window.confetti : () => {});

class MysterySimulator {
  constructor() {
    this.allProducts = getAllProducts();
    this.initLayout();
    this.initEvents();
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar();
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  initEvents() {
    document.querySelectorAll('.select-chest-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tier = btn.getAttribute('data-tier');
        this.runSimulation(tier);
      });
    });
  }

  runSimulation(tier) {
    const stage = document.getElementById('unboxingStage');
    const initial = document.getElementById('unboxingInitialState');
    const active = document.getElementById('unboxingActiveState');
    if (!stage || !active) return;

    if (initial) initial.style.display = 'none';
    active.style.display = 'block';

    // Show Rolling Animation
    active.innerHTML = `
      <div style="font-size:3rem; animation: liveTickerPulse 0.5s infinite;">🎰</div>
      <h2 style="font-family:var(--font-title); font-weight:900; font-size:1.8rem; color:#FFF056; margin:10px 0;">
        UNSEALING VAULT CHEST...
      </h2>
      <div style="font-family:var(--font-mono); font-size:0.9rem; color:#CBD5E1;">
        Decryption algorithms verifying randomized loot table drop...
      </div>
    `;

    setTimeout(() => {
      // Pick simulated drops from catalog based on tier
      let pool = this.allProducts;
      if (tier === 'master') {
        pool = this.allProducts.filter(p => p.category === 'trading-cards' || p.price > 70);
      } else if (tier === 'legendary') {
        pool = this.allProducts.filter(p => p.price > 30);
      }

      const wonItem = pool[Math.floor(Math.random() * pool.length)] || this.allProducts[0];
      const wonPriceINR = Math.round(wonItem.price > 500 ? wonItem.price : wonItem.price * 83);

      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });

      active.innerHTML = `
        <div class="animate-pop-in" style="max-width:550px; margin:0 auto; background:#1E293B; border:3px solid #FFF056; border-radius:16px; padding:2rem; box-shadow:0 8px 30px rgba(255, 240, 86, 0.3);">
          <div style="background:#FFF056; color:#000; font-family:var(--font-mono); font-weight:900; font-size:0.8rem; padding:3px 10px; border-radius:12px; display:inline-block; margin-bottom:12px;">
            🎉 UNBOXING SUCCESSFUL!
          </div>
          <h2 style="font-family:var(--font-title); font-weight:900; font-size:1.5rem; color:#FFF; margin:0 0 1rem;">
            YOU PULLED: ${wonItem.name}
          </h2>

          <div style="background:#0F172A; border:2px solid #334155; border-radius:12px; padding:1rem; margin-bottom:1.5rem;">
            <img src="${wonItem.image}" style="width:160px; height:160px; object-fit:contain; margin:0 auto 10px; display:block;" alt="${wonItem.name}" />
            <div style="font-family:var(--font-mono); font-size:0.85rem; color:#94A3B8;">${wonItem.categoryName}</div>
            <div style="font-family:var(--font-mono); font-weight:900; font-size:1.3rem; color:#22C55E;">Est. Retail Value: ₹${wonPriceINR.toLocaleString('en-IN')}</div>
          </div>

          <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
            <button class="btn-pill" id="orderMysteryBtn" style="padding:12px 24px; font-size:0.95rem;">
              🛒 ORDER THIS MYSTERY CHEST (₹${tier === 'master' ? '14,999' : (tier === 'legendary' ? '7,999' : '2,499')})
            </button>
            <button class="btn-inspect" id="rerollBtn" style="background:#334155; color:#FFF; border-color:#64748B; padding:12px 20px; font-size:0.95rem;">
              🎲 ROLL AGAIN
            </button>
          </div>
        </div>
      `;

      document.getElementById('rerollBtn')?.addEventListener('click', () => this.runSimulation(tier));
      document.getElementById('orderMysteryBtn')?.addEventListener('click', () => {
        addToCart("gift-master-vault-mystery-chest-xl", 1);
        alert('🎉 Mystery Chest added to your vault cart!');
      });
    }, 1200);
  }
}

new MysterySimulator();
