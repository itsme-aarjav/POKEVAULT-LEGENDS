/**
 * POKÉVAULT LEGENDS — Shared Footer Component
 * Renders brand story, trust badges, payment icons, category shortcuts, newsletter signup, and copyright info.
 */

export function renderFooter() {
  return `
    <footer class="footer-wrap">
      <!-- 4-PILLAR TRUST & SECURITY SEALS -->
      <div class="trust-seals-grid" style="margin-bottom: 2.5rem;">
        <div class="trust-seal-card">
          <div class="trust-seal-icon">🛡️</div>
          <div>
            <div class="trust-seal-title">100% PSA/BGS GUARANTEE</div>
            <div class="trust-seal-desc">Every graded slab is serialized and tamper-proof inspected by senior vault curators.</div>
          </div>
        </div>

        <div class="trust-seal-card">
          <div class="trust-seal-icon">⚡</div>
          <div>
            <div class="trust-seal-title">INSURED BLUEDART DISPATCH</div>
            <div class="trust-seal-desc">Climate-controlled armored bubble packaging with live GPS tracking from Mumbai Vault.</div>
          </div>
        </div>

        <div class="trust-seal-card">
          <div class="trust-seal-icon">🔒</div>
          <div>
            <div class="trust-seal-title">30-DAY ZERO-RISK RETURNS</div>
            <div class="trust-seal-desc">Complete peace of mind. Not 100% satisfied? Return hassle-free for a prompt full refund.</div>
          </div>
        </div>

        <div class="trust-seal-card">
          <div class="trust-seal-icon">💳</div>
          <div>
            <div class="trust-seal-title">256-BIT ENCRYPTED PAY</div>
            <div class="trust-seal-desc">Bank-level checkout security supporting PayPal, UPI, Visa, Mastercard & Apple Pay.</div>
          </div>
        </div>
      </div>

      <div class="footer-main-grid">
        <div class="footer-col brand-col">
          <div class="logo-stamp" style="margin-bottom: 1rem;">
            <div class="logo-badge"><img src="assets/pokeball-emoji.png" alt="Pokéball" class="pokeball-emoji-sm" style="margin-right: 3px;" /> POKÉVAULT</div>
            <div style="font-family: var(--font-display); font-size: 1.6rem; color: var(--accent-red); margin-top: 2px;">LEGENDS</div>
          </div>
          <p class="footer-bio">
            <strong>Non-Commercial Engineering Portfolio</strong>: A personal software engineering and cloud infrastructure demonstration showcasing AWS EKS, S3, CloudFront, Terraform, and modern microservices architecture. Not an active e-commerce store.
          </p>
          <div class="footer-socials">
            <a href="https://github.com/itsme-aarjav/POKEVAULT-LEGENDS" target="_blank" rel="noopener" class="social-btn" aria-label="GitHub">💻</a>
            <a href="https://twitter.com" target="_blank" rel="noopener" class="social-btn" aria-label="Twitter">📱</a>
            <a href="https://instagram.com" target="_blank" rel="noopener" class="social-btn" aria-label="Instagram">📸</a>
            <a href="https://discord.com" target="_blank" rel="noopener" class="social-btn" aria-label="Discord">💬</a>
          </div>
        </div>

        <div class="footer-col nav-col-marketplace">
          <h4 class="footer-heading">MARKETPLACE</h4>
          <ul class="footer-links">
            <li><a href="shop.html">Shop All Products</a></li>
            <li><a href="categories.html">All 18 Categories</a></li>
            <li><a href="category.html?id=trading-cards">Trading Cards &amp; Slabs</a></li>
            <li><a href="category.html?id=plush-toys">Plush Toys &amp; Companions</a></li>
            <li><a href="category.html?id=figures-statues">Scale Figures &amp; Statues</a></li>
            <li><a href="category.html?id=clothing-apparel">Apparel &amp; Streetwear</a></li>
          </ul>
        </div>

        <div class="footer-col nav-col-customer">
          <h4 class="footer-heading">CUSTOMER VAULT</h4>
          <ul class="footer-links">
            <li><a href="blog.html">📰 The PokéVault Journal</a></li>
            <li><a href="verify.html">🔍 Verify PSA Slabs</a></li>
            <li><a href="rewards.html">🪙 PokéCoins VIP Rewards</a></li>
            <li><a href="track.html">📦 Track My Order</a></li>
            <li><a href="mystery-vault.html">🎁 Mystery Vault Simulator</a></li>
            <li><a href="about.html">About PokéVault</a></li>
            <li><a href="contact.html">Contact Support &amp; FAQ</a></li>
          </ul>
        </div>

        <div class="footer-col newsletter-col">
          <h4 class="footer-heading">VIP VAULT DISPATCH</h4>
          <p class="footer-sub-text">Educational newsletter simulation for personal cloud and DevOps architecture updates.</p>
          <form class="footer-news-form" id="footerNewsForm" onsubmit="event.preventDefault(); alert('★ Portfolio Demo: Thank you for testing the newsletter subscription component!');">
            <input type="email" placeholder="Enter trainer email..." class="footer-news-input" required />
            <button type="submit" class="btn-pill footer-news-btn">JOIN VIP</button>
          </form>
        </div>
      </div>

      <!-- NON-COMMERCIAL PORTFOLIO DISCLAIMER BAR -->
      <div style="background: #111; border-top: 2px solid #333; padding: 14px 20px; text-align: center; font-family: var(--font-mono, monospace); font-size: 0.78rem; color: #FFF9C4; line-height: 1.5;">
        ⚠️ <strong>PERSONAL STUDENT PORTFOLIO PROJECT &bull; NOT A REAL COMMERCIAL STORE</strong>: This website is created solely for personal educational and engineering portfolio demonstration purposes. <strong>NO REAL TRANSACTIONS ARE PROCESSED AND NO GOODS ARE SHIPPED OR SOLD.</strong> This site is fan-made and has no commercial affiliation with Nintendo, Creatures Inc., Game Freak, or The Pokémon Company. All Pokémon trademarks and media belong to their respective copyright holders.
      </div>

      <div class="footer-bottom-bar">
        <div class="footer-copy-text">© 2026 POKÉVAULT LEGENDS (PERSONAL PORTFOLIO DEMO BY AARJAV JAIN). POKÉMON IS A REGISTERED TRADEMARK OF NINTENDO / CREATURES INC. / GAME FREAK.</div>
        <div class="footer-legal-links">
          <a href="about.html">Project Architecture</a>
          <span class="footer-dot-sep">•</span>
          <a href="about.html">Portfolio Disclaimer</a>
          <span class="footer-dot-sep">•</span>
          <a href="https://github.com/itsme-aarjav/POKEVAULT-LEGENDS" target="_blank" rel="noopener">GitHub Repository</a>
        </div>
      </div>
    </footer>
  `;
}

