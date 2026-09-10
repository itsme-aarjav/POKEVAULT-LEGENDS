import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'About Us & Authenticity Guarantee | POKÉVAULT LEGENDS',
  description: 'Learn about PokéVault Legends, our 100% PSA/BGS grading standards, official Pokémon Center licensing, and climate-controlled vault storage.'
};

export default function AboutPage() {
  return (
    <main>
      {/* HERO */}
      <header className="page-hero-banner" style={{ background: 'linear-gradient(135deg, #FFF056 0%, #FF914D 100%)' }}>
        <div className="page-hero-container">
          <div className="breadcrumb-nav">
            <Link href="/">Home</Link> <span>/</span> <span className="current">About PokéVault</span>
          </div>
          <h1 className="page-title">LEGENDS LIVE FOREVER</h1>
          <p className="page-subtitle">The premier vault destination for verified Pokémon trading cards, scale statues, plushies, and vintage artifacts.</p>
        </div>
      </header>

      {/* ABOUT CONTENT */}
      <div className="page-container" style={{ padding: '3rem 2rem 6rem', maxWidth: '900px', margin: '0 auto' }}>
        <div className="table-card" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', color: 'var(--accent-red)', marginTop: 0 }}>OUR MISSION</h2>
          <p style={{ fontFamily: 'var(--font-mono)', lineHeight: 1.7, color: '#333', fontSize: '0.95rem' }}>
            Founded in 2024 by passionate Pokémon collectors and vintage manga enthusiasts, PokéVault Legends was built to bridge the gap between high-end card investing and complete merchandise collecting. Every single graded slab, plush toy, statue, and apparel item in our vault undergoes rigorous 5-step authenticity verification.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="kpi-card">
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔍</div>
            <div className="kpi-title">100% PSA &amp; BGS VERIFIED</div>
            <div className="kpi-sub">Every trading card is certified and registered with PSA, BGS, or CGC databases.</div>
          </div>
          <div className="kpi-card">
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🏰</div>
            <div className="kpi-title">CLIMATE CONTROLLED VAULT</div>
            <div className="kpi-sub">Items stored in 68°F, 45% humidity UV-shielded vault chambers.</div>
          </div>
          <div className="kpi-card">
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📦</div>
            <div className="kpi-title">ARMORED DISPATCH</div>
            <div className="kpi-sub">Shipped in crush-proof box containers with full insurance coverage.</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <Link href="/shop" className="btn-pill" style={{ textDecoration: 'none', padding: '14px 28px', fontSize: '1.1rem' }}>
            Explore Marketplace Catalog →
          </Link>
        </div>
      </div>
    </main>
  );
}
