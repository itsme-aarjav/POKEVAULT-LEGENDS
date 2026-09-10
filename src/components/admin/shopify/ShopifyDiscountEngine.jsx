import React, { useState, useEffect } from 'react';
import { getDiscounts, saveDiscounts } from '../../../lib/api.js';

/**
 * MODULE 4: Promotions & Coupon Engine (Shopify Polaris-Grade)
 * Manages active store promo codes with live persistence.
 */
export default function ShopifyDiscountEngine({ orders = [] }) {
  const [discounts, setDiscounts] = useState([]);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create'
  const [feedback, setFeedback] = useState(null);

  // Form State
  const [formState, setFormState] = useState({
    code: '',
    type: 'percentage', // 'percentage' | 'fixed_amount' | 'free_shipping'
    value: 15,
    summary: '',
    minRequirement: 0,
    startsAt: '2026-01-01',
    endsAt: '2027-12-31'
  });

  useEffect(() => {
    const loaded = getDiscounts();
    setDiscounts(loaded);
  }, []);

  const showFeedback = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const generateRandomCode = () => {
    const prefixes = ['VAULT', 'POKE', 'LEGEND', 'SUMMER', 'MASTER', 'VIP'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setFormState({ ...formState, code: `${prefix}${num}` });
  };

  const handleSaveDiscount = () => {
    const code = formState.code.trim().toUpperCase();
    if (!code) {
      alert('Please enter or generate a discount code.');
      return;
    }

    let summary = '';
    if (formState.type === 'percentage') {
      summary = `${formState.value}% off entire order`;
    } else if (formState.type === 'fixed_amount') {
      summary = `$${formState.value} off entire order`;
    } else if (formState.type === 'free_shipping') {
      summary = `Free Vault Armored Courier Shipping`;
    }

    const newDiscount = {
      id: `d_${Date.now()}`,
      code,
      type: formState.type,
      value: Number(formState.value) || 0,
      summary,
      appliesTo: 'entire_store',
      minRequirement: { type: 'minimum_amount', value: Number(formState.minRequirement) || 0 },
      customerEligibility: 'all',
      totalUses: 0,
      maxUses: 1000,
      startsAt: formState.startsAt || '2026-01-01',
      endsAt: formState.endsAt || '2027-12-31',
      status: 'Active'
    };

    const updated = [newDiscount, ...discounts.filter(d => d.code !== code)];
    setDiscounts(updated);
    saveDiscounts(updated);
    showFeedback(`Promo code "${code}" created and activated!`);
    setActiveTab('list');
  };

  const handleToggleStatus = (id) => {
    const updated = discounts.map(d => {
      if (d.id === id) {
        const nextStatus = d.status === 'Active' ? 'Disabled' : 'Active';
        return { ...d, status: nextStatus };
      }
      return d;
    });
    setDiscounts(updated);
    saveDiscounts(updated);
  };

  const handleDeleteDiscount = (id) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;
    const updated = discounts.filter(d => d.id !== id);
    setDiscounts(updated);
    saveDiscounts(updated);
    showFeedback('Promotion deleted.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#F8FAFC' }}>
      
      {/* Toast Alert */}
      {feedback && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: feedback.type === 'error' ? '#EF4444' : '#10B981',
          color: '#FFF',
          padding: '12px 20px',
          borderRadius: '8px',
          fontWeight: 800,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{feedback.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>
            {activeTab === 'list' ? 'Promotions & Promo Codes' : 'Create New Promotion'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
            {activeTab === 'list' ? 'Manage active coupon codes used during checkout & cart' : 'Configure percentage discounts, fixed savings, or free shipping'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'create' && (
            <button
              onClick={() => setActiveTab('list')}
              style={{ background: '#334155', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
            >
              ← Back to Promotions
            </button>
          )}

          {activeTab === 'list' ? (
            <button
              onClick={() => setActiveTab('create')}
              style={{ background: '#3B82F6', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>+</span> Create Discount
            </button>
          ) : (
            <button
              onClick={handleSaveDiscount}
              style={{ background: '#10B981', color: '#FFF', border: 'none', padding: '8px 20px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
            >
              💾 Save Promotion
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: DISCOUNT LIST TABLE */}
      {activeTab === 'list' && (
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#0F172A', borderBottom: '1px solid #334155', color: '#94A3B8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px' }}>Promo Code</th>
                <th style={{ padding: '12px 16px' }}>Type & Details</th>
                <th style={{ padding: '12px 16px' }}>Min Purchase</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid rgba(71,85,105,0.4)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)', padding: '4px 10px', borderRadius: '6px', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.9rem' }}>
                      {d.code}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <strong style={{ color: '#FFF', display: 'block' }}>{d.summary}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{d.type.replace('_', ' ').toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>
                    {d.minRequirement?.value > 0 ? `$${d.minRequirement.value}` : 'No minimum'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => handleToggleStatus(d.id)}
                      style={{
                        background: d.status === 'Active' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: d.status === 'Active' ? '#34D399' : '#F87171',
                        border: '1px solid currentColor',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {d.status === 'Active' ? '● Active' : '○ Disabled'}
                    </button>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDeleteDiscount(d.id)}
                      style={{ background: 'transparent', color: '#F87171', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 2: DISCOUNT BUILDER */}
      {activeTab === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Promo Code Input */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>Discount Promo Code</label>
                <button
                  type="button"
                  onClick={generateRandomCode}
                  style={{ background: '#0F172A', border: '1px solid #334155', color: '#38BDF8', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ⚡ Generate Random Code
                </button>
              </div>

              <input
                type="text"
                placeholder="e.g. SUMMERVAULT20"
                value={formState.code}
                onChange={(e) => setFormState({ ...formState, code: e.target.value.toUpperCase() })}
                style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '10px 14px', color: '#60A5FA', fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', outline: 'none' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Customers will enter this code at checkout to claim their discount.</p>
            </div>

            {/* Discount Type Selector */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>Discount Type</label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                {[
                  { id: 'percentage', title: 'Percentage Off', desc: '% discount on products' },
                  { id: 'fixed_amount', title: 'Fixed Amount Off', desc: 'Fixed $ off subtotal' },
                  { id: 'free_shipping', title: 'Free Shipping', desc: 'Free courier delivery' }
                ].map(t => (
                  <div
                    key={t.id}
                    onClick={() => setFormState({ ...formState, type: t.id })}
                    style={{
                      background: formState.type === t.id ? '#0F172A' : '#1E293B',
                      border: formState.type === t.id ? '2px solid #3B82F6' : '1px solid #334155',
                      padding: '12px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>{t.title}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>{t.desc}</div>
                  </div>
                ))}
              </div>

              {/* Value Input */}
              {formState.type === 'percentage' && (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Discount Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formState.value}
                    onChange={(e) => setFormState({ ...formState, value: parseFloat(e.target.value) || 0 })}
                    style={{ width: '120px', background: '#0F172A', border: '1px solid #334155', color: '#34D399', fontWeight: 800, padding: '8px 12px', borderRadius: '6px' }}
                  />
                </div>
              )}

              {formState.type === 'fixed_amount' && (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Discount Amount ($ USD)</label>
                  <input
                    type="number"
                    min="1"
                    value={formState.value}
                    onChange={(e) => setFormState({ ...formState, value: parseFloat(e.target.value) || 0 })}
                    style={{ width: '120px', background: '#0F172A', border: '1px solid #334155', color: '#34D399', fontWeight: 800, padding: '8px 12px', borderRadius: '6px' }}
                  />
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Minimum Requirements & Action */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFF' }}>⚙️ Rules & Thresholds</h3>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Minimum Purchase Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  value={formState.minRequirement}
                  onChange={(e) => setFormState({ ...formState, minRequirement: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#FFF', padding: '8px 12px', borderRadius: '6px' }}
                />
              </div>

              <button
                onClick={handleSaveDiscount}
                style={{ width: '100%', background: '#10B981', color: '#FFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', marginTop: '10px' }}
              >
                💾 Save & Activate Code
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
