import React, { useState, useMemo } from 'react';
import { ALL_PRODUCTS } from '../../../data/products.js';

/**
 * MODULE 3: Manual Order Creation (Draft Orders Engine - Shopify Polaris Grade)
 * Allows merchants to search/create customers, pick catalog items with live stock,
 * add custom line items, apply order/line discounts, configure shipping/tax, and create orders.
 */

export default function ShopifyDraftOrderCreator({ onOrderCreated }) {
  // Existing Customer Directory
  const [customers, setCustomers] = useState([
    { id: 'c1', name: 'Red Trainer', email: 'red@kanto.org', phone: '+1 555-0199', address: '777 Pallet Town Way, Kanto 90210, USA' },
    { id: 'c2', name: 'Blue Oak', email: 'blue@viridian.com', phone: '+1 555-0248', address: '12 Champion Blvd, Viridian City 90211, USA' },
    { id: 'c3', name: 'Cynthia Shinnoh', email: 'cynthia@undella.net', phone: '+1 555-0371', address: '88 Villa Way, Undella Town 90212, USA' },
    { id: 'c4', name: 'Ash Ketchum', email: 'ash@pallet.org', phone: '+1 555-0101', address: '10 Ketchum Rd, Pallet Town 90210, USA' }
  ]);

  const [selectedCustomer, setSelectedCustomer] = useState(customers[0]);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', email: '', phone: '', address: '' });

  // Line Items in Draft
  const [lineItems, setLineItems] = useState([
    {
      id: 'li_1',
      productId: 'charizard-base-1st',
      title: '1st Edition Shadowless Charizard Holo #4 PSA 10',
      price: 19500.00,
      quantity: 1,
      thumbnail: '/assets/charizard.png',
      isCustomItem: false,
      taxable: true,
      stockAvailable: 2
    },
    {
      id: 'li_2',
      productId: 'bag-loungefly-charizard-mini-backpack',
      title: 'Loungefly Charizard Metallic Wings Mini Backpack',
      price: 88.00,
      quantity: 2,
      thumbnail: '/assets/bag_charizard_backpack.png',
      isCustomItem: false,
      taxable: true,
      stockAvailable: 15
    }
  ]);

  // Catalog Item Picker Search State
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);

  // Custom Item Modal State
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({ title: '', price: 50.00, quantity: 1, taxable: true });

  // Discount Configuration
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' | 'fixed'
  const [discountValue, setDiscountValue] = useState(10); // 10%

  // Shipping Method
  const [shippingMethod, setShippingMethod] = useState({ name: 'Vault Armored Courier', price: 45.00 });
  const [isTaxEnabled, setIsTaxEnabled] = useState(true);
  const [notes, setNotes] = useState('Special collector packaging requested. Double bubble wrap slab.');

  // Financial Calculations
  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [lineItems]);

  const discountTotal = useMemo(() => {
    if (discountType === 'percentage') {
      return (subtotal * (discountValue / 100));
    }
    return Math.min(subtotal, discountValue);
  }, [subtotal, discountType, discountValue]);

  const taxableSubtotal = Math.max(0, subtotal - discountTotal);
  const taxRate = 0.0825; // 8.25%
  const taxTotal = isTaxEnabled ? taxableSubtotal * taxRate : 0;
  const grandTotal = taxableSubtotal + taxTotal + (shippingMethod.price || 0);

  // Actions
  const handleAddCatalogItem = (prod) => {
    const existing = lineItems.find(item => item.productId === prod.id);
    if (existing) {
      setLineItems(lineItems.map(item => item.productId === prod.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setLineItems([...lineItems, {
        id: `li_${Date.now()}`,
        productId: prod.id,
        title: prod.name,
        price: prod.price,
        quantity: 1,
        thumbnail: prod.image,
        isCustomItem: false,
        taxable: true,
        stockAvailable: prod.inStock || 5
      }]);
    }
    setIsItemPickerOpen(false);
  };

  const handleAddCustomItem = () => {
    if (!customItemForm.title) return;
    setLineItems([...lineItems, {
      id: `li_custom_${Date.now()}`,
      title: customItemForm.title,
      price: parseFloat(customItemForm.price) || 0,
      quantity: parseInt(customItemForm.quantity, 10) || 1,
      thumbnail: '/assets/charizard.png',
      isCustomItem: true,
      taxable: customItemForm.taxable,
      stockAvailable: 99
    }]);
    setIsCustomItemModalOpen(false);
    setCustomItemForm({ title: '', price: 50.00, quantity: 1, taxable: true });
  };

  const handleCreateCustomer = () => {
    if (!newCustomerForm.name || !newCustomerForm.email) return;
    const newCust = {
      id: `c_${Date.now()}`,
      name: newCustomerForm.name,
      email: newCustomerForm.email,
      phone: newCustomerForm.phone || '+1 555-0000',
      address: newCustomerForm.address || '123 Pallet Town Way, USA'
    };
    setCustomers([newCust, ...customers]);
    setSelectedCustomer(newCust);
    setIsNewCustomerModalOpen(false);
  };

  const handleFinalizeOrder = (status) => {
    const orderNumber = `ORD-PV-${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrder = {
      id: orderNumber,
      orderNumber,
      customer: selectedCustomer,
      lineItems,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      paymentStatus: status,
      createdAt: new Date().toISOString()
    };

    alert(`🎉 Order Created Successfully!\nOrder Number: ${orderNumber}\nCustomer: ${selectedCustomer?.name}\nTotal: $${grandTotal.toFixed(2)}\nStatus: ${status}`);
    if (onOrderCreated) onOrderCreated(newOrder);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#F8FAFC' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>Create Draft Order</h2>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Manually create orders, apply custom line items, discounts, shipping & collect payments</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => handleFinalizeOrder('Pending')}
            style={{ background: '#334155', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleFinalizeOrder('Paid')}
            style={{ background: '#10B981', color: '#FFF', border: 'none', padding: '8px 20px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}
          >
            ✓ Mark as Paid (${grandTotal.toFixed(2)})
          </button>
        </div>
      </div>

      {/* Main Form Layout (2 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Left Column: Line Items & Discounts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Products / Line Items Card */}
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF' }}>📦 Line Items ({lineItems.length})</h3>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsCustomItemModalOpen(true)}
                  style={{ background: '#0F172A', border: '1px solid #334155', color: '#38BDF8', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Add Custom Item
                </button>
                <button
                  onClick={() => setIsItemPickerOpen(true)}
                  style={{ background: '#3B82F6', color: '#FFF', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Browse Products
                </button>
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lineItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <img src={item.thumbnail || '/assets/charizard.png'} alt={item.title} style={{ width: '48px', height: '48px', objectFit: 'contain', background: '#000', borderRadius: '6px', border: '1px solid #334155' }} />
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: '0.85rem', color: '#FFF', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </strong>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                      ${item.price.toFixed(2)} &bull; {item.stockAvailable} available in Vault
                    </div>
                  </div>

                  {/* Quantity Controller */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const q = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setLineItems(lineItems.map(li => li.id === item.id ? { ...li, quantity: q } : li));
                      }}
                      style={{ width: '50px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', padding: '4px 6px', borderRadius: '4px', textAlign: 'center', fontWeight: 700 }}
                    />
                  </div>

                  {/* Line Subtotal */}
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#34D399', fontSize: '0.95rem', minWidth: '80px', textAlign: 'right' }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => setLineItems(lineItems.filter(li => li.id !== item.id))}
                    style={{ background: 'transparent', color: '#F87171', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
                    title="Remove Line Item"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

          </div>

          {/* Discount & Shipping Selector */}
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF' }}>🏷️ Order Discounts & Shipping Method</h3>

            {/* Discount Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#FFF', padding: '8px 12px', borderRadius: '6px' }}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Discount Value</label>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#38BDF8', fontWeight: 700, padding: '8px 12px', borderRadius: '6px' }}
                />
              </div>
            </div>

            {/* Shipping Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Shipping Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                {[
                  { name: 'Standard Secure Courier', price: 15.00 },
                  { name: 'Vault Armored Courier', price: 45.00 },
                  { name: 'Free VIP Collector Shipping', price: 0.00 }
                ].map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => setShippingMethod(s)}
                    style={{
                      background: shippingMethod.name === s.name ? '#0F172A' : '#1E293B',
                      border: shippingMethod.name === s.name ? '2px solid #3B82F6' : '1px solid #334155',
                      padding: '10px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFF' }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#34D399', fontFamily: 'monospace' }}>${s.price.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Order Notes / Special Instructions</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#E2E8F0', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem' }}
              />
            </div>

          </div>

        </div>

        {/* Right Column: Customer Profile & Order Financials Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Customer Selection Card */}
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFF' }}>👤 Customer</h3>
              <button
                onClick={() => setIsNewCustomerModalOpen(true)}
                style={{ background: 'transparent', color: '#38BDF8', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                + New Customer
              </button>
            </div>

            <select
              value={selectedCustomer?.id}
              onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value))}
              style={{ background: '#0F172A', border: '1px solid #334155', color: '#FFF', padding: '8px 12px', borderRadius: '6px', fontWeight: 700 }}
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
              ))}
            </select>

            {selectedCustomer && (
              <div style={{ background: '#0F172A', padding: '10px', borderRadius: '6px', border: '1px solid #334155', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <strong style={{ color: '#FFF' }}>{selectedCustomer.name}</strong>
                <span style={{ color: '#38BDF8' }}>{selectedCustomer.email}</span>
                <span style={{ color: '#94A3B8' }}>{selectedCustomer.phone}</span>
                <span style={{ color: '#64748B', marginTop: '4px' }}>📍 {selectedCustomer.address}</span>
              </div>
            )}
          </div>

          {/* Payment & Financial Summary Box */}
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFF' }}>💰 Financial Summary</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#94A3B8' }}>Subtotal</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>${subtotal.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#94A3B8' }}>Discount ({discountType === 'percentage' ? `${discountValue}%` : `$${discountValue}`})</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F87171' }}>-${discountTotal.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#94A3B8' }}>Shipping ({shippingMethod.name})</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>${shippingMethod.price.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isTaxEnabled}
                  onChange={(e) => setIsTaxEnabled(e.target.checked)}
                />
                Estimated Tax (8.25%)
              </label>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>${taxTotal.toFixed(2)}</span>
            </div>

            <div style={{ height: '1px', background: '#334155', margin: '4px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 900 }}>
              <span style={{ color: '#FFF' }}>Total</span>
              <span style={{ fontFamily: 'monospace', color: '#34D399' }}>${grandTotal.toFixed(2)}</span>
            </div>

            <button
              onClick={() => handleFinalizeOrder('Paid')}
              style={{ width: '100%', background: '#10B981', color: '#FFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', marginTop: '8px' }}
            >
              💳 Mark as Paid & Generate Receipt
            </button>

            <button
              onClick={() => handleFinalizeOrder('Invoice Sent')}
              style={{ width: '100%', background: '#3B82F6', color: '#FFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              📧 Send Invoice / Payment Link
            </button>
          </div>

        </div>

      </div>

      {/* Catalog Item Picker Modal */}
      {isItemPickerOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF' }}>Select Products to Add</h3>
              <button onClick={() => setIsItemPickerOpen(false)} style={{ background: 'transparent', color: '#FFF', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>
              <input
                type="text"
                placeholder="Search 64 products by title or category..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#FFF' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ALL_PRODUCTS.filter(p => p.name.toLowerCase().includes(itemSearchQuery.toLowerCase())).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0F172A', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={p.image} alt={p.name} style={{ width: '36px', height: '36px', objectFit: 'contain', background: '#000', borderRadius: '4px' }} />
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: '#FFF', display: 'block' }}>{p.name}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#34D399', fontFamily: 'monospace' }}>${p.price.toFixed(2)} &bull; {p.inStock || 5} available</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddCatalogItem(p)}
                    style={{ background: '#3B82F6', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Item Modal */}
      {isCustomItemModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', width: '90%', maxWidth: '440px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF' }}>Add Custom Line Item</h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Item Title</label>
              <input
                type="text"
                placeholder="e.g. PSA 10 Grading Vault Storage Fee"
                value={customItemForm.title}
                onChange={(e) => setCustomItemForm({ ...customItemForm, title: e.target.value })}
                style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#FFF' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Price ($)</label>
                <input
                  type="number"
                  value={customItemForm.price}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, price: e.target.value })}
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#34D399', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Quantity</label>
                <input
                  type="number"
                  value={customItemForm.quantity}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, quantity: e.target.value })}
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#FFF', fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setIsCustomItemModalOpen(false)} style={{ background: '#334155', color: '#FFF', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddCustomItem} style={{ background: '#3B82F6', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Add Item</button>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {isNewCustomerModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', width: '90%', maxWidth: '440px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF' }}>Create New Customer Profile</h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Professor Oak"
                value={newCustomerForm.name}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#FFF' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Email Address</label>
              <input
                type="email"
                placeholder="oak@pallet.org"
                value={newCustomerForm.email}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#FFF' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Shipping Address</label>
              <input
                type="text"
                placeholder="10 Oak Research Lab, Pallet Town"
                value={newCustomerForm.address}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#FFF' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setIsNewCustomerModalOpen(false)} style={{ background: '#334155', color: '#FFF', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreateCustomer} style={{ background: '#10B981', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 800, cursor: 'pointer' }}>Save Customer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
