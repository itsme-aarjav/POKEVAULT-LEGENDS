'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ProductCard from '../../../components/ProductCard';
import { useStore } from '../../../context/StoreContext';
import { ALL_PRODUCTS } from '../../../data/products.js';
import confetti from 'canvas-confetti';

export default function ProductDetailClient({ product }) {
  const { addToCart, toggleWishlist, isInWishlist } = useStore();
  const [selectedImg, setSelectedImg] = useState(product.image);
  const [qty, setQty] = useState(1);

  const isWishlisted = isInWishlist(product.id);
  const starsHtml = '★'.repeat(Math.floor(product.rating)) + (product.rating % 1 !== 0 ? '½' : '');

  const related = ALL_PRODUCTS
    .filter(item => item.id !== product.id && (item.category === product.category || item.pokemon === product.pokemon))
    .slice(0, 4);

  const handleAddToCart = () => {
    addToCart(product.id, qty);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
  };

  return (
    <main className="product-page-wrap" style={{ padding: '2.5rem 2rem 5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* BREADCRUMBS */}
      <div className="breadcrumb-nav" style={{ marginBottom: '1.5rem' }}>
        <Link href="/">Home</Link> <span>/</span>{' '}
        <Link href="/shop">Shop Marketplace</Link> <span>/</span>{' '}
        <Link href={`/category/${product.category}`}>{product.categoryName}</Link> <span>/</span>{' '}
        <span className="current">{product.name}</span>
      </div>

      {/* MAIN PRODUCT GRID */}
      <div className="pd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '4rem' }}>
        {/* LEFT: GALLERY */}
        <div className="pd-stage-box">
          <div id="pdMainStageCanvas" style={{ background: '#FFF', border: '3px solid #000', boxShadow: '6px 6px 0px #000', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={selectedImg} alt={product.name} style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain' }} />
          </div>

          {/* THUMBNAIL STRIP */}
          {product.gallery && product.gallery.length > 1 ? (
            <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', overflowX: 'auto', paddingBottom: '6px' }}>
              {product.gallery.map((imgUrl, idx) => (
                <button
                  key={idx}
                  className={`thumb-btn ${selectedImg === imgUrl ? 'active' : ''}`}
                  onClick={() => setSelectedImg(imgUrl)}
                  style={{ border: '2px solid #000', background: '#FFF', borderRadius: '6px', padding: '4px', cursor: 'pointer', width: '70px', height: '70px' }}
                >
                  <img src={imgUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={`Thumb ${idx}`} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* RIGHT: DETAILS */}
        <div className="pd-details-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="stock-badge in-stock">{product.availability}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, background: '#000', color: '#FFF056', padding: '2px 8px', borderRadius: '4px' }}>
              {product.categoryName}
            </span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, margin: '0 0 8px', color: '#000' }}>
            {product.name}
          </h1>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
            {product.subName || product.shortDescription} • SKU: {product.sku || product.id}
          </div>

          {/* RATING */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--accent-orange)', fontSize: '1.1rem' }}>{starsHtml}</span>
            <strong style={{ color: '#000' }}>{product.rating.toFixed(1)}</strong>
            <span style={{ color: '#666' }}>({product.reviewCount} customer reviews)</span>
          </div>

          {/* PRICE BOX */}
          <div style={{ background: '#FFFDE7', border: '3px solid #000', boxShadow: '4px 4px 0px #000', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent-red)' }}>
              ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            {product.originalPrice ? (
              <div style={{ fontFamily: 'var(--font-mono)', textDecoration: 'line-through', color: '#888', fontSize: '1.1rem' }}>
                ${product.originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            ) : null}
            {product.discountPercent ? (
              <span style={{ background: 'var(--accent-red)', color: '#FFF', fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px' }}>
                SAVE {product.discountPercent}%
              </span>
            ) : null}
          </div>

          {/* DESCRIPTION */}
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', lineHeight: 1.6, color: '#222', marginBottom: '1.5rem' }}>
            {product.description}
          </p>

          {/* QUANTITY & ACTIONS */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div className="qty-control-box" style={{ background: '#FFF', padding: '4px', borderRadius: '6px' }}>
              <button className="btn-qty" onClick={() => setQty(prev => Math.max(1, prev - 1))}>-</button>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.1rem', padding: '0 12px' }}>{qty}</span>
              <button className="btn-qty" onClick={() => setQty(prev => prev + 1)}>+</button>
            </div>

            <button className="btn-pill" onClick={handleAddToCart} style={{ flex: 1, minWidth: '200px', padding: '14px', fontSize: '1.1rem' }}>
              🛒 Add to Cart
            </button>

            <button
              className={`btn-inspect ${isWishlisted ? 'active' : ''}`}
              onClick={() => toggleWishlist(product.id)}
              style={{ padding: '14px', fontSize: '1.1rem' }}
              title="Save to Wishlist"
            >
              {isWishlisted ? '❤️ Saved' : '🤍 Wishlist'}
            </button>
          </div>

          {/* SPECIFICATIONS */}
          <div style={{ background: '#FFF', border: '3px solid #000', boxShadow: '4px 4px 0px #000', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', marginTop: 0, borderBottom: '2px solid #000', paddingBottom: '8px' }}>PRODUCT SPECIFICATIONS</h3>
            <table className="admin-table" style={{ marginTop: '10px' }}>
              <tbody>
                <tr><td>Category</td><td style={{ fontWeight: 700 }}>{product.categoryName}</td></tr>
                <tr><td>Associated Pokémon</td><td style={{ fontWeight: 700 }}>{product.pokemon}</td></tr>
                {product.specs ? Object.entries(product.specs).map(([key, val]) => (
                  <tr key={key}><td>{key}</td><td style={{ fontWeight: 700 }}>{val}</td></tr>
                )) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RECOMMENDED PRODUCTS */}
      {related.length > 0 ? (
        <section style={{ borderTop: '3px solid #000', paddingTop: '3rem' }}>
          <h2 className="title-section" style={{ marginBottom: '1.5rem' }}>RECOMMENDED FOR YOU</h2>
          <div className="cards-grid">
            {related.map(item => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
