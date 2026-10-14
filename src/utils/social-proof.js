/**
 * POKÉVAULT LEGENDS — Conversion Rate Optimization (CRO) & Social Proof Engine
 * Manages live customer activity, live ticking dispatch countdowns, scarcity bars,
 * exit-intent bonuses, and authenticity trust seals.
 */

const RECENT_PURCHASES = [
  { buyer: "Kento T.", location: "Tokyo, Japan", item: "1st Edition Shadowless Charizard PSA 10", time: "2 minutes ago", badge: "PSA 10 Grail" },
  { buyer: "Marcus B.", location: "London, UK", item: "CoroCoro Pikachu Illustrator Promo PSA 9", time: "6 minutes ago", badge: "Trophy Promo" },
  { buyer: "Devin R.", location: "New York, USA", item: "Charizard Fire Blast Heat-Morphing Mug", time: "9 minutes ago", badge: "Magic Heat" },
  { buyer: "Aarav S.", location: "Mumbai, India", item: "Red Pokédex Collector Hardcover Journal", time: "14 minutes ago", badge: "Desk Essential" },
  { buyer: "Elena V.", location: "Berlin, Germany", item: "Gengar Shadow Realm XXL Gaming Desk Mat", time: "18 minutes ago", badge: "XXL Gaming" },
  { buyer: "Lucas M.", location: "Sydney, Australia", item: "Rayquaza Celestial Stardust Foil Art Print", time: "23 minutes ago", badge: "Cosmic Foil" },
  { buyer: "Chloe N.", location: "Toronto, Canada", item: "Poké Ball Vacuum Insulated Stainless Tumbler", time: "27 minutes ago", badge: "24H Cold" },
  { buyer: "Kenji S.", location: "Osaka, Japan", item: "Masaki Vending Mail Gengar Holo PSA 9", time: "34 minutes ago", badge: "Grail Promo" }
];

/**
 * Initializes live social proof purchase toast notifications
 */
export function initSocialProofToast() {
  if (typeof document === 'undefined') return;

  let toastContainer = document.getElementById('croSocialToastRoot');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'croSocialToastRoot';
    toastContainer.className = 'cro-toast-container';
    document.body.appendChild(toastContainer);
  }

  let purchaseIndex = 0;

  const showNextToast = () => {
    const data = RECENT_PURCHASES[purchaseIndex % RECENT_PURCHASES.length];
    purchaseIndex++;

    const toast = document.createElement('div');
    toast.className = 'cro-toast-item animate-pop-in';
    toast.innerHTML = `
      <div class="cro-toast-icon">⚡</div>
      <div class="cro-toast-content">
        <div class="cro-toast-header">
          <span class="cro-toast-buyer">${data.buyer}</span>
          <span class="cro-toast-loc">${data.location}</span>
          <span class="cro-toast-verified">✓ Verified</span>
        </div>
        <div class="cro-toast-item-title">Purchased <strong>${data.item}</strong></div>
        <div class="cro-toast-footer">
          <span class="cro-toast-time">${data.time}</span>
          <span class="cro-toast-badge">${data.badge}</span>
        </div>
      </div>
      <button class="cro-toast-close" aria-label="Close Notification">&times;</button>
    `;

    toast.querySelector('.cro-toast-close').addEventListener('click', () => {
      toast.classList.add('animate-fade-out');
      setTimeout(() => toast.remove(), 400);
    });

    toastContainer.appendChild(toast);

    // Auto-remove after 6.5s
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('animate-fade-out');
        setTimeout(() => toast.remove(), 400);
      }
    }, 6500);
  };

  // First toast after 3.5 seconds, then recurring every 16 seconds
  setTimeout(showNextToast, 3500);
  setInterval(showNextToast, 16000);
}

/**
 * Starts a realistic live viewer counter for high urgency on product details
 */
export function initLiveViewerCounter(elementId, baseCount = 14) {
  const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
  if (!el) return;

  let currentViewers = Math.floor(baseCount + Math.random() * 6);

  const updateDisplay = () => {
    el.innerHTML = `
      <span class="live-pulse-dot"></span>
      <span class="live-view-count"><strong>${currentViewers} collectors</strong> viewing right now</span>
    `;
  };

  updateDisplay();

  // Subtle natural fluctuation every 4-7 seconds
  setInterval(() => {
    const delta = Math.random() > 0.5 ? 1 : -1;
    currentViewers = Math.max(6, Math.min(28, currentViewers + delta));
    updateDisplay();
  }, 4500);
}

/**
 * Live Ticking Same-Day Dispatch Countdown Timer (ticks every second!)
 */
