'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useStore } from '../context/StoreContext';

export default function CartDrawer({ isOpen, onClose }) {
  const { cart, updateCartQty, removeFromCart, subtotal, discountAmount, applyPromoCode } = useStore();
  const [promoInput, setPromoInput] = useState('');
  const [promoStatus, setPromoStatus] = useState({ message: '', success: false });

  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePromoSubmit = (e) => {
    e.preventDefault();
    const res = applyPromoCode(promoInput);
    setPromoStatus({ message: res.message, success: res.success });
  };

  return (
    <>
      <div className={`cart-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <div className={`cart-drawer ${isOpen ? 'open' : ''}`} id="cartDrawer">
        <div class="cart-header">
          <div class="cart-title">YOUR VAULT CART ({totalCartUnits})</div>
          <button class="cart-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div class="cart-items" id="cartItemsContainer">
          {cart.length === 0 ? (
            <div class="cart-empty-msg">YOUR VAULT IS EMPTY. ADD SOME LEGENDS!</div>
          ) : (
            cart.map(item => {
              const p = item.product;
              if (!p) return null;
              return (
                <div class="cart-item-row" key={p.id}>
                  <img src={p.image} class="cart-item-thumb" alt={p.name} />
                  <div class="cart-item-details">
                    <div class="cart-item-title">{p.name}</div>
                    <div class="cart-item-meta">{p.categoryName}</div>
                    <div class="cart-item-price">${(p.price * item.quantity).toFixed(2)}</div>
                    <div class="cart-qty-row" style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button class="btn-qty" onClick={() => updateCartQty(p.id, item.quantity - 1)}>-</button>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem' }}>{item.quantity}</span>
                      <button class="btn-qty" onClick={() => updateCartQty(p.id, item.quantity + 1)}>+</button>
                      <button
                        className="cart-item-remove"
                        onClick={() => removeFromCart(p.id)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PROMO CODE SECTION */}
        <div class="cart-promo-box" style={{ padding: '0.75rem 1rem', borderTop: '2px dashed #000', background: '#FFFDE7' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>PROMO CODE</div>
          <form onSubmit={handlePromoSubmit} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="e.g. POKEVAULT10"
              style={{ flex: 1, padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', border: '2px solid #000', textTransform: 'uppercase' }}
            />
            <button type="submit" class="btn-inspect" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Apply</button>
          </form>
          {promoStatus.message ? (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 700, color: promoStatus.success ? '#166534' : 'var(--accent-red)' }}>
              {promoStatus.message}
            </div>
          ) : null}
        </div>

        <div class="cart-footer">
          <div class="cart-subtotal-row" style={{ marginTop: '0.5rem' }}>
            <span>SUBTOTAL:</span>
            <span>${(subtotal - discountAmount).toFixed(2)}</span>
          </div>
          {discountAmount > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-red)', marginBottom: '0.5rem', fontWeight: 700 }}>
              <span>DISCOUNT:</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          ) : null}
          <Link
            href="/checkout"
            className="btn-pill"
            onClick={onClose}
            style={{ width: '100%', textAlign: 'center', display: 'block', textDecoration: 'none', boxSizing: 'border-box' }}
          >
            Proceed to Checkout &amp; Dispatch →
          </Link>
          <Link
            href="/cart"
            onClick={onClose}
            style={{ display: 'block', textAlign: 'center', marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#000', fontWeight: 700 }}
          >
            View Full Shopping Cart Page
          </Link>
        </div>
      </div>
    </>
  );
}
