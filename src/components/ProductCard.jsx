'use client';

import React from 'react';
import Link from 'next/link';
import { useStore } from '../context/StoreContext';
import confetti from 'canvas-confetti';

export default function ProductCard({ product }) {
  const { isInWishlist, toggleWishlist, addToCart } = useStore();
  const isWishlisted = isInWishlist(product.id);
  const starsHtml = '★'.repeat(Math.floor(product.rating)) + (product.rating % 1 !== 0 ? '½' : '');

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleAddToCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product.id, 1);
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
  };

  return (
    <div class="card-item-box" data-product-id={product.id}>
      <div class="card-image-wrap">
        {product.discountPercent ? (
          <div class="card-discount-tag">-{product.discountPercent}%</div>
        ) : null}
        {product.badge ? <div class="card-badge">{product.badge}</div> : null}
        <button
          className={`card-wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={handleWishlistClick}
          aria-label="Toggle Wishlist"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted ? '#E94057' : 'none'} stroke={isWishlisted ? '#E94057' : '#000'} strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
        <Link href={`/product/${product.id}`} style={{ display: 'block', width: '100%', height: '100%' }}>
          <img src={product.image} alt={product.name} class="card-main-img" loading="lazy" />
        </Link>
      </div>

      <div class="card-info-box">
        <div class="card-category-label">{product.categoryName}</div>
        <Link href={`/product/${product.id}`} class="card-title-link">
          <h3 class="card-title-text">{product.name}</h3>
        </Link>
        <div class="card-sub-text">{product.subName || product.shortDescription}</div>

        <div class="card-rating-row">
          <span class="card-stars">{starsHtml}</span>
          <span class="card-rating-num">{product.rating.toFixed(1)}</span>
          <span class="card-reviews-count">({product.reviewCount})</span>
        </div>

        <div class="card-price-row">
          <div class="card-price-current">${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          {product.originalPrice ? (
            <div class="card-price-original">${product.originalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          ) : null}
        </div>

        <div class="card-actions-row">
          <button class="btn-pill btn-add-cart-fast" onClick={handleAddToCartClick}>
            🛒 Add to Cart
          </button>
          <Link href={`/product/${product.id}`} class="btn-inspect">
            Details →
          </Link>
        </div>
      </div>
    </div>
  );
}
