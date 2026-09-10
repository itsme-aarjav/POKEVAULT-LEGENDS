'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProductCard from '../../components/ProductCard';
import { searchProducts } from '../../data/products.js';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const results = searchProducts(query);

  return (
    <main>
      {/* SEARCH HERO BANNER */}
      <header className="page-hero-banner" style={{ background: 'linear-gradient(135deg, #FFDE59 0%, #FF914D 100%)' }}>
        <div className="page-hero-container">
          <div className="breadcrumb-nav">
            <Link href="/">Home</Link> <span>/</span> <span className="current">Search Marketplace</span>
          </div>
          <h1 className="page-title">SEARCH RESULTS FOR "{query || 'All Merchandise'}"</h1>
          <p className="page-subtitle">Browsing catalog matches across all 18 Pokémon departments.</p>
        </div>
      </header>

      {/* SEARCH RESULTS CONTENT */}
      <div className="page-container" style={{ padding: '2.5rem 2rem 5rem' }}>
        <div className="shop-toolbar" style={{ marginBottom: '2rem' }}>
          <div className="results-count">Found {results.length} Product{results.length === 1 ? '' : 's'} matching "{query}"</div>
          <Link href="/shop" className="btn-inspect" style={{ textDecoration: 'none' }}>View Full Catalog →</Link>
        </div>

        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#FFF', border: '3px solid #000', boxShadow: '6px 6px 0px #000', borderRadius: '8px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', color: 'var(--accent-red)', marginBottom: '0.75rem' }}>NO MATCHES FOUND</h3>
            <p style={{ fontFamily: 'var(--font-mono)', color: '#666', marginBottom: '1.5rem' }}>We couldn't find any products matching "{query}". Try searching for "Pikachu", "Charizard", "Plush", or "Hoodie".</p>
            <Link href="/shop" className="btn-pill" style={{ textDecoration: 'none' }}>Browse All 60+ Products →</Link>
          </div>
        ) : (
          <div className="cards-grid">
            {results.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
