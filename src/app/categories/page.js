import React from 'react';
import Link from 'next/link';
import { CATEGORIES_DATA } from '../../data/categories.js';

export const metadata = {
  title: 'Categories Directory | POKÉVAULT LEGENDS',
  description: 'Explore all 18 Pokémon merchandise categories: Cards, Plush Toys, Scale Figures, Clothing, Home Decor, Mugs, Accessories and more.'
};

export default function CategoriesPage() {
  return (
    <main>
      {/* HERO BANNER */}
      <header className="page-hero-banner" style={{ background: 'linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)' }}>
        <div className="page-hero-container">
          <div className="breadcrumb-nav">
            <Link href="/" style={{ color: '#000' }}>Home</Link> <span>/</span> <span className="current" style={{ color: '#000' }}>Categories Directory</span>
          </div>
          <h1 className="page-title" style={{ color: '#000' }}>EXPLORE 18 MERCHANDISE DEPARTMENTS</h1>
          <p className="page-subtitle" style={{ color: '#111' }}>From PSA 10 slabs &amp; lifesize plushies to streetwear hoodies and resin dioramas — explore by category.</p>
        </div>
      </header>

      {/* CATEGORIES DIRECTORY GRID */}
      <div className="page-container" style={{ padding: '3rem 2rem 5rem' }}>
        <div className="categories-directory-grid">
          {CATEGORIES_DATA.map(cat => (
            <div
              key={cat.slug}
              className="category-directory-card"
              style={{ background: '#FFF', border: '3px solid #000', boxShadow: '6px 6px 0px #000', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ height: '180px', background: cat.bannerColor, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={cat.image} alt={cat.name} style={{ height: '140px', objectFit: 'contain', filter: 'drop-shadow(4px 4px 0px rgba(0,0,0,0.3))' }} />
                <span style={{ position: 'absolute', top: '12px', right: '12px', background: '#000', color: '#FFF056', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', padding: '4px 10px', borderRadius: '4px' }}>
                  {cat.count} Items
                </span>
                <span style={{ position: 'absolute', bottom: '12px', left: '12px', fontSize: '2rem' }}>
                  {cat.icon}
                </span>
              </div>

              <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: 900, marginBottom: '6px', color: '#000' }}>
                    {cat.name}
                  </h3>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#555', marginBottom: '1.5rem', lineHeight: 1.4 }}>
                    {cat.description}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link href={`/category/${cat.slug}`} className="btn-pill" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', padding: '10px' }}>
                    Explore Category →
                  </Link>
                  <Link href={`/shop?category=${cat.slug}`} className="btn-inspect" style={{ textDecoration: 'none', padding: '10px 14px' }}>
                    Filter Shop
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
