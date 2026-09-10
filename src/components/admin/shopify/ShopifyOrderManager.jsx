import React, { useState, useMemo } from 'react';
import { updateOrderStatus, deleteOrder } from '../../../lib/api.js';

/**
 * MODULE: Orders & Fulfillment Pipeline (Shopify Polaris-Grade)
 * Real-time order processing, status transitions, courier tracking assignments, and refund actions.
 */
export default function ShopifyOrderManager({ orders = [], onRefresh, searchQuery = '' }) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [carrier, setCarrier] = useState('Vault Armored Courier');
  const [trackingInput, setTrackingInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter(o => {
        const st = (o.order_status || o.status || 'received').toLowerCase();
        return st === statusFilter.toLowerCase();
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o => 
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
        (o.customer_email && o.customer_email.toLowerCase().includes(q)) ||
        (o.tracking_number && o.tracking_number.toLowerCase().includes(q))
      );
    }

    return result;
  }, [orders, statusFilter, searchQuery]);

  const showFeedback = (msg, type = 'success') => {
    setFeedbackMessage({ text: msg, type });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleUpdateStatus = async (orderId, newStatus, trackingNum = null) => {
    setIsUpdating(true);
    try {
      const payload = { order_status: newStatus };
      if (trackingNum) {
        payload.tracking_number = trackingNum;
      }
      const res = await updateOrderStatus(orderId, payload);
      if (res.success) {
        showFeedback(`Order #${orderId} marked as ${newStatus}`);
        if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.order_id === orderId)) {
          setSelectedOrder({ ...selectedOrder, order_status: newStatus, status: newStatus, tracking_number: trackingNum || selectedOrder.tracking_number });
        }
        if (onRefresh) await onRefresh();
      } else {
        showFeedback(res.error || 'Failed to update order status', 'error');
      }
    } catch (err) {
      showFeedback(err.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveTracking = async (orderId) => {
    if (!trackingInput.trim()) {
      alert('Please enter a tracking number.');
      return;
    }
    const fullTracking = `${carrier}: ${trackingInput.trim()}`;
    await handleUpdateStatus(orderId, 'shipped', fullTracking);
    setTrackingInput('');
  };

  const handleDeleteOrder = async (orderId) => {
    if (!confirm(`Are you sure you want to permanently delete Order #${orderId}?`)) return;
    setIsUpdating(true);
    try {
      const res = await deleteOrder(orderId);
      if (res.success) {
        showFeedback(`Order #${orderId} deleted`);
        setSelectedOrder(null);
        if (onRefresh) await onRefresh();
      } else {
        showFeedback(res.error || 'Failed to delete order', 'error');
      }
    } catch (err) {
      showFeedback(err.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    const s = (status || 'received').toLowerCase();
    switch (s) {
      case 'received':
        return { background: 'rgba(56,189,248,0.15)', color: '#38BDF8', border: '1px solid #38BDF8' };
      case 'processing':
        return { background: 'rgba(168,85,247,0.15)', color: '#C084FC', border: '1px solid #C084FC' };
      case 'dispatched':
        return { background: 'rgba(245,158,11,0.15)', color: '#FBBF24', border: '1px solid #FBBF24' };
      case 'shipped':
        return { background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid #60A5FA' };
      case 'delivered':
        return { background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid #34D399' };
      case 'cancelled':
      case 'refunded':
        return { background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid #F87171' };
      default:
        return { background: 'rgba(148,163,184,0.15)', color: '#94A3B8', border: '1px solid #94A3B8' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#F8FAFC' }}>
      
      {/* Toast Notification */}
      {feedbackMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: feedbackMessage.type === 'error' ? '#EF4444' : '#10B981',
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
          <span>{feedbackMessage.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>Orders & Fulfillment</h2>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
            Real live order records from MySQL database. Update fulfillment status, issue tracking labels, and process refunds.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => onRefresh && onRefresh()}
            style={{ background: '#1E293B', border: '1px solid #334155', color: '#38BDF8', padding: '8px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>🔄</span> Refresh Orders
          </button>
        </div>
      </div>

      {/* Pipeline Status Filter Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: '#1E293B', padding: '6px', borderRadius: '10px', border: '1px solid #334155' }}>
        {[
          { id: 'All', label: 'All Orders' },
          { id: 'received', label: 'Received' },
          { id: 'processing', label: 'Processing' },
          { id: 'dispatched', label: 'Dispatched' },
          { id: 'shipped', label: 'Shipped' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'cancelled', label: 'Cancelled' },
          { id: 'refunded', label: 'Refunded' }
        ].map(t => {
          const count = t.id === 'All'
            ? orders.length
            : orders.filter(o => (o.order_status || o.status || 'received').toLowerCase() === t.id.toLowerCase()).length;

          return (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              style={{
                background: statusFilter === t.id ? '#3B82F6' : 'transparent',
                color: statusFilter === t.id ? '#FFF' : '#94A3B8',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{t.label}</span>
              <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', background: statusFilter === t.id ? 'rgba(0,0,0,0.3)' : '#0F172A', color: statusFilter === t.id ? '#FFF' : '#64748B' }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders Table */}
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#0F172A', borderBottom: '1px solid #334155', color: '#94A3B8', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.5px' }}>
              <th style={{ padding: '12px 16px' }}>Order</th>
              <th style={{ padding: '12px 16px' }}>Customer</th>
              <th style={{ padding: '12px 16px' }}>Items</th>
              <th style={{ padding: '12px 16px' }}>Total Amount</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Tracking</th>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                  <strong style={{ fontSize: '1rem', color: '#94A3B8', display: 'block' }}>No orders found</strong>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                    {orders.length === 0 
                      ? 'No live orders have been placed in the database yet. Create a draft order or make a purchase from the storefront!' 
                      : 'No orders match your selected filter criteria.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => {
                const orderId = order.id || order.order_id;
                const status = order.order_status || order.status || 'received';
                const itemsCount = (order.order_items || order.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0) || 1;
                const total = Number(order.total_amount) || 0;
                const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now';
                const badgeStyle = getStatusBadgeStyle(status);

                return (
                  <tr key={orderId} style={{ borderBottom: '1px solid rgba(71,85,105,0.4)', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#38BDF8' }}>
                      #{orderId}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <strong style={{ color: '#FFF', display: 'block' }}>{order.customer_name || 'Guest Collector'}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'monospace' }}>{order.customer_email || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#E2E8F0' }}>
                      {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#34D399', fontSize: '0.95rem' }}>
                      ${total.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        ...badgeStyle
                      }}>
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#94A3B8' }}>
                      {order.tracking_number || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: '#64748B' }}>
                      {dateStr}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        style={{ background: '#3B82F6', color: '#FFF', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Inspect Order Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.7)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 800, textTransform: 'uppercase' }}>Live Database Order</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FFF' }}>Order #{selectedOrder.id || selectedOrder.order_id}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'transparent', border: 'none', color: '#FFF', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            {/* Customer & Address Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#0F172A', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Customer</span>
                <strong style={{ display: 'block', color: '#FFF', fontSize: '0.9rem', marginTop: '2px' }}>{selectedOrder.customer_name || 'Guest'}</strong>
                <span style={{ fontSize: '0.78rem', color: '#38BDF8', fontFamily: 'monospace' }}>{selectedOrder.customer_email || '—'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Shipping Address</span>
                <p style={{ fontSize: '0.8rem', color: '#E2E8F0', marginTop: '2px', lineHeight: 1.4 }}>{selectedOrder.shipping_address || '123 Pallet Town Way, Kanto'}</p>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>Line Items</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedOrder.order_items || selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0F172A', padding: '10px 14px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#FFF', display: 'block' }}>{item.card_name || item.title || item.name || `Card ${item.card_id}`}</strong>
                      <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                        Qty: {item.quantity || 1} &bull; ${(Number(item.unit_price) || Number(item.price) || 0).toFixed(2)} each
                      </span>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#34D399', fontSize: '0.9rem' }}>
                      ${(Number(item.subtotal) || ((Number(item.unit_price) || Number(item.price) || 0) * (item.quantity || 1))).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div style={{ background: '#0F172A', padding: '1rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                <span>Subtotal</span>
                <span style={{ fontFamily: 'monospace', color: '#FFF' }}>${Number(selectedOrder.subtotal || selectedOrder.total_amount || 0).toFixed(2)}</span>
              </div>
              {Number(selectedOrder.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F87171' }}>
                  <span>Discount ({selectedOrder.promo_code || 'Promo'})</span>
                  <span style={{ fontFamily: 'monospace' }}>-${Number(selectedOrder.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1rem', color: '#FFF', borderTop: '1px solid #334155', paddingTop: '6px' }}>
                <span>Total Amount Paid</span>
                <span style={{ fontFamily: 'monospace', color: '#34D399' }}>${Number(selectedOrder.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Fulfillment & Tracking Actions */}
            <div style={{ background: '#0F172A', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <strong style={{ fontSize: '0.85rem', color: '#38BDF8' }}>⚡ Courier & Fulfillment Action</strong>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  style={{ background: '#1E293B', border: '1px solid #334155', color: '#FFF', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem' }}
                >
                  <option value="Vault Armored Courier">Vault Armored Courier</option>
                  <option value="BlueDart Air Express">BlueDart Air Express</option>
                  <option value="Delhivery Express">Delhivery Express</option>
                  <option value="FedEx Priority">FedEx Priority</option>
                  <option value="USPS Priority Mail">USPS Priority Mail</option>
                </select>

                <input
                  type="text"
                  placeholder="Enter Tracking Number (e.g. TRK-98412948)..."
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  style={{ flex: 1, minWidth: '200px', background: '#1E293B', border: '1px solid #334155', color: '#FFF', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', fontFamily: 'monospace' }}
                />

                <button
                  disabled={isUpdating}
                  onClick={() => handleSaveTracking(selectedOrder.id || selectedOrder.order_id)}
                  style={{ background: '#3B82F6', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Save Tracking & Ship
                </button>
              </div>

              {/* Status Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                <button
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_id, 'received')}
                  style={{ background: '#0284C7', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Mark Received
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_id, 'processing')}
                  style={{ background: '#7C3AED', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Mark Processing
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_id, 'dispatched')}
                  style={{ background: '#D97706', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Mark Dispatched
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_id, 'delivered')}
                  style={{ background: '#10B981', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ✓ Mark Delivered
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_id, 'cancelled')}
                  style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171', border: '1px solid rgba(239,68,68,0.4)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel Order
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus(selectedOrder.id || selectedOrder.order_id, 'refunded')}
                  style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171', border: '1px solid rgba(239,68,68,0.4)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Issue Refund
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '1rem' }}>
              <button
                disabled={isUpdating}
                onClick={() => handleDeleteOrder(selectedOrder.id || selectedOrder.order_id)}
                style={{ background: 'transparent', color: '#EF4444', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                🗑️ Delete Order Record
              </button>

              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: '#334155', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
