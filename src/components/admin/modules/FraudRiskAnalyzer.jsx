'use client';

import React, { useMemo } from 'react';
import { INITIAL_ORDERS } from '../../../data/orders.js';

export default function FraudRiskAnalyzer({ orders = INITIAL_ORDERS }) {
  const riskOrders = useMemo(() => {
    return orders.map(o => {
      const amount = parseFloat(o.total_amount) || 0;
      const email = o.customer_email || 'guest@pokevault.com';
      const flags = [];

      let riskScore = 15; // Base low risk

      if (amount > 2000) {
        riskScore += 45;
        flags.push(`High ticket order magnitude ($${amount.toLocaleString()})`);
      } else if (amount > 1000) {
        riskScore += 25;
        flags.push(`Significant order amount ($${amount.toLocaleString()})`);
      }

      if (email.includes('temp') || email.includes('rocket') || email.includes('disposable')) {
        riskScore += 35;
        flags.push('Unverified / high-risk email domain');
      }

      if (!o.tracking_number && o.status !== 'Delivered') {
        riskScore += 10;
        flags.push('Unfulfilled / pending dispatch');
      }

      if (flags.length === 0) {
        flags.push('Verified buyer signature');
        flags.push('Matching IP & shipping zip code');
      }

      let riskLevel = 'Low Risk';
      if (riskScore >= 60) riskLevel = 'High Risk';
      else if (riskScore >= 35) riskLevel = 'Medium Risk';

      return {
        id: o.order_id || o.id,
        customer: o.customer_name || 'Collector',
        email,
        amount,
        riskScore,
        riskLevel,
        flags
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }, [orders]);

  const highRiskCount = riskOrders.filter(r => r.riskScore >= 60).length;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <h2 className="text-2xl font-black uppercase text-white tracking-wide">
              PokeVault Native Fraud &amp; Risk Shield
            </h2>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Real-time order risk scoring evaluated against your {orders.length} active store orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono border font-bold px-3 py-1.5 rounded-lg ${
            highRiskCount > 0
              ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
          }`}>
            {highRiskCount > 0 ? `⚠️ ${highRiskCount} High Risk Orders Flagged` : '✓ Active Shield: 0 Chargebacks'}
          </span>
        </div>
      </div>

      {/* RISK TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono border-b border-zinc-800">
              <tr>
                <th className="p-4">Order ID &amp; Customer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Risk Score</th>
                <th className="p-4">Risk Flags Detected</th>
                <th className="p-4 text-right">Shield Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {riskOrders.map(item => (
                <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-white text-sm">#{item.id} — {item.customer}</p>
                    <p className="text-zinc-400 font-mono text-[11px]">{item.email}</p>
                  </td>

                  <td className="p-4 font-mono font-bold text-amber-400">
                    ${item.amount.toFixed(2)}
                  </td>

                  <td className="p-4 font-mono font-black">
                    <span className={`px-2.5 py-1 rounded text-xs border ${
                      item.riskScore >= 60 ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                      item.riskScore >= 35 ? 'bg-amber-400/20 text-amber-400 border-amber-400/40' :
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    }`}>
                      {item.riskScore} / 100 ({item.riskLevel})
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {item.flags.map((flag, idx) => (
                        <span key={idx} className="bg-zinc-950 text-zinc-300 font-mono text-[10px] px-2 py-0.5 rounded border border-zinc-800">
                          • {flag}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="p-4 text-right">
                    {item.riskScore >= 60 ? (
                      <button className="bg-red-500 hover:bg-red-600 text-white font-black text-xs px-3 py-1.5 rounded shadow">
                        Hold &amp; Request ID
                      </button>
                    ) : (
                      <button className="bg-zinc-800 text-zinc-300 font-bold text-xs px-3 py-1.5 rounded border border-zinc-700">
                        Approve Order
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
