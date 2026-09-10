'use client';

import React, { useMemo } from 'react';

/**
 * Sample fallback customer data if database orders are empty
 */
const SAMPLE_CUSTOMERS = [
  { email: 'ash@pallettown.jp', name: 'Ash Ketchum', ordersCount: 8, ltv: 1240.50, lastOrder: '2026-08-12' },
  { email: 'misty@ceruleangym.io', name: 'Misty Waterflower', ordersCount: 4, ltv: 345.00, lastOrder: '2026-08-11' },
  { email: 'brock@pewtergym.org', name: 'Brock Slate', ordersCount: 5, ltv: 480.00, lastOrder: '2026-08-09' },
  { email: 'serena@kalosfashion.fr', name: 'Serena Yvonne', ordersCount: 2, ltv: 95.00, lastOrder: '2026-08-05' },
  { email: 'red@mtpinnacle.jp', name: 'Trainer Red', ordersCount: 12, ltv: 4850.00, lastOrder: '2026-08-13' }
];

/**
 * CustomerCRM Component (Module 4)
 * 
 * Tracks customer directory, Lifetime Value (LTV), and gamified Trainer Tier badges.
 */
export default function CustomerCRM({ orders = [] }) {
  // Aggregate LTV and orders by customer email
  const customers = useMemo(() => {
    if (orders.length === 0) return SAMPLE_CUSTOMERS;

    const map = {};
    orders.forEach(o => {
      const email = o.customer_email || 'guest@pokevault.com';
      const name = o.customer_name || 'Collector';
      const amt = parseFloat(o.total_amount) || 0;

      if (!map[email]) {
        map[email] = {
          email,
          name,
          ordersCount: 0,
          ltv: 0,
          lastOrder: o.created_at
        };
      }
      map[email].ordersCount += 1;
      map[email].ltv += amt;
    });

    return Object.values(map).sort((a, b) => b.ltv - a.ltv);
  }, [orders]);

  // Gamified Trainer Tier Logic based on LTV
  const getTrainerTier = (ltv) => {
    if (ltv >= 500) {
      return {
        name: 'Pokémon Master',
        icon: '⚡',
        badgeClass: 'bg-amber-400/20 text-amber-400 border-amber-400/40'
      };
    }
    if (ltv >= 100) {
      return {
        name: 'Gym Leader',
        icon: '🔵',
        badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40'
      };
    }
    return {
      name: 'Novice Trainer',
      icon: '🟢',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
    };
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black uppercase text-white tracking-wide">
            👥 Customer CRM &amp; Trainer Tiers
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Track customer Lifetime Value (LTV), purchase frequency, and gamified loyalty tier badges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-zinc-900 border border-zinc-800 text-amber-400 font-bold px-3 py-1.5 rounded-lg">
            Total Collectors: {customers.length}
          </span>
        </div>
      </div>

      {/* GAMIFIED TIER EXPLANATION CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3">
          <span className="text-2xl">🟢</span>
          <div>
            <p className="font-extrabold text-sm text-emerald-400">Novice Trainer</p>
            <p className="text-[11px] text-zinc-400 font-mono">LTV &lt; $100 spent</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-blue-500/30 p-4 rounded-xl flex items-center gap-3">
          <span className="text-2xl">🔵</span>
          <div>
            <p className="font-extrabold text-sm text-blue-400">Gym Leader</p>
            <p className="text-[11px] text-zinc-400 font-mono">LTV $100 – $499 spent</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-amber-400/30 p-4 rounded-xl flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="font-extrabold text-sm text-amber-400">Pokémon Master</p>
            <p className="text-[11px] text-zinc-400 font-mono">LTV $500+ VIP Spent</p>
          </div>
        </div>
      </div>

      {/* CUSTOMER DIRECTORY TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono border-b border-zinc-800">
              <tr>
                <th className="p-4">Collector Profile</th>
                <th className="p-4">Trainer Tier Badge</th>
                <th className="p-4">Total Orders</th>
                <th className="p-4">Lifetime Value (LTV)</th>
                <th className="p-4">Last Order Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {customers.map((c) => {
                const tier = getTrainerTier(c.ltv);
                return (
                  <tr key={c.email} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{c.name}</p>
                      <p className="text-zinc-400 font-mono text-[11px]">{c.email}</p>
                    </td>

                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 border font-extrabold text-xs px-2.5 py-1 rounded-md ${tier.badgeClass}`}>
                        <span>{tier.icon}</span>
                        <span>{tier.name}</span>
                      </span>
                    </td>

                    <td className="p-4 font-mono font-bold text-white">
                      {c.ordersCount} orders
                    </td>

                    <td className="p-4 font-mono font-black text-amber-400 text-sm">
                      ${c.ltv.toFixed(2)}
                    </td>

                    <td className="p-4 font-mono text-zinc-400 text-[11px]">
                      {new Date(c.lastOrder).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
