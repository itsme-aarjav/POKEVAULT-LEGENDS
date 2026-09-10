'use client';

import React, { useState } from 'react';
import { ALL_PRODUCTS } from '../../data/products.js';
import { saveProduct } from '../../lib/api.js';

/**
 * ProductBundleManager Component (Module 3)
 * 
 * Manages merchandise catalog items, variant stock counts, low stock alerts,
 * "Complete the Fit" cross-sell bundle pairings, and TCG Card Market Watcher trends.
 */
export default function ProductBundleManager({ initialProducts = ALL_PRODUCTS, onRefresh }) {
  const [products, setProducts] = useState(initialProducts);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Form State for Product Editor Modal
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    price: 0,
    category: 'clothing',
    categoryName: 'Clothing & Apparel',
    image: '',
    stock: 10,
    description: '',
    cross_sell_id: '',
    bundle_discount: 10,
    tcg_market_price: 0
  });

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const openEditor = (prod = null) => {
    if (prod) {
      setEditingProduct(prod);
      setFormData({
        id: prod.id,
        name: prod.name,
        price: prod.price,
        category: prod.category || 'clothing',
        categoryName: prod.categoryName || 'Clothing & Apparel',
        image: prod.image,
        stock: prod.inStock || 10,
        description: prod.description || '',
        cross_sell_id: prod.cross_sell_id || 'prod_gengar_sling',
        bundle_discount: prod.bundle_discount || 10,
        tcg_market_price: prod.tcg_market_price || (prod.category === 'trading-cards' ? prod.price * 1.15 : 0)
      });
    } else {
      setEditingProduct('new');
      setFormData({
        id: `prod_${Date.now()}`,
        name: '',
        price: 49.99,
        category: 'clothing',
        categoryName: 'Clothing & Apparel',
        image: '/assets/apparel_gengar_hoodie.png',
        stock: 15,
        description: '',
        cross_sell_id: '',
        bundle_discount: 10,
        tcg_market_price: 0
      });
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();

    const updatedItem = {
      ...formData,
      price: parseFloat(formData.price),
      inStock: parseInt(formData.stock),
      tcg_market_price: parseFloat(formData.tcg_market_price) || 0
    };

    await saveProduct({
      id: updatedItem.id,
      sku: updatedItem.id,
      name: updatedItem.name,
      price: updatedItem.price,
      category: updatedItem.category,
      categoryName: updatedItem.categoryName,
      image: updatedItem.image,
      inStock: updatedItem.inStock,
      description: updatedItem.description,
      crossSellId: updatedItem.cross_sell_id,
      bundleDiscount: updatedItem.bundle_discount,
      tcgMarketPrice: updatedItem.tcg_market_price
    });

    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === updatedItem.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updatedItem };
        return next;
      }
      return [updatedItem, ...prev];
    });

    setEditingProduct(null);
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black uppercase text-white tracking-wide">
            👕 Product, Variant &amp; Cross-Sell Manager
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Manage stock levels, size variants, "Complete the Fit" cross-sells, and MySQL pricing.
          </p>
        </div>

        <button
          onClick={() => openEditor()}
          className="bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-black font-black text-xs uppercase px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 self-start sm:self-auto"
        >
          <span>➕ Add New Product</span>
        </button>
      </div>

      {/* SEARCH & CATEGORY FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3 bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
        <input
          type="text"
          placeholder="Search products by title..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="flex-1 bg-zinc-950 border border-zinc-700 text-xs text-white px-3 py-2 rounded-md focus:outline-none focus:border-amber-400"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-700 text-xs font-bold text-white px-3 py-2 rounded-md focus:outline-none focus:border-amber-400"
        >
          <option value="all">All Categories</option>
          <option value="trading-cards">Trading Cards &amp; Slabs</option>
          <option value="plush">Plush Toys</option>
          <option value="clothing">Clothing &amp; Streetwear</option>
          <option value="bags">Bags &amp; Backpacks</option>
          <option value="decor">Room Decor</option>
        </select>
      </div>

      {/* PRODUCT LIST & VARIANT MATRIX TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono border-b border-zinc-800">
              <tr>
                <th className="p-4">Item</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Variant Stock (S/M/L/XL/2XL)</th>
                <th className="p-4">Cross-Sell Add-On</th>
                <th className="p-4">TCG Market Trend</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredProducts.slice(0, 15).map((prod) => {
                const stock = prod.inStock ?? 12;
                const isLowStock = stock < 5;
                const hasTcgPrice = prod.category === 'trading-cards' || prod.tcg_market_price > 0;
                const mktPrice = prod.tcg_market_price || (prod.price * 1.12);
                const diffPct = (((mktPrice - prod.price) / prod.price) * 100).toFixed(1);

                return (
                  <tr key={prod.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={prod.image} alt={prod.name} className="w-10 h-10 object-contain bg-zinc-950 border border-zinc-800 p-1 rounded" />
                        <div>
                          <p className="font-bold text-white text-sm">{prod.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">ID: {prod.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-zinc-300">
                      {prod.categoryName || prod.category}
                    </td>

                    <td className="p-4 font-mono font-bold text-amber-400">
                      ${prod.price.toFixed(2)}
                    </td>

                    {/* VARIANT STOCK MATRIX & LOW STOCK INDICATOR */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-black px-2 py-1 rounded text-xs ${
                          isLowStock ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : 'bg-zinc-950 text-zinc-300 border border-zinc-800'
                        }`}>
                          {stock} in stock
                        </span>
                        {isLowStock && (
                          <span className="text-[10px] font-bold text-red-400 uppercase">⚠️ Low Stock (&lt;5)</span>
                        )}
                      </div>
                    </td>

                    {/* CROSS-SELL ASSIGNMENT */}
                    <td className="p-4">
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-500/20">
                        {prod.cross_sell_id ? `Paired (10% OFF)` : 'Auto-Paired'}
                      </span>
                    </td>

                    {/* TCG CARD MARKET WATCHER */}
                    <td className="p-4">
                      {hasTcgPrice ? (
                        <div className="font-mono text-[11px]">
                          <span className="text-zinc-300 font-bold">${mktPrice.toFixed(2)}</span>
                          <span className={`ml-1.5 font-bold ${parseFloat(diffPct) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ({parseFloat(diffPct) >= 0 ? `+${diffPct}%` : `${diffPct}%`})
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 font-mono">—</span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => openEditor(prod)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold px-3 py-1.5 rounded text-xs border border-zinc-700"
                      >
                        Edit Item
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRODUCT EDITOR MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-lg font-black uppercase text-white">
                {editingProduct === 'new' ? '➕ Add New Merchandise' : `Edit Product: ${formData.name}`}
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-zinc-500 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Price ($USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400"
                  >
                    <option value="clothing">Clothing &amp; Apparel</option>
                    <option value="bags">Bags &amp; Backpacks</option>
                    <option value="trading-cards">Trading Cards &amp; Slabs</option>
                    <option value="plush">Plush Toys</option>
                    <option value="decor">Room Decor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Stock Count</label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400"
                  />
                </div>
              </div>

              {/* CROSS-SELL ASSIGNMENT ("Complete the Fit") */}
              <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 space-y-3">
                <p className="text-xs font-bold uppercase text-amber-400">⚡ "Complete the Fit" Cross-Sell Pairing</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">Matching Bundle Product</label>
                    <select
                      value={formData.cross_sell_id}
                      onChange={(e) => setFormData({ ...formData, cross_sell_id: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white p-2 rounded focus:border-amber-400"
                    >
                      <option value="">Select Cross-Sell Add-On...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase text-zinc-400 mb-1">Bundle Discount (%)</label>
                    <input
                      type="number"
                      value={formData.bundle_discount}
                      onChange={(e) => setFormData({ ...formData, bundle_discount: parseInt(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white p-2 rounded focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* TCG CARD MARKET WATCHER PRICE */}
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">🃏 TCG Market Reference Price ($USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tcg_market_price}
                  onChange={(e) => setFormData({ ...formData, tcg_market_price: e.target.value })}
                  placeholder="Estimated TCG market value..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-zinc-800 text-xs font-bold text-white rounded">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-amber-400 text-black text-xs font-black uppercase rounded shadow-lg">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
