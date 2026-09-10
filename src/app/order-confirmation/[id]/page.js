'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

export default function OrderConfirmationPage({ params }) {
  const orderId = params.id || `ORD-${Date.now()}`;
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 } });

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setOrderData(data.data);
          return;
        }
      } catch (e) {
        console.warn('API fetch offline, checking local order store:', e);
      }

      const stored = localStorage.getItem(`pvOrder_${orderId}`);
      if (stored) {
        setOrderData(JSON.parse(stored));
      } else {
        setOrderData({
          customerName: 'Vault Trainer',
          customerEmail: 'trainer@pokevault.com',
          shippingAddress: '102 Pallet Town Way, Kanto 90210',
          trackingNumber: `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
          subtotal: 149.99,
          insuranceCost: 9.99,
          totalAmount: 159.98,
          items: [{ name: 'Master Vault XL Mystery Chest', quantity: 1, price: 149.99 }]
        });
      }
    }

    fetchOrder();
  }, [orderId]);

  if (!orderData) {
    return <div style={{ textAlign: 'center', padding: '5rem', fontFamily: 'var(--font-mono)' }}>Loading receipt...</div>;
  }

  const items = orderData.items || orderData.order_items || [];

  return (
    <main>
      {/* CONFIRMATION HERO */}
      <header className="page-hero-banner" style={{ background: 'linear-gradient(135deg, #DCFCE7 0%, #166534 100%)', color: '#FFF' }}>
        <div className="page-hero-container">
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
          <h1 className="page-title" style={{ color: '#FFF' }}>ORDER CONFIRMED &amp; DISPATCHED!</h1>
          <p className="page-subtitle" style={{ color: '#DCFCE7' }}>Thank you for your order! Your Vault items have been logged for armored courier dispatch.</p>
        </div>
      </header>

      {/* RECEIPT MAIN CONTENT */}
      <div className="page-container" style={{ padding: '3rem 2rem 6rem', maxWidth: '800px', margin: '0 auto' }}>
        <div className="table-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#666' }}>ORDER RECEIPT NUMBER</div>
              <div style={{ fontFamily: 'var(--font-title)', fontWeight: 900, fontSize: '1.4rem', color: 'var(--accent-red)' }}>{orderId}</div>
            </div>
            <button className="btn-inspect" onClick={() => window.print()} style={{ padding: '8px 16px' }}>🖨️ Print Receipt</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            <div>
              <strong>CUSTOMER DETAILS:</strong>
              <div>{orderData.customerName || orderData.customer_name || 'Vault Collector'}</div>
              <div>{orderData.customerEmail || orderData.customer_email || 'collector@pokevault.com'}</div>
            </div>
            <div>
              <strong>SHIPPING DESTINATION:</strong>
              <div>{orderData.shippingAddress || orderData.shipping_address || 'Pallet Town, Kanto'}</div>
              <div style={{ color: '#166534', fontWeight: 700, marginTop: '4px' }}>
                Tracking: {orderData.trackingNumber || orderData.tracking_number || 'TRK-90123847'}
              </div>
            </div>
          </div>

          <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '1rem' }}>ITEMS IN DISPATCH PACKAGE</h4>

          <div style={{ marginBottom: '1.5rem' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #EEE', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                <div>
                  <strong style={{ color: '#000' }}>{item.card_name || item.name || 'Pokémon Collector Product'}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>Quantity: {item.quantity || 1} × ${(Number(item.unit_price || item.price || 0)).toFixed(2)}</div>
                </div>
                <div style={{ fontWeight: 900, color: 'var(--accent-red)' }}>
                  ${(Number(item.unit_price || item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px solid #000', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span>${Number(orderData.subtotal || 149.99).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', fontWeight: 700 }}>
              <span>Vault Insured Shipping:</span>
              <span>${Number(orderData.insuranceCost || orderData.insurance_cost || 9.99).toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-title)', fontWeight: 900, fontSize: '1.3rem', marginTop: '8px', borderTop: '2px dashed #000', paddingTop: '8px' }}>
              <span>TOTAL PAID:</span>
              <span>${Number(orderData.totalAmount || orderData.total_amount || 159.98).toFixed(2)}</span>
            </div>
          </div>

          <div style={{ marginTop: '2.5rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/shop" className="btn-pill" style={{ textDecoration: 'none', padding: '12px 24px' }}>Shop More Pokémon Merch →</Link>
            <Link href="/" className="btn-inspect" style={{ textDecoration: 'none', padding: '12px 24px' }}>Return to Homepage</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
