'use client';

import React from 'react';
import Link from 'next/link';
import ProductCard from '../../components/ProductCard';
import { useStore } from '../../context/StoreContext';
import { getProductById } from '../../data/products.js';

export default function WishlistPage() {
  const { wishlist } = useStore();
  const products = wishlist.map(id => getProductById(id)).filter(Boolean);

  return (
    <main>
      {/* WISHLIST HERO */}
      <header className="page-hero-banner" style={{ background: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)', color: '#FFF' }}>
        <div className="page-hero-container">
          <div className="breadcrumb-nav">
            <Link href="/" style={{ color: '#FFF' }}>Home</Link> <span style={{ color: '#FFF' }}>/</span> <span className="current" style={{ color: '#FFF' }}>My Saved Wishlist</span>
          </div>
          <h1 className="page-title" style={{ color: '#FFF' }}>MY SAVED VAULT WISHLIST</h1>
          <p className="page-subtitle" style={{ color: '#FFF' }}>Keep track of your favorite Pokémon collectibles and 1-click move them to your cart.</p>
        </div>
      </header>

      {/* WISHLIST CONTENT */}
      <div className="page-container" style={{ padding: '3rem 2rem 6rem' }}>
        <div className="shop-toolbar" style={{ marginBottom: '2rem' }}>
          <div className="results-count">{products.length} Saved Item{products.length === 1 ? '' : 's'} in Wishlist</div>
          <Link href="/shop" className="btn-inspect" style={{ textDecoration: 'none' }}>Explore Marketplace →</Link>
        </div>

        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#FFF', border: '3px solid #000', boxShadow: '6px 6px 0px #000', borderRadius: '8px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', color: 'var(--accent-red)', marginBottom: '0.75rem' }}>YOUR WISHLIST IS EMPTY</h3>
            <p style={{ fontFamily: 'var(--font-mono)', color: '#666', marginBottom: '1.5rem' }}>Click the heart icon on any card, plush, figure, or merch item to save it to your wishlist!</p>
            <Link href="/shop" className="btn-pill" style={{ textDecoration: 'none' }}>Browse Pokémon Marketplace →</Link>
          </div>
        ) : (
          <div className="cards-grid">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
