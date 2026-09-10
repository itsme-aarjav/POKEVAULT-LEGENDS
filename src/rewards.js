/**
 * POKÉVAULT LEGENDS — PokéCoins Loyalty & VIP Rewards Controller
 */

import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderCartDrawer, initCartDrawerEvents } from './components/cart-drawer.js';
import { getPokeCoins, addPokeCoins, getStreakData, claimDailyStreak, applyPromoCode } from './utils/store.js';

import confettiModule from 'canvas-confetti';
const confetti = confettiModule?.default || confettiModule || ((typeof window !== 'undefined' && window.confetti) ? window.confetti : () => {});

const REWARDS_CATALOG = [
  { id: "rw-250", title: "₹250 Off Voucher", cost: 300, code: "COIN250", desc: "Valid on all orders ₹1,500+", icon: "🎟️" },
  { id: "rw-500", title: "₹500 Off Voucher", cost: 550, code: "COIN500", desc: "Valid on all orders ₹3,000+", icon: "💰" },
  { id: "rw-ship", title: "Free Express BlueDart Air Pass", cost: 200, code: "FREESHIPVIP", desc: "Zero shipping fee on any order", icon: "🚀" },
  { id: "rw-15pct", title: "15% Off VIP Collector Pass", cost: 800, code: "VIP15PASS", desc: "Applies across all merchandise and slabs", icon: "👑" },
  { id: "rw-pack", title: "Free Japanese Booster Pack Voucher", cost: 1200, code: "FREEBOOSTER", desc: "Included in your next shipment box", icon: "🎴" }
];

class RewardsHub {
  constructor() {
    this.initLayout();
    this.renderUI();
  }

  initLayout() {
    document.getElementById('navbarRoot').innerHTML = renderNavbar();
    document.getElementById('cartDrawerRoot').innerHTML = renderCartDrawer();
    document.getElementById('footerRoot').innerHTML = renderFooter();

    initNavbarEvents();
    initCartDrawerEvents();
  }

  renderUI() {
    const coins = getPokeCoins();
    const balanceEl = document.getElementById('userCoinBalance');
    if (balanceEl) balanceEl.textContent = `🪙 ${coins.toLocaleString('en-IN')}`;

    // Calculate VIP Tier
    let tierName = "🥉 GYM TRAINER TIER";
    let progress = (coins / 1000) * 100;
    let goalText = `${Math.max(0, 1000 - coins)} coins until Elite Four Tier`;

    if (coins >= 10000) {
      tierName = "💎 VAULT MASTER TIER";
      progress = 100;
      goalText = "Maximum VIP Tier Reached!";
    } else if (coins >= 5000) {
      tierName = "🥇 CHAMPION TIER";
      progress = ((coins - 5000) / 5000) * 100;
      goalText = `${10000 - coins} coins until Vault Master Tier`;
    } else if (coins >= 1000) {
      tierName = "🥈 ELITE FOUR TIER";
      progress = ((coins - 1000) / 4000) * 100;
      goalText = `${5000 - coins} coins until Champion Tier`;
    }

    const tierNameEl = document.getElementById('userTierName');
    const fillEl = document.getElementById('tierProgressFill');
    const goalEl = document.getElementById('tierNextGoal');

    if (tierNameEl) tierNameEl.textContent = tierName;
    if (fillEl) fillEl.style.width = `${Math.min(100, progress)}%`;
    if (goalEl) goalEl.textContent = goalText;

    // Render Streak Days
    const streak = getStreakData();
    const streakContainer = document.getElementById('streakDaysRow');
    if (streakContainer) {
      streakContainer.innerHTML = [1, 2, 3, 4, 5, 6, 7].map(day => `
        <div class="streak-day-dot ${day <= streak.count ? 'active' : ''}">
          ${day <= streak.count ? '✓' : `D${day}`}
        </div>
      `).join('');
    }

    // Daily Claim Button
    const claimBtn = document.getElementById('claimStreakBtn');
    claimBtn?.addEventListener('click', () => {
      const res = claimDailyStreak();
      if (res.success) {
        confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
        alert(`🎉 Awesome Trainer! You claimed your Day ${res.streakCount} streak bonus (+${res.bonusCoins} PokéCoins)!`);
        this.renderUI();
      } else {
        alert(res.message);
      }
    });

    // Render Rewards Catalog
    const rewardsGrid = document.getElementById('rewardsCatalogGrid');
    if (rewardsGrid) {
      rewardsGrid.innerHTML = REWARDS_CATALOG.map(item => {
        const canAfford = coins >= item.cost;
        return `
          <div class="reward-card">
            <div>
              <div style="font-size:2.2rem; line-height:1; margin-bottom:8px;">${item.icon}</div>
              <h3 style="font-family:var(--font-title); font-weight:900; font-size:1.1rem; color:#000; margin:0 0 6px;">
                ${item.title}
              </h3>
              <p style="font-family:var(--font-body); font-size:0.8rem; color:#64748B; margin:0 0 12px;">
                ${item.desc}
              </p>
            </div>

            <div>
              <div style="font-family:var(--font-mono); font-weight:900; font-size:1.05rem; color:var(--accent-red); margin-bottom:10px;">
                🪙 ${item.cost} PokéCoins
              </div>
              <button 
                class="btn-pill redeem-btn" 
                data-code="${item.code}" 
                data-cost="${item.cost}" 
                style="width:100%; padding:8px 12px; font-size:0.85rem; ${!canAfford ? 'opacity:0.5; cursor:not-allowed; background:#CCC;' : ''}"
                ${!canAfford ? 'disabled' : ''}
              >
                ${canAfford ? 'REDEEM NOW' : 'NOT ENOUGH COINS'}
              </button>
            </div>
          </div>
        `;
      }).join('');

      rewardsGrid.querySelectorAll('.redeem-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const cost = parseInt(btn.getAttribute('data-cost'), 10);
          const code = btn.getAttribute('data-code');
          if (getPokeCoins() >= cost) {
            addPokeCoins(-cost);
            navigator.clipboard.writeText(code);
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
            alert(`🎉 Reward redeemed! Your promo code "${code}" has been copied to your clipboard. Apply it during checkout!`);
            this.renderUI();
          }
        });
      });
    }
  }
}

new RewardsHub();