export function startLiveDispatchCountdown(elementId = 'pdDispatchCountdown') {
  const el = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
  if (!el) return;

  const updateClock = () => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(17, 0, 0, 0); // 5:00 PM Daily Cutoff

    if (now >= cutoff) {
      cutoff.setDate(cutoff.getDate() + 1);
    }

    const diffMs = cutoff - now;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');
    el.innerHTML = `<span class="dispatch-live-ticker">${pad(hours)}h ${pad(mins)}m ${pad(secs)}s</span>`;
  };

  updateClock();
  setInterval(updateClock, 1000);
}

/**
 * Renders an animated Free Shipping Progress Bar
 */
export function renderFreeShippingBar(currentTotal, threshold = 2500) {
  const diff = threshold - currentTotal;
  const progressPercent = Math.min(100, Math.round((currentTotal / threshold) * 100));

  if (diff <= 0) {
    return `
      <div class="free-shipping-bar-box unlocked">
        <div class="fs-text">🎉 <strong>FREE EXPRESS SHIPPING UNLOCKED!</strong> BlueDart Priority Air Dispatch.</div>
        <div class="fs-track"><div class="fs-fill" style="width: 100%; background: #10B981;"></div></div>
      </div>
    `;
  }

  return `
    <div class="free-shipping-bar-box">
      <div class="fs-text">🚚 Add <strong>₹${Math.round(diff).toLocaleString('en-IN')}</strong> more to unlock <strong>FREE BlueDart Air Shipping</strong>!</div>
      <div class="fs-track"><div class="fs-fill" style="width: ${progressPercent}%;"></div></div>
    </div>
  `;
}

/**
 * Initializes Exit-Intent Trainer Promo Modal (Triggered when moving cursor towards browser tab bar)
 */
export function initExitIntentModal() {
  if (typeof document === 'undefined') return;
  if (sessionStorage.getItem('pv_exit_intent_shown')) return;

  let modalOverlay = document.getElementById('pvExitIntentOverlay');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'pvExitIntentOverlay';
    modalOverlay.className = 'exit-intent-overlay';
    modalOverlay.innerHTML = `
      <div class="exit-intent-card animate-pop-in">
        <button class="exit-intent-close" id="closeExitIntentBtn" aria-label="Close">&times;</button>
        <div class="exit-intent-badge">⚡ COLLECTOR'S SPECIAL OFFER</div>
        <h3 class="exit-intent-title">WAIT, TRAINER! DON'T LEAVE YOUR VAULT BEHIND</h3>
        <p class="exit-intent-desc">Take an extra <strong>10% OFF</strong> your entire cart right now. Armored express shipping and PSA/BGS vault guarantees included.</p>
        
        <div class="exit-intent-coupon-box">
          <div class="exit-coupon-code">POKEVAULT10</div>
          <button class="exit-copy-btn" id="exitIntentCopyBtn">COPY CODE</button>
        </div>

        <div style="font-size:0.78rem; color:#64748B; margin-top:12px;">
          ✓ Valid for next 15 minutes • Applies to all 64 merchandise items & slabs
        </div>
      </div>
    `;
    document.body.appendChild(modalOverlay);

    const closeBtn = document.getElementById('closeExitIntentBtn');
    const copyBtn = document.getElementById('exitIntentCopyBtn');

    const closeModal = () => {
      modalOverlay.classList.remove('active');
      sessionStorage.setItem('pv_exit_intent_shown', 'true');
    };

    closeBtn?.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    copyBtn?.addEventListener('click', () => {
      navigator.clipboard.writeText('POKEVAULT10').then(() => {
        copyBtn.textContent = 'COPIED! ✓';
        copyBtn.style.background = '#10B981';
        copyBtn.style.color = '#FFF';
        setTimeout(closeModal, 1200);
      });
    });
  }

  // Detect mouse leaving viewport at the top
  const onMouseLeave = (e) => {
    if (e.clientY <= 10 && !sessionStorage.getItem('pv_exit_intent_shown')) {
      modalOverlay.classList.add('active');
      document.removeEventListener('mouseleave', onMouseLeave);
    }
  };

  document.addEventListener('mouseleave', onMouseLeave);
}

/**
 * Promo code copy helper
 */
export function copyPromoCode(code = 'POKEVAULT10') {
  navigator.clipboard.writeText(code).then(() => {
    const toast = document.createElement('div');
    toast.className = 'promo-copy-toast';
    toast.textContent = `Promo Code "${code}" copied to clipboard!`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  });
}
