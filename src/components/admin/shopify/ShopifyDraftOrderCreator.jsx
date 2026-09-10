import React, { useState, useEffect, useMemo } from 'react';
import { getProducts, createOrder } from '../../../lib/api.js';

/**
 * MODULE 3: Manual Order Creation (Draft Orders Engine - Shopify Polaris Grade)
 * Allows merchants to create manual orders backed by real API and MySQL database.
 */
export default function ShopifyDraftOrderCreator({ onOrderCreated }) {
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Customer State
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  // Line Items in Draft
  const [lineItems, setLineItems] = useState([]);

  // Catalog Item Picker Search State
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);

  // Custom Item Modal State
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({ title: '', price: 50.00, quantity: 1 });

  // Discount Configuration
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' | 'fixed'
  const [discountValue, setDiscountValue] = useState(0);

  // Shipping Method
  const [shippingMethod, setShippingMethod] = useState({ name: 'Standard Secure Delivery', price: 9.99 });
  const [paymentStatus, setPaymentStatus] = useState('completed');
  const [paymentMethod, setPaymentMethod] = useState('Manual Admin Draft');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Load products for item picker
  useEffect(() => {
    const fetchCatalog = async () => {
      setIsLoadingProducts(true);
      try {
        const res = await getProducts();
        if (res && res.data) {
          setCatalogProducts(res.data);
        }
      } catch (e) {
        console.warn('Error fetching catalog:', e);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchCatalog();
  }, []);

  const showFeedback = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Financial Calculations
  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [lineItems]);

  const discountTotal = useMemo(() => {
    if (discountType === 'percentage') {
      return (subtotal * (Number(discountValue) / 100));
    }
    return Math.min(subtotal, Number(discountValue) || 0);
  }, [subtotal, discountType, discountValue]);

  const grandTotal = Math.max(0, subtotal - discountTotal + (shippingMethod.price || 0));

  // Add Catalog Item
  const handleAddCatalogItem = (prod) => {
    const price = Number(prod.price) || 0;
    const existing = lineItems.find(item => item.productId === prod.id);
    if (existing) {
      setLineItems(lineItems.map(item => item.productId === prod.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setLineItems([...lineItems, {
        id: `li_${Date.now()}_${Math.floor(Math.random() * 100)}`,
        productId: prod.id,
        title: prod.name,
        price,
        quantity: 1,
        thumbnail: prod.image || '/assets/charizard.png',
        stockAvailable: prod.in_stock !== undefined ? Number(prod.in_stock) : (Number(prod.inStock) || 5)
      }]);
    }
    setIsItemPickerOpen(false);
  };

  // Add Custom Item
  const handleAddCustomItem = () => {
    if (!customItemForm.title.trim()) return;
    setLineItems([...lineItems, {
      id: `li_custom_${Date.now()}`,
      productId: `custom-${Date.now()}`,
      title: customItemForm.title,
      price: parseFloat(customItemForm.price) || 0,
      quantity: parseInt(customItemForm.quantity, 10) || 1,
      thumbnail: '/assets/charizard.png',
      stockAvailable: 999
    }]);
    setIsCustomItemModalOpen(false);
    setCustomItemForm({ title: '', price: 50.00, quantity: 1 });
  };

  // Finalize & Create Real Order in Backend API
  const handleFinalizeOrder = async (targetPaymentStatus = 'completed') => {
    if (lineItems.length === 0) {
      alert('Please add at least one line item to the order.');
      return;
    }

    if (!customer.name.trim()) {
      alert('Please enter a customer name.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      customerName: customer.name.trim(),
      customerEmail: customer.email.trim() || 'collector@pokevault.com',
      shippingAddress: customer.address.trim() || '123 Pallet Town Way, Kanto',
      items: lineItems.map(li => ({
        id: li.productId,
        cardId: li.productId,
        name: li.title,
        title: li.title,
        price: li.price,
        quantity: li.quantity,
        qty: li.quantity
      })),
      promoCode: discountValue > 0 ? `DRAFT-${discountType === 'percentage' ? `${discountValue}%` : `$${discountValue}`}` : '',
      discountAmount: discountTotal,
      insuranceIncluded: true,
      insuranceCost: shippingMethod.price || 0,
      paymentMethod,
      paymentStatus: targetPaymentStatus,
      orderStatus: 'received',
      order_status: 'received'
    };

    try {
      const res = await createOrder(payload);
      if (res.success || res.orderId) {
        showFeedback(`🎉 Order #${res.orderId} created successfully in MySQL!`);
        
        // Reset Form
        setCustomer({ name: '', email: '', phone: '', address: '' });
        setLineItems([]);
        setNotes('');

        if (onOrderCreated) {
          setTimeout(() => {
            onOrderCreated(res.data);
          }, 1200);
        }
      } else {
        showFeedback(res.error || res.message || 'Failed to create order', 'error');
      }
    } catch (err) {
      showFeedback(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>Create Draft Order</h2>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
            Build and submit manual customer orders directly to MySQL database and update stock
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            disabled={isSubmitting}
            onClick={() => handleFinalizeOrder('pending')}
            style={{ background: '#334155', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Save as Draft (Pending)
          </button>
          <button
            disabled={isSubmitting}
            onClick={() => handleFinalizeOrder('completed')}
            style={{ background: '#10B981', color: '#FFF', border: 'none', padding: '8px 20px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>✓</span> {isSubmitting ? 'Submitting to DB...' : `Mark as Paid ($${grandTotal.toFixed(2)})`}
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
                  + Custom Item
                </button>
                <button
                  onClick={() => setIsItemPickerOpen(true)}
                  style={{ background: '#3B82F6', color: '#FFF', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Browse Catalog
                </button>
              </div>
            </div>

            {/* Line Items List */}
            {lineItems.length === 0 ? (
              <div style={{ border: '2px dashed #334155', borderRadius: '8px', padding: '2rem', textAlign: 'center', color: '#64748B' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>🛒</div>
                <strong style={{ color: '#94A3B8', fontSize: '0.9rem', display: 'block' }}>No items added yet</strong>
                <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                  Click "+ Browse Catalog" to choose from 64 Pokémon collectibles or "+ Custom Item" to enter custom products.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lineItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0F172A', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <img src={item.thumbnail || '/assets/charizard.png'} alt={item.title} style={{ width: '48px', height: '48px', objectFit: 'contain', background: '#000', borderRadius: '6px', border: '1px solid #334155' }} />
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '0.85rem', color: '#FFF', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </strong>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                        ${item.price.toFixed(2)} &bull; {item.stockAvailable} available in stock
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
                      style={{ background: 'transparent', color: '#F87171', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}
                      title="Remove Item"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Discount & Shipping Selector */}
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF' }}>🏷️ Order Discounts & Delivery</h3>

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
                  min="0"
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
                  { name: 'Standard Secure Delivery', price: 9.99 },
                  { name: 'Vault Armored Courier', price: 29.99 },
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

          </div>

        </div>

        {/* Right Column: Customer Profile & Order Financials Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Customer Details Form */}
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFF' }}>👤 Customer Profile</h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px' }}>Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#FFF', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px' }}>Email Address</label>
              <input
                type="email"
                placeholder="collector@pokevault.com"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#FFF', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#94A3B8', marginBottom: '4px' }}>Shipping Address</label>
              <input
                type="text"
                placeholder="123 Pallet Town Way, Kanto"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#FFF', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Payment & Financial Summary Box */}
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFF' }}>💰 Financial Summary</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#94A3B8' }}>Subtotal</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>${subtotal.toFixed(2)}</span>
            </div>

            {discountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: '#94A3B8' }}>Discount ({discountType === 'percentage' ? `${discountValue}%` : `$${discountValue}`})</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F87171' }}>-${discountTotal.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#94A3B8' }}>Shipping ({shippingMethod.name})</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>${shippingMethod.price.toFixed(2)}</span>
            </div>

            <div style={{ height: '1px', background: '#334155', margin: '4px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 900 }}>
              <span style={{ color: '#FFF' }}>Grand Total</span>
              <span style={{ fontFamily: 'monospace', color: '#34D399' }}>${grandTotal.toFixed(2)}</span>
            </div>

            <button
              disabled={isSubmitting}
              onClick={() => handleFinalizeOrder('completed')}
              style={{ width: '100%', background: '#10B981', color: '#FFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', marginTop: '8px' }}
            >
              {isSubmitting ? 'Saving...' : '💳 Mark as Paid & Save Order'}
            </button>
          </div>

        </div>

      </div>

      {/* Catalog Item Picker Modal */}
      {isItemPickerOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF' }}>Select Products from Catalog</h3>
              <button onClick={() => setIsItemPickerOpen(false)} style={{ background: 'transparent', color: '#FFF', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>
              <input
                type="text"
                placeholder="Search products by title or category..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#FFF' }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {catalogProducts.filter(p => p.name.toLowerCase().includes(itemSearchQuery.toLowerCase())).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0F172A', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={p.image || '/assets/charizard.png'} alt={p.name} style={{ width: '36px', height: '36px', objectFit: 'contain', background: '#000', borderRadius: '4px' }} />
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: '#FFF', display: 'block' }}>{p.name}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#34D399', fontFamily: 'monospace' }}>
                        ${(Number(p.price) || 0).toFixed(2)} &bull; {p.in_stock !== undefined ? p.in_stock : (p.inStock || 5)} in stock
                      </span>
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
                placeholder="e.g. Vintage Booster Pack or Custom Slab"
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
                  step="0.01"
                  value={customItemForm.price}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, price: e.target.value })}
                  style={{ width: '100%', background: '#0F172A', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#34D399', fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>Quantity</label>
                <input
                  type="number"
                  min="1"
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

    </div>
  );
}
