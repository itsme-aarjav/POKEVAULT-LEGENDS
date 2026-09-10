'use client';

import React, { useState } from 'react';

const INITIAL_PROMOS = [
  { code: 'POKEVAULT10', type: 'Percentage', value: 10, usageCount: 142, status: 'Active' },
  { code: 'LEGENDS20', type: 'Percentage', value: 20, usageCount: 68, status: 'Active' },
  { code: 'FREESHIP150', type: 'Free Shipping', value: 0, usageCount: 312, status: 'Automatic' },
  { code: 'TRAINERFIT10', type: 'Bundle Auto-Discount', value: 10, usageCount: 94, status: 'Active' }
];

export default function DiscountsPromos() {
  const [promos, setPromos] = useState(INITIAL_PROMOS);
  const [isCreating, setIsCreating] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState('Percentage');
  const [newValue, setNewValue] = useState(15);

  const handleCreatePromo = (e) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    setPromos([
      {
        code: newCode.trim().toUpperCase(),
        type: newType,
        value: parseFloat(newValue) || 0,
        usageCount: 0,
        status: 'Active'
      },
      ...promos
    ]);

    setIsCreating(false);
    setNewCode('');
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black uppercase text-white tracking-wide">
            🏷️ Discounts &amp; Automatic Cart Promotions
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Manage promotional codes, automatic cart rules ($150 free shipping), and Buy X Get Y (BXGY) triggers.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase px-4 py-2 rounded-lg shadow-lg"
        >
          <span>➕ Create Discount Code</span>
        </button>
      </div>

      {/* PROMO TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono border-b border-zinc-800">
              <tr>
                <th className="p-4">Discount Code</th>
                <th className="p-4">Rule Type</th>
                <th className="p-4">Value</th>
                <th className="p-4">Usage Count</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {promos.map(p => (
                <tr key={p.code} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="p-4 font-mono font-black text-amber-400 text-sm">
                    {p.code}
                  </td>
                  <td className="p-4 font-mono text-zinc-300">{p.type}</td>
                  <td className="p-4 font-mono font-bold text-white">
                    {p.type === 'Free Shipping' ? 'Free Shipping' : `${p.value}% OFF`}
                  </td>
                  <td className="p-4 font-mono text-zinc-400">{p.usageCount} redemptions</td>
                  <td className="p-4">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-lg font-black uppercase text-white">🏷️ Create New Promo Code</h3>
              <button onClick={() => setIsCreating(false)} className="text-zinc-500 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Promo Code String</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KANTO15"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-xs font-mono text-amber-400 p-2.5 rounded focus:border-amber-400 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Discount Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400"
                >
                  <option value="Percentage">Percentage Discount (%)</option>
                  <option value="Fixed Amount">Fixed Amount ($)</option>
                  <option value="Free Shipping">Free Vault Shipping</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Discount Value</label>
                <input
                  type="number"
                  required
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 bg-zinc-800 text-xs font-bold text-white rounded">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-amber-400 text-black text-xs font-black uppercase rounded shadow-lg">
                  Save Promo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
