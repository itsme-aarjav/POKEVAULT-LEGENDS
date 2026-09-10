import React from 'react';
import Link from 'next/link';
import Hero3DStage from '../components/Hero3DStage';
import ProductCard from '../components/ProductCard';
import { ALL_PRODUCTS } from '../data/products.js';

export const metadata = {
  title: 'Home | POKÉVAULT LEGENDS — Official Pokémon Merchandise Vault',
  description: 'Explore 60+ authenticated Pokémon trading cards, PSA 10 slabs, lifesize plush, resin figures, streetwear hoodies, and room decor.'
};

export default function HomePage() {
  const bestSellers = ALL_PRODUCTS.filter(p => p.isBestseller || p.isFeatured).slice(0, 8);

  return (
    <main>
      {/* 03 HERO SECTION ("LEGENDS LIVE FOREVER") */}
      <section className="hero-section">
        <div className="ribbon-top-right">60+ Collector Items</div>

        <svg className="hero-lightning-bg" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M350 0L200 280H420L250 600L650 250H450L600 0H350Z" fill="#FFFFFF" fillOpacity="0.95" stroke="#000000" strokeWidth="4"/>
        </svg>

        <div className="hero-content">
          <h1 className="title-large">LEGENDS<br/>LIVE FOREVER</h1>
          <p className="hero-subtext text-typewriter">
            The ultimate Pokémon merchandise vault. Collect graded 1st edition slabs, plush companions, scale figures, and vintage pulp apparel.
          </p>

          <Hero3DStage />

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link href="/shop" className="btn-pill" id="shopAllBtn">Explore 60+ Products →</Link>
            <Link href="/categories" className="btn-inspect" style={{ textDecoration: 'none', padding: '12px 24px' }}>Browse 18 Categories</Link>
          </div>
        </div>
      </section>

      {/* FEATURED CATEGORIES SHOWCASE */}
      <section className="trending-section" style={{ background: '#FFF', borderTop: '3px solid #000', borderBottom: '3px solid #000', padding: '4rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-red)', fontSize: '0.9rem', letterSpacing: '1px' }}>POPULAR DEPARTMENTS</div>
          <h2 className="title-section" style={{ marginTop: '4px' }}>FEATURED CATEGORIES</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
          <Link href="/category/trading-cards" style={{ textDecoration: 'none', color: '#000' }}>
            <div style={{ background: '#FFF056', border: '3px solid #000', boxShadow: '6px 6px 0px #000', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🃏</div>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>TRADING CARDS</h3>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#444', marginTop: '4px' }}>PSA &amp; BGS Graded Slabs</p>
            </div>
          </Link>

          <Link href="/category/plush-toys" style={{ textDecoration: 'none', color: '#000' }}>
            <div style={{ background: '#FFDE59', border: '3px solid #000', boxShadow: '6px 6px 0px #000', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🧸</div>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>PLUSH TOYS</h3>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#444', marginTop: '4px' }}>1:1 Scale &amp; Giant Plushies</p>
            </div>
          </Link>

          <Link href="/category/figures-statues" style={{ textDecoration: 'none', color: '#000' }}>
            <div style={{ background: '#00C9FF', border: '3px solid #000', boxShadow: '6px 6px 0px #000', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🗿</div>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>FIGURES &amp; STATUES</h3>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#444', marginTop: '4px' }}>Kotobukiya &amp; Resin Dioramas</p>
            </div>
          </Link>

          <Link href="/category/clothing-apparel" style={{ textDecoration: 'none', color: '#000' }}>
            <div style={{ background: '#E94057', color: '#FFF', border: '3px solid #000', boxShadow: '6px 6px 0px #000', borderRadius: '8px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '8px' }}>👕</div>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#FFF' }}>CLOTHING &amp; APPAREL</h3>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#FFF', marginTop: '4px' }}>Heavyweight Hoodies &amp; Tees</p>
            </div>
          </Link>
        </div>
      </section>

      {/* BEST SELLERS PRODUCTS GRID SECTION */}
      <section className="trending-section" id="trending">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h2 className="title-section" style={{ margin: 0 }}>BEST SELLING PRODUCTS</h2>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#666' }}>Top-rated Pokémon merchandise across all 18 categories</div>
          </div>
          <Link href="/shop" className="btn-inspect" style={{ textDecoration: 'none' }}>View All 60+ Items →</Link>
        </div>

        <div className="cards-grid">
          {bestSellers.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* SPECIAL OFFER BANNER */}
      <section style={{ background: 'var(--accent-red)', color: '#FFF', padding: '4rem 2rem', borderTop: '4px solid #000', borderBottom: '4px solid #000', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', letterSpacing: '2px', color: '#FFF056' }}>⚡ VAULT COLLECTOR PROMO SPECIAL</div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, margin: '0.5rem 0 1rem' }}>TAKE 10% OFF YOUR FIRST ORDER</h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Use promo code <span style={{ background: '#FFF056', color: '#000', padding: '2px 8px', borderRadius: '4px', fontWeight: 900 }}>POKEVAULT10</span> at checkout for 10% off any card, plush, figure, or clothing purchase.
          </p>
          <Link href="/shop" className="btn-pill" style={{ background: '#FFF056', color: '#000', textDecoration: 'none', padding: '14px 28px', fontSize: '1.1rem' }}>
            Shop Marketplace Now →
          </Link>
        </div>
      </section>
    </main>
  );
}
