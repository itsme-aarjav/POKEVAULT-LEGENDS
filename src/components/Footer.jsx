'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    alert('★ Thank you for joining PokéVault VIP Dispatch!');
  };

  return (
    <footer class="footer-wrap">
      <div class="footer-top-strip">
        <div class="footer-feature-item">
          <div class="footer-feature-icon">🛡️</div>
          <div class="footer-feature-title">100% AUTHENTIC GUARANTEE</div>
          <div class="footer-feature-desc">All slabs PSA/BGS graded &amp; official Pokémon Center licensed merchandise.</div>
        </div>
        <div class="footer-feature-item">
          <div class="footer-feature-icon">🚀</div>
          <div class="footer-feature-title">VAULT EXPRESS DISPATCH</div>
          <div class="footer-feature-desc">Flat-rate tracked shipping with armored bubble wrapping &amp; insurance.</div>
        </div>
        <div class="footer-feature-item">
          <div class="footer-feature-icon">💳</div>
          <div class="footer-feature-title">SECURE VAULT PAY</div>
          <div class="footer-feature-desc">PayPal Smart Checkout, Apple Pay, Visa &amp; Mastercard support.</div>
        </div>
      </div>

      <div class="footer-main-grid">
        <div class="footer-col brand-col">
          <div class="logo-stamp" style={{ marginBottom: '1rem' }}>
            <div class="logo-badge">POKÉVAULT</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--accent-red)', marginTop: '2px' }}>LEGENDS</div>
          </div>
          <p class="footer-bio">
            The world's premier Pokémon merchandise marketplace and graded slab vault. Collecting legends, plush, figures, apparel, and rare artifacts from Gen 1 to Gen 9.
          </p>
        </div>

        <div class="footer-col">
          <h4 class="footer-heading">MARKETPLACE</h4>
          <ul class="footer-links">
            <li><Link href="/shop">Shop All Products</Link></li>
            <li><Link href="/categories">All 18 Categories</Link></li>
            <li><Link href="/category/trading-cards">Trading Cards &amp; Slabs</Link></li>
            <li><Link href="/category/plush-toys">Plush Toys &amp; Companions</Link></li>
            <li><Link href="/category/figures-statues">Scale Figures &amp; Statues</Link></li>
            <li><Link href="/category/clothing-apparel">Apparel &amp; Streetwear</Link></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4 class="footer-heading">CUSTOMER VAULT</h4>
          <ul class="footer-links">
            <li><Link href="/cart">View Shopping Cart</Link></li>
            <li><Link href="/wishlist">My Saved Wishlist</Link></li>
            <li><Link href="/checkout">Checkout &amp; Dispatch</Link></li>
            <li><Link href="/about">About PokéVault</Link></li>
            <li><Link href="/contact">Contact Support &amp; FAQ</Link></li>
            <li><Link href="/admin">Admin Curator Vault</Link></li>
          </ul>
        </div>

        <div class="footer-col newsletter-col">
          <h4 class="footer-heading">VIP VAULT DISPATCH</h4>
          <p class="footer-sub-text">Subscribe to get instant alerts on limited plush drops, PSA slab restocks &amp; 20% off promo codes.</p>
          <form class="footer-news-form" onSubmit={handleNewsletterSubmit}>
            <input type="email" placeholder="Enter trainer email..." class="footer-news-input" required />
            <button type="submit" class="btn-pill" style={{ padding: '10px 16px' }}>JOIN VIP</button>
          </form>
        </div>
      </div>

      <div class="footer-bottom-bar">
        <div>© 2026 POKÉVAULT LEGENDS INC. ALL RIGHTS RESERVED. POKÉMON IS A TRADEMARK OF NINTENDO / CREATURES INC. / GAME FREAK.</div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/about" style={{ color: '#FFF' }}>Privacy Policy</Link>
          <span>•</span>
          <Link href="/about" style={{ color: '#FFF' }}>Terms of Vault Dispatch</Link>
          <span>•</span>
          <Link href="/contact" style={{ color: '#FFF' }}>Authenticity Guarantee</Link>
        </div>
      </div>
    </footer>
  );
}
