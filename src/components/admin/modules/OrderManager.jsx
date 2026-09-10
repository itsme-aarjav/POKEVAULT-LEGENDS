import React, { useState, useMemo } from 'react';
import { INITIAL_ORDERS } from '../../../data/orders.js';

export default function OrderManager({ orders: externalOrders, setOrders: externalSetOrders, initialOrders = [], onRefresh }) {
  const [localOrders, setLocalOrders] = useState(initialOrders.length > 0 ? initialOrders : INITIAL_ORDERS);
  const orders = externalOrders || localOrders;
  const setOrders = externalSetOrders || setLocalOrders;

  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [carrier, setCarrier] = useState('USPS');
  const [trackingInput, setTrackingInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Draft Order State
  const [draftData, setDraftData] = useState({
    customer_name: '',
    customer_email: '',
    shipping_address: '',
    itemName: 'Gengar Heavyweight Hoodie',
    itemPrice: 65.00,
    quantity: 1
  });

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'All') return orders;
    return orders.filter(o => (o.status || 'Unfulfilled').toLowerCase() === statusFilter.toLowerCase());
  }, [orders, statusFilter]);

  const handleMarkAsShipped = async (orderId) => {
    if (!trackingInput.trim()) {
      alert('Please enter a valid tracking number.');
      return;
    }

    setIsUpdating(true);
    const trackingString = `${carrier}: ${trackingInput.trim()}`;

    setOrders(prev => prev.map(o => {
      if (o.order_id === orderId || o.id === orderId) {
        return { ...o, status: 'Shipped', tracking_number: trackingString };
      }
      return o;
    }));

    setIsUpdating(false);
    setSelectedOrder(null);
    setTrackingInput('');
    if (onRefresh) onRefresh();
  };

  const handleCreateDraftOrder = async (e) => {
    e.preventDefault();
    const newOrder = {
      id: `ord_${Date.now()}`,
      order_id: `PV-${Math.floor(10000 + Math.random() * 90000)}`,
      customer_name: draftData.customer_name,
      customer_email: draftData.customer_email,
      shipping_address: draftData.shipping_address,
      total_amount: parseFloat(draftData.itemPrice) * parseInt(draftData.quantity),
      status: 'Draft Orders',
      payment_method: 'Manual Draft',
      payment_status: 'PENDING',
      created_at: new Date().toISOString()
    };

    setOrders([newOrder, ...orders]);
    setIsCreatingDraft(false);
    setDraftData({
      customer_name: '',
      customer_email: '',
      shipping_address: '',
      itemName: 'Gengar Heavyweight Hoodie',
      itemPrice: 65.00,
      quantity: 1
    });
  };

  const handleIssueRefund = async (orderId) => {
    if (!confirm(`Issue full refund for Order #${orderId}? Status will change to Refunded.`)) return;

    setIsUpdating(true);
    setOrders(prev => prev.map(o => {
      if (o.order_id === orderId || o.id === orderId) return { ...o, status: 'Refunded' };
      return o;
    }));

    setIsUpdating(false);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* HEADER & PIPELINE FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black uppercase text-white tracking-wide">
            📦 Orders &amp; Fulfillment Pipeline
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Filter orders by status, issue tracking labels, create manual Draft Orders, and manage MySQL order records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreatingDraft(true)}
            className="bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-black font-black text-xs uppercase px-4 py-2 rounded-lg shadow-lg flex items-center gap-1.5"
          >
            <span>📝 Create Draft Order</span>
          </button>
        </div>
      </div>

      {/* PIPELINE TABS */}
      <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl">
        {['All', 'Unfulfilled', 'Processing', 'Shipped', 'Delivered', 'Refunded', 'Draft Orders'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === st
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* ORDERS TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono border-b border-zinc-800">
              <tr>
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Total Paid</th>
                <th className="p-4">Status</th>
                <th className="p-4">Tracking</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-zinc-500 font-mono">
                    No orders match the selected pipeline filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id || order.order_id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-amber-400">
                      #{order.order_id || order.id}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-white">{order.customer_name}</p>
                      <p className="text-zinc-500 text-[11px] font-mono">{order.customer_email}</p>
                    </td>
                    <td className="p-4 font-mono font-bold text-white">
                      ${parseFloat(order.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        order.status === 'Shipped' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        order.status === 'Refunded' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        order.status === 'Draft Orders' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                        'bg-amber-400/20 text-amber-400 border-amber-400/30'
                      }`}>
                        {order.status || 'Unfulfilled'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-zinc-400">
                      {order.tracking_number || '—'}
                    </td>
                    <td className="p-4 text-zinc-500 text-[11px] font-mono">
                      {new Date(order.created_at || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-3 py-1.5 rounded text-xs border border-zinc-700"
                      >
                        Inspect →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DRAFT ORDER CREATOR MODAL */}
      {isCreatingDraft && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-lg font-black uppercase text-white">📝 Create Manual Draft Order</h3>
              <button onClick={() => setIsCreatingDraft(false)} className="text-zinc-500 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateDraftOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={draftData.customer_name}
                  onChange={(e) => setDraftData({ ...draftData, customer_name: e.target.value })}
                  placeholder="e.g. Gary Oak"
                  className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Customer Email</label>
                <input
                  type="email"
                  required
                  value={draftData.customer_email}
                  onChange={(e) => setDraftData({ ...draftData, customer_email: e.target.value })}
                  placeholder="gary@oaklabs.jp"
                  className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Shipping Address</label>
                <input
                  type="text"
                  required
                  value={draftData.shipping_address}
                  onChange={(e) => setDraftData({ ...draftData, shipping_address: e.target.value })}
                  placeholder="789 Rival Lane, Pallet Town"
                  className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Amount ($USD)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={draftData.itemPrice}
                  onChange={(e) => setDraftData({ ...draftData, itemPrice: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button type="button" onClick={() => setIsCreatingDraft(false)} className="px-4 py-2 bg-zinc-800 text-xs font-bold text-white rounded">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-amber-400 text-black text-xs font-black uppercase rounded shadow-lg">
                  Save Draft Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl max-w-2xl w-full p-6 space-y-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <span className="text-xs font-mono text-amber-400 font-bold">ORDER FULFILLMENT</span>
                <h3 className="text-xl font-black uppercase text-white">Order #{selectedOrder.order_id || selectedOrder.id}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-zinc-500 hover:text-white font-bold">✕</button>
            </div>

            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
              <p className="text-xs font-bold text-white">{selectedOrder.customer_name} ({selectedOrder.customer_email})</p>
              <p className="text-xs text-zinc-400 font-mono mt-1">{selectedOrder.shipping_address}</p>
            </div>

            {selectedOrder.status !== 'Shipped' && selectedOrder.status !== 'Refunded' && (
              <div className="bg-zinc-950 p-4 rounded-lg border border-amber-400/30 space-y-3">
                <p className="text-xs font-bold text-amber-400 uppercase">⚡ Mark as Shipped</p>
                <div className="flex gap-2">
                  <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="bg-zinc-900 border border-zinc-700 text-xs font-bold text-white px-3 py-2 rounded">
                    <option value="USPS">USPS Priority</option>
                    <option value="FedEx">FedEx Express</option>
                    <option value="UPS">UPS Ground</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Enter Tracking Number..."
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-700 text-xs font-mono text-white px-3 py-2 rounded"
                  />
                  <button onClick={() => handleMarkAsShipped(selectedOrder.order_id || selectedOrder.id)} className="bg-amber-400 text-black font-black text-xs px-4 py-2 rounded">
                    Save Tracking
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
              <button onClick={() => handleIssueRefund(selectedOrder.order_id || selectedOrder.id)} className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-bold px-4 py-2 rounded">
                Issue Refund
              </button>
              <button onClick={() => setSelectedOrder(null)} className="bg-zinc-800 text-white text-xs font-bold px-4 py-2 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
