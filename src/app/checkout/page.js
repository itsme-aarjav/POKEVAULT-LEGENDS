'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '../../context/StoreContext';

export default function CheckoutPage() {
  const { cart, subtotal, discountAmount, shippingCost, total, appliedPromo, clearCart } = useStore();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: 'Red Ketchum',
    email: 'trainer@pokevault.com',
    street: '102 Pallet Town Way, Suite 4B',
    city: 'Celadon City',
    state: 'Kanto',
    zip: '90210',
    ccNumber: '',
    ccExpiry: '',
    ccCvc: ''
  });

  const handleOrderSubmission = async (paymentMethod = 'Vault Card') => {
    const orderPayload = {
      customerName: formData.name,
      customerEmail: formData.email,
      shippingAddress: `${formData.street}, ${formData.city}, ${formData.state} ${formData.zip}`,
      items: cart.map(i => ({ id: i.product?.id || i.id, name: i.product?.name, price: i.product?.price, qty: i.quantity })),
      promoCode: appliedPromo.code,
      discountAmount,
      insuranceIncluded: shippingCost > 0,
      insuranceCost: shippingCost,
      paymentMethod
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();

      const orderId = data.orderId || `ORD-${Date.now()}`;
      clearCart();
      router.push(`/order-confirmation/${orderId}`);
    } catch (err) {
      const localId = `ORD-${Date.now()}`;
      localStorage.setItem(`pvOrder_${localId}`, JSON.stringify({ ...orderPayload, orderId: localId, totalAmount: total, createdAt: new Date().toISOString() }));
      clearCart();
      router.push(`/order-confirmation/${localId}`);
    }
  };

  const handleDirectPaySubmit = (e) => {
    e.preventDefault();
    handleOrderSubmission('Vault Credit Card');
  };

  return (
    <main>
      {/* CHECKOUT HERO BANNER */}
      <header className="page-hero-banner" style={{ background: 'linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)' }}>
        <div className="page-hero-container">
          <div className="breadcrumb-nav">
            <Link href="/" style={{ color: '#000' }}>Home</Link> <span>/</span> <Link href="/cart" style={{ color: '#000' }}>Cart</Link> <span>/</span> <span className="current" style={{ color: '#000' }}>Vault Checkout</span>
          </div>
          <h1 className="page-title" style={{ color: '#000' }}>VAULT DISPATCH CHECKOUT</h1>
          <p className="page-subtitle" style={{ color: '#111' }}>Enter shipping destination details and select payment method to finalize your order.</p>
        </div>
      </header>

      {/* CHECKOUT MAIN LAYOUT */}
      <div className="page-container" style={{ padding: '3rem 2rem 6rem' }}>
        <div className="checkout-page-layout">
          {/* LEFT: FORM */}
          <div className="checkout-form-section">
            <form onSubmit={handleDirectPaySubmit}>
              {/* STEP 1: SHIPPING */}
              <div className="table-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 className="summary-title" style={{ marginTop: 0 }}>1. SHIPPING DESTINATION</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="admin-form-group">
                    <label>FULL NAME *</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>EMAIL ADDRESS *</label>
                    <input
                      type="email"
                      className="admin-form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>STREET ADDRESS *</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                  <div className="admin-form-group">
                    <label>CITY *</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>STATE *</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>ZIP *</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* STEP 2: PAYMENT METHOD */}
              <div className="table-card" style={{ padding: '1.5rem' }}>
                <h3 className="summary-title" style={{ marginTop: 0 }}>2. PAYMENT METHOD</h3>

                <button type="submit" className="btn-pill" style={{ width: '100%', fontSize: '1.1rem', padding: '14px' }}>
                  ⚡ Complete Vault Dispatch Order (${total.toFixed(2)}) →
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT: SUMMARY */}
          <aside className="checkout-summary-sidebar">
            <div className="cart-summary-box">
              <h3 className="summary-title">FINAL ORDER SUMMARY</h3>

              <div style={{ marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {cart.map(item => {
                  const p = item.product;
                  if (!p) return null;
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px dashed #DDD' }}>
                      <img src={p.image} style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#FFFFFF', borderRadius: '4px', border: '1px solid #000', position: 'relative', zIndex: 2 }} alt={p.name} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', lineHeight: 1.2 }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#666' }}>Qty: {item.quantity} × ${p.price.toFixed(2)}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '0.85rem', color: 'var(--accent-red)' }}>
                        ${(p.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="summary-row">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              {discountAmount > 0 ? (
                <div className="summary-row" style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                  <span>Discount:</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              ) : null}

              <div className="summary-row">
                <span>Shipping:</span>
                <span>${shippingCost.toFixed(2)}</span>
              </div>

              <div className="summary-total-row">
                <span>TOTAL TO PAY:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
