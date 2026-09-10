'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useStore } from '../../context/StoreContext';

export default function CartPage() {
  const {
    cart,
    updateCartQty,
    removeFromCart,
    clearCart,
    subtotal,
    discountAmount,
    shippingCost,
    total,
    appliedPromo,
    applyPromoCode,
    insuranceEnabled,
    setInsuranceEnabled
  } = useStore();

  const [promoInput, setPromoInput] = useState('');
  const [promoStatus, setPromoStatus] = useState({ message: '', success: false });

  const handlePromoSubmit = (e) => {
    e.preventDefault();
    const res = applyPromoCode(promoInput);
    setPromoStatus({ message: res.message, success: res.success });
  };

  return (
    <main>
      {/* CART HERO BANNER */}
      <header className="page-hero-banner" style={{ background: 'linear-gradient(135deg, #FFF056 0%, #FFD700 100%)' }}>
        <div className="page-hero-container">
          <div className="breadcrumb-nav">
            <Link href="/">Home</Link> <span>/</span> <span className="current">Shopping Cart</span>
          </div>
          <h1 className="page-title">YOUR VAULT SHOPPING CART</h1>
          <p className="page-subtitle">Review your selected Pokémon merchandise items, apply promo discounts, and prepare for vault dispatch.</p>
        </div>
      </header>

      {/* CART MAIN CONTENT */}
      <div className="page-container" style={{ padding: '3rem 2rem 6rem' }}>
        <div className="cart-page-layout">
          {/* LEFT: CART ITEMS TABLE */}
          <div className="cart-items-section">
            <div className="table-card">
              <div className="table-toolbar">
                <span style={{ fontFamily: 'var(--font-title)', fontWeight: 900, fontSize: '1.1rem' }}>VAULT CART ITEMS</span>
                {cart.length > 0 ? (
                  <button className="btn-inspect" onClick={() => { if (confirm('Clear cart?')) clearCart(); }} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                    Clear Entire Cart
                  </button>
                ) : null}
              </div>

              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#FFF' }}>
                  <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', color: 'var(--accent-red)', marginBottom: '0.75rem' }}>YOUR CART IS EMPTY</h3>
                  <p style={{ fontFamily: 'var(--font-mono)', color: '#666', marginBottom: '1.5rem' }}>Explore over 60+ Pokémon plushies, cards, figures, and apparel in our marketplace.</p>
                  <Link href="/shop" className="btn-pill" style={{ textDecoration: 'none' }}>Browse Pokémon Marketplace →</Link>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Unit Price</th>
                      <th>Quantity</th>
                      <th>Item Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => {
                      const p = item.product;
                      if (!p) return null;
                      const itemTotal = p.price * item.quantity;
                      return (
                        <tr key={p.id}>
                          <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={p.image} style={{ width: '50px', height: '50px', objectFit: 'contain', background: '#FFFFFF', borderRadius: '6px', border: '1px solid #000', position: 'relative', zIndex: 2 }} alt={p.name} />
                            <div>
                              <Link href={`/product/${p.id}`} style={{ fontFamily: 'var(--font-title)', fontWeight: 900, fontSize: '0.95rem', color: '#000', textDecoration: 'none' }}>
                                {p.name}
                              </Link>
                              <div style={{ fontSize: '0.75rem', color: '#666' }}>SKU: {p.sku || p.id}</div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 700 }}>{p.categoryName}</td>
                          <td style={{ fontWeight: 700 }}>${p.price.toFixed(2)}</td>
                          <td>
                            <div className="qty-control-box">
                              <button className="btn-qty" onClick={() => updateCartQty(p.id, item.quantity - 1)}>-</button>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', padding: '0 6px' }}>{item.quantity}</span>
                              <button className="btn-qty" onClick={() => updateCartQty(p.id, item.quantity + 1)}>+</button>
                            </div>
                          </td>
                          <td style={{ fontWeight: 900, color: 'var(--accent-red)' }}>${itemTotal.toFixed(2)}</td>
                          <td>
                            <button className="btn-inspect" onClick={() => removeFromCart(p.id)} style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--accent-red)' }}>
                              ✕ Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* RIGHT: ORDER SUMMARY & PROMO CODES */}
          <aside className="cart-summary-sidebar">
            <div className="cart-summary-box">
              <h3 className="summary-title">ORDER SUMMARY</h3>

              <div className="summary-row">
                <span>Items Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              {discountAmount > 0 ? (
                <div className="summary-row" style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                  <span>Discount Applied ({appliedPromo.code}):</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              ) : null}

              {/* Vault Insurance Option */}
              <div className="summary-insurance-box">
                <label className="filter-checkbox-label" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={insuranceEnabled}
                    onChange={(e) => setInsuranceEnabled(e.target.checked)}
                  />
                  <span>⚡ Vault Insured Express Shipping (+$9.99)</span>
                </label>
                <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px', marginLeft: '24px' }}>
                  Full loss &amp; damage protection with armored bubble wrapping.
                </p>
              </div>

              <div className="summary-row" style={{ marginTop: '1rem' }}>
                <span>Vault Shipping:</span>
                <span>{insuranceEnabled ? '$9.99' : 'FREE'}</span>
              </div>

              <div className="summary-total-row">
                <span>ESTIMATED TOTAL:</span>
                <span>${total.toFixed(2)}</span>
              </div>

              {/* PROMO CODE FORM */}
              <div className="cart-promo-form-box" style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  PROMO / DISPATCH CODE
                </label>
                <form onSubmit={handlePromoSubmit} style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Try POKEVAULT10"
                    style={{ flex: 1, padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', border: '2px solid #000', textTransform: 'uppercase' }}
                  />
                  <button type="submit" className="btn-inspect">Apply</button>
                </form>
                {promoStatus.message ? (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginTop: '6px', fontWeight: 700, color: promoStatus.success ? '#166534' : 'var(--accent-red)' }}>
                    {promoStatus.message}
                  </div>
                ) : null}
              </div>

              {cart.length > 0 ? (
                <Link href="/checkout" className="btn-pill" style={{ width: '100%', textAlign: 'center', display: 'block', textDecoration: 'none', marginTop: '1.5rem', fontSize: '1.1rem', padding: '14px' }}>
                  Proceed to Checkout &amp; Dispatch →
                </Link>
              ) : null}

              <Link href="/shop" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#000', fontWeight: 700 }}>
                ← Continue Shopping Marketplace
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
