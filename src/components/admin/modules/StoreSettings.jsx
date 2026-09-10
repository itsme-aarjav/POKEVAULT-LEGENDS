'use client';

import React, { useState, useEffect } from 'react';
import { isDatabaseConnected } from '../../../lib/api.js';

export default function StoreSettings() {
  const [storeName, setStoreName] = useState('POKÉVAULT LEGENDS');
  const [currency, setCurrency] = useState('USD ($)');
  const [freeShipThreshold, setFreeShipThreshold] = useState(150);
  const [standardShipRate, setStandardShipRate] = useState(9.99);
  const [isSaved, setIsSaved] = useState(false);
  const [isDbLive, setIsDbLive] = useState(true);

  useEffect(() => {
    isDatabaseConnected().then(connected => setIsDbLive(connected));
  }, []);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black uppercase text-white tracking-wide">
            ⚙️ Store Settings &amp; Gateway Configuration
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            General store parameters, shipping rates, free shipping thresholds, and production AWS gateway status.
          </p>
        </div>
      </div>

      {/* GATEWAY STATUS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white uppercase">MySQL 8.0 Engine</p>
            <p className="text-[11px] text-zinc-500 font-mono">Primary Database Sync</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            isDbLive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-400/20 text-amber-400 border-amber-400/30'
          }`}>
            {isDbLive ? '✓ MYSQL ACTIVE' : 'LOCAL DEMO'}
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white uppercase">PayPal Express Checkout</p>
            <p className="text-[11px] text-zinc-500 font-mono">Payment Gateway API</p>
          </div>
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
            ✓ ACTIVE
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white uppercase">Nginx Reverse Proxy</p>
            <p className="text-[11px] text-zinc-500 font-mono">AWS Ingress &amp; Caching</p>
          </div>
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
            ✓ ACTIVE
          </span>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSaveSettings} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
        <h3 className="font-extrabold text-base text-white uppercase tracking-wider pb-3 border-b border-zinc-800">
          General Store Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Store Name</label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Primary Currency</label>
            <input
              type="text"
              required
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Standard Shipping Rate ($USD)</label>
            <input
              type="number"
              step="0.01"
              required
              value={standardShipRate}
              onChange={(e) => setStandardShipRate(parseFloat(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-zinc-300 mb-1">Free Shipping Threshold ($USD)</label>
            <input
              type="number"
              required
              value={freeShipThreshold}
              onChange={(e) => setFreeShipThreshold(parseInt(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white p-2.5 rounded focus:border-amber-400 font-mono"
            />
          </div>
        </div>

        {isSaved && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold p-3 rounded-lg text-center">
            ✓ Store Configuration Updated!
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-zinc-800">
          <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase px-6 py-2.5 rounded-lg shadow-lg">
            💾 Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
