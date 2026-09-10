import React, { useState } from 'react';
import { CATEGORIES_DATA } from '../../../data/categories.js';

/**
 * MODULE 4: Promotions & Coupon Engine (Shopify Polaris Grade)
 * Configures Percentage, Fixed Amount, Free Shipping, and BXGY discounts
 * with Collection/Product targeting, Minimum Cart rules, Customer Segments, and Usage limits.
 */

export default function ShopifyDiscountEngine() {
  const [discounts, setDiscounts] = useState([
    {
      id: 'd1',
      code: 'POKEVAULT10',
      type: 'percentage',
      value: 10,
      summary: '10% off entire order &bull; Min purchase $50 &bull; All customers',
      appliesTo: 'entire_store',
      minRequirement: { type: 'minimum_amount', value: 50 },
      customerEligibility: 'all',
      totalUses: 342,
      maxUses: 1000,
      startsAt: '2026-01-01',
      endsAt: '2027-12-31',
      status: 'Active'
    },
    {
      id: 'd2',
      code: 'FREESHIP100',
      type: 'free_shipping',
      value: 0,
      summary: 'Free Vault Armored Courier Shipping &bull; Min purchase $100',
      appliesTo: 'entire_store',
      minRequirement: { type: 'minimum_amount', value: 100 },
      customerEligibility: 'all',
      totalUses: 189,
      maxUses: 500,
      startsAt: '2026-01-01',
      endsAt: '2027-12-31',
      status: 'Active'
    },
    {
      id: 'd3',
      code: 'CHARIZARD20',
      type: 'percentage',
      value: 20,
      summary: '20% off Trading Cards & Graded Slabs collection',
      appliesTo: 'specific_collections',
      targetCollection: 'trading-cards',
      minRequirement: { type: 'none', value: 0 },
      customerEligibility: 'specific_segments',
      segment: 'VIP Master Collectors',
      totalUses: 78,
      maxUses: 200,
      startsAt: '2026-02-01',
      endsAt: '2026-12-31',
      status: 'Active'
    },
    {
      id: 'd4',
      code: 'BUY2GET1BOOSTER',
      type: 'bxgy',
      value: 50,
      summary: 'Buy 2 Graded Cards, Get 1 Vintage Booster Pack at 50% Off',
      appliesTo: 'specific_collections',
      targetCollection: 'trading-cards',
      bxgy: { buyQty: 2, getQty: 1, getDiscount: 50 },
      minRequirement: { type: 'minimum_quantity', value: 2 },
      customerEligibility: 'all',
      totalUses: 45,
      maxUses: 100,
      startsAt: '2026-03-01',
      endsAt: '2026-10-31',
      status: 'Active'
    }
  ]);

  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create'
  
  // Create Coupon Form State
  const [formState, setFormState] = useState({
    code: '',
    type: 'percentage', // 'percentage' | 'fixed_amount' | 'free_shipping' | 'bxgy'
    value: 15,
    appliesTo: 'entire_store', // 'entire_store' | 'specific_collections' | 'specific_products'
    targetCollection: 'trading-cards',
    minType: 'none', // 'none' | 'minimum_amount' | 'minimum_quantity'
    minValue: 50,
    customerEligibility: 'all', // 'all' | 'specific_segments' | 'specific_customers'
    segment: 'VIP Master Collectors',
    limitTotalUses: true,
    maxUses: 250,
    limitOncePerCustomer: true,
    startsAt: '2026-08-19',
    hasEndDate: true,
    endsAt: '2026-12-31',
    bxgyBuyQty: 2,
    bxgyGetQty: 1,
    bxgyDiscount: 50
  });

  const generateRandomCode = () => {
    const prefixes = ['VAULT', 'POKE', 'LEGEND', 'SUMMER', 'MASTER'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setFormState({ ...formState, code: `${prefix}${num}` });
  };

  const handleSaveDiscount = () => {
    if (!formState.code) {
      alert('Please enter or generate a coupon code.');
      return;
    }

    let summary = '';
    if (formState.type === 'percentage') summary = `${formState.value}% off ${formState.appliesTo.replace('_', ' ')}`;
    else if (formState.type === 'fixed_amount') summary = `$${formState.value} off ${formState.appliesTo.replace('_', ' ')}`;
    else if (formState.type === 'free_shipping') summary = `Free Vault Armored Courier Shipping`;
    else if (formState.type === 'bxgy') summary = `Buy ${formState.bxgyBuyQty}, Get ${formState.bxgyGetQty} at ${formState.bxgyDiscount}% off`;

    const newDiscount = {
      id: `d_${Date.now()}`,
      code: formState.code.toUpperCase(),
      type: formState.type,
      value: formState.value,
      summary,
      appliesTo: formState.appliesTo,
      targetCollection: formState.targetCollection,
      minRequirement: { type: formState.minType, value: formState.minValue },
      customerEligibility: formState.customerEligibility,
      segment: formState.segment,
      totalUses: 0,
      maxUses: formState.limitTotalUses ? formState.maxUses : 9999,
      startsAt: formState.startsAt,
      endsAt: formState.hasEndDate ? formState.endsAt : 'Never',
      status: 'Active'
    };

    setDiscounts([newDiscount, ...discounts]);
    setActiveTab('list');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#F8FAFC' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>
            {activeTab === 'list' ? 'Promotions, Discounts & Coupons' : 'Create New Promotion'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
            {activeTab === 'list' ? 'Manage Percentage discounts, Free Shipping rules, BXGY promotions & usage lifespans' : 'Polaris discount rule builder with customer segment eligibility'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'create' && (
            <button
              onClick={() => setActiveTab('list')}
              style={{ background: '#334155', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
            >
              ← Back to Discounts
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
                <th style={{ padding: '12px 16px' }}>Discount Code</th>
                <th style={{ padding: '12px 16px' }}>Type & Details</th>
                <th style={{ padding: '12px 16px' }}>Redemptions</th>
                <th style={{ padding: '12px 16px' }}>Validity</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
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
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Eligibility: {d.customerEligibility === 'all' ? 'Everyone' : d.segment}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>
                    <strong>{d.totalUses}</strong> / {d.maxUses} used
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: '#94A3B8' }}>
                    {d.startsAt} &rarr; {d.endsAt}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399', fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '12px' }}>{d.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 2: SHOPIFY POLARIS DISCOUNT BUILDER */}
      {activeTab === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          
          {/* Left Column: Code, Type, Value, Minimums */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Coupon Code Input */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>Discount Code</label>
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
              <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Customers will enter this code at checkout to claim their promotion.</p>
            </div>

            {/* Discount Type Selector */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>Discount Type</label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                {[
                  { id: 'percentage', title: 'Percentage Off', desc: '% discount on products' },
                  { id: 'fixed_amount', title: 'Fixed Amount Off', desc: 'Fixed $ off subtotal' },
                  { id: 'free_shipping', title: 'Free Shipping', desc: 'Free courier delivery' },
                  { id: 'bxgy', title: 'Buy X Get Y (BXGY)', desc: 'Bundle quantity deal' }
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

              {/* Dynamic Value Input */}
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
                    value={formState.value}
                    onChange={(e) => setFormState({ ...formState, value: parseFloat(e.target.value) || 0 })}
                    style={{ width: '120px', background: '#0F172A', border: '1px solid #334155', color: '#34D399', fontWeight: 800, padding: '8px 12px', borderRadius: '6px' }}
                  />
                </div>
              )}

              {formState.type === 'bxgy' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px' }}>Customer Buys (Qty)</label>
                    <input
                      type="number"
                      value={formState.bxgyBuyQty}
                      onChange={(e) => setFormState({ ...formState, bxgyBuyQty: parseInt(e.target.value, 10) || 1 })}
                      style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#FFF', padding: '6px 10px', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px' }}>Customer Gets (Qty)</label>
                    <input
                      type="number"
                      value={formState.bxgyGetQty}
                      onChange={(e) => setFormState({ ...formState, bxgyGetQty: parseInt(e.target.value, 10) || 1 })}
                      style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#FFF', padding: '6px 10px', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px' }}>At Discount (%)</label>
                    <input
                      type="number"
                      value={formState.bxgyDiscount}
                      onChange={(e) => setFormState({ ...formState, bxgyDiscount: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#34D399', fontWeight: 800, padding: '6px 10px', borderRadius: '6px' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Applies To & Minimum Requirements */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF' }}>Applies To</label>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#E2E8F0', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="appliesTo"
                    checked={formState.appliesTo === 'entire_store'}
                    onChange={() => setFormState({ ...formState, appliesTo: 'entire_store' })}
                  />
                  Entire Store
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#E2E8F0', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="appliesTo"
                    checked={formState.appliesTo === 'specific_collections'}
                    onChange={() => setFormState({ ...formState, appliesTo: 'specific_collections' })}
                  />
                  Specific Collections
                </label>
              </div>

              {formState.appliesTo === 'specific_collections' && (
                <select
                  value={formState.targetCollection}
                  onChange={(e) => setFormState({ ...formState, targetCollection: e.target.value })}
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#FFF', padding: '8px 12px', borderRadius: '6px' }}
                >
                  {CATEGORIES_DATA.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

          </div>

          {/* Right Column: Customer Eligibility, Usage Limits & Active Dates */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Customer Eligibility */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFF' }}>👥 Customer Eligibility</h3>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#E2E8F0', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="eligibility"
                  checked={formState.customerEligibility === 'all'}
                  onChange={() => setFormState({ ...formState, customerEligibility: 'all' })}
                />
                All Customers
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#E2E8F0', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="eligibility"
                  checked={formState.customerEligibility === 'specific_segments'}
                  onChange={() => setFormState({ ...formState, customerEligibility: 'specific_segments' })}
                />
                Specific Customer Segments
              </label>

              {formState.customerEligibility === 'specific_segments' && (
                <select
                  value={formState.segment}
                  onChange={(e) => setFormState({ ...formState, segment: e.target.value })}
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#FFF', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem' }}
                >
                  <option value="VIP Master Collectors">VIP Master Collectors (Spend &gt; $5k)</option>
                  <option value="First-Time Buyers">First-Time Store Buyers</option>
                  <option value="HypeDrop Early Access List">HypeDrop Early Access List</option>
                </select>
              )}
            </div>

            {/* Usage Limits */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFF' }}>⚙️ Usage Limits</h3>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#E2E8F0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formState.limitTotalUses}
                  onChange={(e) => setFormState({ ...formState, limitTotalUses: e.target.checked })}
                />
                Limit number of times this code can be used
              </label>

              {formState.limitTotalUses && (
                <input
                  type="number"
                  value={formState.maxUses}
                  onChange={(e) => setFormState({ ...formState, maxUses: parseInt(e.target.value, 10) || 100 })}
                  style={{ width: '100px', background: '#0F172A', border: '1px solid #334155', color: '#FFF', padding: '6px 10px', borderRadius: '6px' }}
                />
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#E2E8F0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formState.limitOncePerCustomer}
                  onChange={(e) => setFormState({ ...formState, limitOncePerCustomer: e.target.checked })}
                />
                Limit to one use per customer
              </label>
            </div>

            {/* Active Dates */}
            <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFF' }}>📅 Active Date Range</h3>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px' }}>Start Date</label>
                <input
                  type="date"
                  value={formState.startsAt}
                  onChange={(e) => setFormState({ ...formState, startsAt: e.target.value })}
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#FFF', padding: '6px 10px', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px' }}>End Date</label>
                <input
                  type="date"
                  value={formState.endsAt}
                  onChange={(e) => setFormState({ ...formState, endsAt: e.target.value })}
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#FFF', padding: '6px 10px', borderRadius: '6px' }}
                />
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
