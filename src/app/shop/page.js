'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import ProductCard from '../../components/ProductCard';
import { ALL_PRODUCTS, filterProducts } from '../../data/products.js';
import { CATEGORIES_DATA } from '../../data/categories.js';

export default function ShopPage() {
  const [category, setCategory] = useState('all');
  const [pokemon, setPokemon] = useState('all');
  const [maxPrice, setMaxPrice] = useState(15000);
  const [rating, setRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [displayedCount, setDisplayedCount] = useState(12);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    return filterProducts({
      category,
      pokemon,
      maxPrice,
      rating,
      inStockOnly,
      sortBy
    });
  }, [category, pokemon, maxPrice, rating, inStockOnly, sortBy]);

  const visibleProducts = filteredProducts.slice(0, displayedCount);

  const handleReset = () => {
    setCategory('all');
    setPokemon('all');
    setMaxPrice(15000);
    setRating(0);
    setInStockOnly(false);
    setSortBy('featured');
    setDisplayedCount(12);
  };

  return (
    <main>
      {/* SHOP HEADER HERO */}
      <header className="page-hero-banner" style={{ background: 'linear-gradient(135deg, #FFF056 0%, #FFD700 100%)' }}>
        <div className="page-hero-container">
          <div className="breadcrumb-nav">
            <Link href="/">Home</Link> <span>/</span> <span className="current">Shop All Products</span>
          </div>
          <h1 className="page-title">POKÉMON MERCHANDISE MARKETPLACE</h1>
          <p className="page-subtitle">Browse 60+ authenticated graded slabs, plush companions, resin statues, streetwear apparel, and room decor.</p>
        </div>
      </header>

      {/* MAIN SHOP CONTENT WRAPPER */}
      <div className="shop-page-layout">
        {/* MOBILE FILTER TOGGLE BUTTON */}
        <button
          className="mobile-filter-toggle-btn"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
          aria-label="Toggle Filter Options"
        >
          <span>{mobileFilterOpen ? '⚡ Hide Filters' : '⚡ Filter & Sort Products'}</span>
          <span style={{ fontSize: '1.1rem' }}>{mobileFilterOpen ? '▲' : '▼'}</span>
        </button>

        {/* FILTER SIDEBAR */}
        <aside className={`shop-sidebar ${mobileFilterOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3 className="sidebar-title">🔍 FILTER MARKETPLACE</h3>
            <button className="btn-clear-filters" onClick={handleReset}>Reset All</button>
          </div>

          {/* Category Filter */}
          <div className="filter-group">
            <h4 className="filter-group-title">CATEGORIES</h4>
            <ul className="filter-category-list">
              <li>
                <button
                  className={`filter-cat-btn ${category === 'all' ? 'active' : ''}`}
                  onClick={() => { setCategory('all'); setDisplayedCount(12); }}
                >
                  <span>All Categories</span>
                  <span className="cat-count-badge">{ALL_PRODUCTS.length}</span>
                </button>
              </li>
              {CATEGORIES_DATA.map(cat => {
                const count = ALL_PRODUCTS.filter(p => p.category === cat.slug).length;
                return (
                  <li key={cat.slug}>
                    <button
                      className={`filter-cat-btn ${category === cat.slug ? 'active' : ''}`}
                      onClick={() => { setCategory(cat.slug); setDisplayedCount(12); }}
                    >
                      <span>{cat.icon} {cat.shortName}</span>
                      <span className="cat-count-badge">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Pokémon Character Filter */}
          <div className="filter-group">
            <h4 className="filter-group-title">POKÉMON CHARACTER</h4>
            <select className="filter-select" value={pokemon} onChange={(e) => { setPokemon(e.target.value); setDisplayedCount(12); }}>
              <option value="all">All Pokémon Characters</option>
              <option value="pikachu">Pikachu</option>
              <option value="charizard">Charizard</option>
              <option value="gengar">Gengar</option>
              <option value="eevee">Eevee / Eevolutions</option>
              <option value="mew">Mew / Mewtwo</option>
              <option value="rayquaza">Rayquaza / Dragon</option>
              <option value="snorlax">Snorlax</option>
              <option value="bulbasaur">Bulbasaur / Starters</option>
              <option value="lucario">Lucario</option>
            </select>
          </div>

          {/* Price Range Filter */}
          <div className="filter-group">
            <h4 className="filter-group-title">MAX PRICE: <span>${maxPrice.toLocaleString()}</span></h4>
            <input
              type="range"
              min="10"
              max="15000"
              step="10"
              value={maxPrice}
              onChange={(e) => { setMaxPrice(parseInt(e.target.value)); setDisplayedCount(12); }}
              className="price-slider"
            />
            <div className="price-range-labels">
              <span>$10</span>
              <span>$15,000+</span>
            </div>
          </div>

          {/* Minimum Rating Filter */}
          <div className="filter-group">
            <h4 className="filter-group-title">MINIMUM RATING</h4>
            <div className="rating-filter-options">
              <label className="filter-radio-label">
                <input type="radio" name="ratingFilter" value="0" checked={rating === 0} onChange={() => { setRating(0); setDisplayedCount(12); }} /> Any Rating
              </label>
              <label className="filter-radio-label">
                <input type="radio" name="ratingFilter" value="4.5" checked={rating === 4.5} onChange={() => { setRating(4.5); setDisplayedCount(12); }} /> 4.5★ &amp; Above
              </label>
              <label className="filter-radio-label">
                <input type="radio" name="ratingFilter" value="4.8" checked={rating === 4.8} onChange={() => { setRating(4.8); setDisplayedCount(12); }} /> 4.8★ &amp; Above
              </label>
              <label className="filter-radio-label">
                <input type="radio" name="ratingFilter" value="5.0" checked={rating === 5.0} onChange={() => { setRating(5.0); setDisplayedCount(12); }} /> 5.0★ Perfect
              </label>
            </div>
          </div>

          {/* Availability Filter */}
          <div className="filter-group">
            <label className="filter-checkbox-label">
              <input type="checkbox" checked={inStockOnly} onChange={(e) => { setInStockOnly(e.target.checked); setDisplayedCount(12); }} /> In Stock Items Only
            </label>
          </div>
        </aside>

        {/* SHOP PRODUCTS GRID & TOOLBAR */}
        <section className="shop-main-content">
          <div className="shop-toolbar">
            <div className="results-count">
              Showing {Math.min(displayedCount, filteredProducts.length)} of {filteredProducts.length} Products
            </div>

            <div className="toolbar-controls">
              <label htmlFor="sortBySelect" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>Sort By:</label>
              <select id="sortBySelect" className="filter-select" style={{ width: 'auto' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="featured">Featured Items</option>
                <option value="popular">Most Popular</option>
                <option value="newest">New Arrivals</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* PRODUCTS GRID */}
          {filteredProducts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '5rem 2rem', background: '#FFF', border: '3px solid #000', boxShadow: '6px 6px 0px #000', borderRadius: '8px' }}>
              <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', color: 'var(--accent-red)', marginBottom: '1rem' }}>NO PRODUCTS FOUND</h2>
              <p style={{ fontFamily: 'var(--font-mono)', color: '#666', marginBottom: '1.5rem' }}>No merchandise items match your selected filters. Try adjusting price or category filters.</p>
              <button className="btn-pill" onClick={handleReset}>Reset Filters</button>
            </div>
          ) : (
            <div className="cards-grid">
              {visibleProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {/* LOAD MORE */}
          {displayedCount < filteredProducts.length ? (
            <div className="load-more-wrap" style={{ display: 'block', textAlign: 'center', marginTop: '3rem' }}>
              <button className="btn-pill" onClick={() => setDisplayedCount(prev => prev + 12)} style={{ padding: '12px 32px' }}>
                Load More Products
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
