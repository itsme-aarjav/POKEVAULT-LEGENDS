'use client';

import React from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const handleSubmit = (e) => {
    e.preventDefault();
    alert('★ Message received! A Vault Curator will respond within 4 hours.');
    e.target.reset();
  };

  return (
    <main>
      {/* HERO */}
      <header className="page-hero-banner" style={{ background: 'linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)', color: '#000' }}>
        <div className="page-hero-container">
          <div className="breadcrumb-nav">
            <Link href="/" style={{ color: '#000' }}>Home</Link> <span>/</span> <span className="current" style={{ color: '#000' }}>Contact &amp; Support</span>
          </div>
          <h1 className="page-title" style={{ color: '#000' }}>VAULT CURATOR SUPPORT</h1>
          <p className="page-subtitle" style={{ color: '#111' }}>Have questions about a slab certification, plush order, or vault dispatch? We're here to help.</p>
        </div>
      </header>

      {/* CONTACT LAYOUT */}
      <div className="page-container" style={{ padding: '3rem 2rem 6rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          {/* FORM */}
          <div className="table-card" style={{ padding: '2rem' }}>
            <h3 className="summary-title" style={{ marginTop: 0 }}>SEND A MESSAGE</h3>
            <form onSubmit={handleSubmit}>
              <div className="admin-form-group">
                <label>YOUR NAME *</label>
                <input type="text" className="admin-form-input" placeholder="e.g. Ash Ketchum" required />
              </div>
              <div className="admin-form-group">
                <label>EMAIL ADDRESS *</label>
                <input type="email" className="admin-form-input" placeholder="trainer@pokevault.com" required />
              </div>
              <div className="admin-form-group">
                <label>SUBJECT</label>
                <select className="filter-select">
                  <option>Order Shipping &amp; Tracking</option>
                  <option>Authenticity &amp; Grading Verification</option>
                  <option>Sell / Consign Cards or Collectibles</option>
                  <option>General Support</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label>MESSAGE *</label>
                <textarea className="admin-form-input" rows={4} placeholder="How can our curators assist you today?" required></textarea>
              </div>
              <button type="submit" className="btn-pill" style={{ width: '100%' }}>Send Message →</button>
            </form>
          </div>

          {/* FAQ ACCORDION */}
          <div>
            <h3 className="summary-title" style={{ marginTop: 0 }}>VAULT FAQ</h3>

            <div style={{ background: '#FFF', border: '3px solid #000', boxShadow: '4px 4px 0px #000', borderRadius: '8px', padding: '1.2rem', marginBottom: '1rem' }}>
              <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', marginTop: 0, color: 'var(--accent-red)' }}>Q: Are all merchandise items official?</h4>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#444', margin: 0 }}>Yes! All plushies, figures, apparel, and goods are 100% official Pokémon Center licensed products. All cards are certified by PSA or BGS.</p>
            </div>

            <div style={{ background: '#FFF', border: '3px solid #000', boxShadow: '4px 4px 0px #000', borderRadius: '8px', padding: '1.2rem', marginBottom: '1rem' }}>
              <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', marginTop: 0, color: 'var(--accent-red)' }}>Q: How fast is Vault Shipping?</h4>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#444', margin: 0 }}>Express Vault orders ship within 24 hours via tracked armored courier with bubble-foam protection (2-3 business days delivery).</p>
            </div>

            <div style={{ background: '#FFF', border: '3px solid #000', boxShadow: '4px 4px 0px #000', borderRadius: '8px', padding: '1.2rem' }}>
              <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', marginTop: 0, color: 'var(--accent-red)' }}>Q: What is the return policy?</h4>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#444', margin: 0 }}>We offer a 30-day money back authenticity return guarantee on all merchandise and slabs.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
