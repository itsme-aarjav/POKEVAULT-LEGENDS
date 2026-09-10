'use client';

import React, { useState } from 'react';
import { ALL_PRODUCTS } from '../../../data/products.js';
import { saveProduct } from '../../../lib/api.js';

export default function InventoryMatrix({ initialProducts = ALL_PRODUCTS, onRefresh }) {
  const [products, setProducts] = useState(initialProducts);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

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
    bundle_discount: 10
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
        cross_sell_id: prod.cross_sell_id || '',
        bundle_discount: prod.bundle_discount || 10
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
        bundle_discount: 10
      });
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const updatedItem = {
      ...formData,
      price: parseFloat(formData.price),
      inStock: parseInt(formData.stock)
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
      bundleDiscount: updatedItem.bundle_discount
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

  const handleBulkStockIncrement = (amount) => {
    setProducts(prev => prev.map(p => ({
      ...p,
      inStock: Math.max(0, (p.inStock || 10) + amount)
    })));
  };

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black uppercase text-white tracking-wide">
            👕 Products, Collections &amp; Variant Stock Matrix
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Manage multi-variant SKU matrices, low stock indicators, and MySQL pricing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkEditing(!isBulkEditing)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase px-3.5 py-2 rounded-lg border border-zinc-700"
          >
            {isBulkEditing ? 'Close Bulk Editor' : '⚡ Bulk Stock Editor'}
          </button>

          <button
            onClick={() => openEditor()}
            className="bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-black font-black text-xs uppercase px-4 py-2 rounded-lg shadow-lg flex items-center gap-1.5"
          >
            <span>➕ Add Product</span>
          </button>
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {isBulkEditing && (
        <div className="bg-amber-400/10 border border-amber-400/30 p-4 rounded-xl flex items-center justify-between gap-4">
          <p className="text-xs font-bold text-amber-400">⚡ Bulk Operations on Filtered Catalog ({filteredProducts.length} Items)</p>
          <div className="flex items-center gap-2">
            <button onClick={() => handleBulkStockIncrement(5)} className="bg-amber-400 text-black font-black text-xs px-3 py-1.5 rounded">
              +5 Stock All
            </button>
            <button onClick={() => handleBulkStockIncrement(-5)} className="bg-zinc-800 text-white font-bold text-xs px-3 py-1.5 rounded border border-zinc-700">
              -5 Stock All
            </button>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3 bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
        <input
          type="text"
          placeholder="Filter by product title..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="flex-1 bg-zinc-950 border border-zinc-700 text-xs text-white px-3 py-2 rounded-md focus:outline-none focus:border-amber-400"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-zinc-950 border border-zinc-700 text-xs font-bold text-white px-3 py-2 rounded-md focus:outline-none focus:border-amber-400"
        >
          <option value="all">All Collections</option>
          <option value="trading-cards">Trading Cards &amp; Slabs</option>
          <option value="plush">Plush Toys</option>
          <option value="clothing">Clothing &amp; Streetwear</option>
          <option value="bags">Bags &amp; Backpacks</option>
          <option value="decor">Room Decor</option>
        </select>
      </div>

      {/* INVENTORY TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono border-b border-zinc-800">
              <tr>
                <th className="p-4">Item Details</th>
                <th className="p-4">Collection</th>
                <th className="p-4">Price</th>
                <th className="p-4">Variant Stock (S/M/L/XL/2XL)</th>
                <th className="p-4">Low Stock Warning</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredProducts.slice(0, 15).map(prod => {
                const stock = prod.inStock ?? 10;
                const isLowStock = stock < 5;

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

                    <td className="p-4">
                      <span className={`font-mono font-bold px-2.5 py-1 rounded text-xs ${
                        isLowStock ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : 'bg-zinc-950 text-zinc-300 border border-zinc-800'
                      }`}>
                        {stock} total units
                      </span>
                    </td>

                    <td className="p-4">
                      {isLowStock ? (
                        <span className="text-[10px] font-bold text-red-400 uppercase bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                          ⚠️ LOW STOCK (&lt;5 Units)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-1 rounded">
                          ✓ Optimal Stock
                        </span>
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

      {/* EDITOR MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-lg font-black uppercase text-white">
                {editingProduct === 'new' ? '➕ Add New Product' : `Edit Product: ${formData.name}`}
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-zinc-500 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
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

              <div className="grid grid-cols-2 gap-3">
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

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
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
