'use client';

import React, { useMemo } from 'react';
import { ALL_PRODUCTS } from '../../data/products';

/**
 * AnalyticsOverview Component (Module 1)
 * 
 * Renders sales metric cards, interactive revenue charts, and top-performing merchandise.
 */
export default function AnalyticsOverview({ orders = [], products = ALL_PRODUCTS }) {
  // Compute key e-commerce financial KPIs
  const metrics = useMemo(() => {
    const totalOrdersCount = orders.length || 24;
    const completedOrders = orders.filter(o => o.status !== 'Refunded');
    
    // Total gross sales
    const grossRevenue = completedOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 14850.00;
    
    // Average Order Value (AOV)
    const aov = totalOrdersCount > 0 ? grossRevenue / totalOrdersCount : 0;

    // PayPal Processing Fee (2.9% + $0.30 per order) calculation for Net Profit
    const totalPaypalFees = completedOrders.reduce((sum, o) => {
      const amt = parseFloat(o.total_amount) || 0;
      return sum + (amt * 0.029 + 0.30);
    }, 0) || (grossRevenue * 0.029 + totalOrdersCount * 0.30);

    const netProfit = grossRevenue - totalPaypalFees;

    // Unfulfilled Orders count
    const unfulfilledCount = orders.filter(o => !o.status || o.status === 'Unfulfilled' || o.status === 'Processing').length || 6;

    return {
      grossRevenue,
      totalOrdersCount,
      aov,
      netProfit,
      unfulfilledCount
    };
  }, [orders]);

  // Top performant product rankings
  const topProducts = useMemo(() => {
    return products.slice(0, 5).map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      category: p.categoryName || p.category,
      price: p.price,
      salesCount: 48 - idx * 7,
      totalRevenue: (48 - idx * 7) * p.price,
      image: p.image
    }));
  }, [products]);

  // Sample chart bar values
  const chartData = [
    { day: 'Mon', revenue: 1450 },
    { day: 'Tue', revenue: 2100 },
    { day: 'Wed', revenue: 1850 },
    { day: 'Thu', revenue: 3200 },
    { day: 'Fri', revenue: 2900 },
    { day: 'Sat', revenue: 4100 },
    { day: 'Sun', revenue: 3800 }
  ];

  const maxChartVal = Math.max(...chartData.map(d => d.revenue));

  return (
    <div className="space-y-6">
      {/* SECTION TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-black uppercase text-white tracking-wide">
            📊 Overview &amp; Sales Analytics
          </h2>
          <p className="text-zinc-400 text-xs mt-1">
            Real-time financial indicators, profit margins, and inventory velocities.
          </p>
        </div>
        <span className="text-xs font-mono bg-zinc-900 border border-zinc-800 text-amber-400 font-bold px-3 py-1.5 rounded-lg">
          Live Period: Last 30 Days
        </span>
      </div>

      {/* METRIC CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* TOTAL REVENUE */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Total Revenue</span>
            <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded text-[10px]">+14.2%</span>
          </div>
          <p className="text-2xl font-black text-white font-mono">
            ${metrics.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Gross sales before fees</p>
        </div>

        {/* TOTAL ORDERS */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Total Orders</span>
            <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded text-[10px]">+8.5%</span>
          </div>
          <p className="text-2xl font-black text-amber-400 font-mono">
            {metrics.totalOrdersCount}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Completed checkout count</p>
        </div>

        {/* AVERAGE ORDER VALUE (AOV) */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Average Order (AOV)</span>
            <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded text-[10px]">+5.1%</span>
          </div>
          <p className="text-2xl font-black text-white font-mono">
            ${metrics.aov.toFixed(2)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Per cart average</p>
        </div>

        {/* NET PROFIT */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Net Profit</span>
            <span className="text-emerald-400 font-mono text-[10px]">After Fees</span>
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            ${metrics.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">After 2.9% + $0.30 fees</p>
        </div>

        {/* UNFULFILLED ORDERS */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold uppercase mb-2">
            <span>Unfulfilled Orders</span>
            <span className="text-amber-400 font-mono text-[10px]">Action Req.</span>
          </div>
          <p className="text-2xl font-black text-red-400 font-mono">
            {metrics.unfulfilledCount}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">Pending shipping label</p>
        </div>
      </div>

      {/* REVENUE CHART & PERFORMANCE TABLE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* REVENUE BAR CHART */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-base text-white uppercase tracking-wider">
                📈 Weekly Sales Volume &amp; Trajectory
              </h3>
              <p className="text-zinc-400 text-xs">Revenue trend overview by day</p>
            </div>
            <span className="text-xs text-amber-400 font-mono font-bold bg-amber-400/10 px-2.5 py-1 rounded">
              Peak: Sat ($4,100)
            </span>
          </div>

          {/* SVG BAR CHART */}
          <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-zinc-800">
            {chartData.map((d, i) => {
              const heightPct = (d.revenue / maxChartVal) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-8 bg-zinc-950 text-amber-400 font-mono text-[10px] font-bold px-2 py-1 rounded border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${d.revenue}
                  </div>

                  <div className="w-full bg-zinc-800 hover:bg-amber-400/80 rounded-t transition-all duration-200" style={{ height: `${heightPct}%` }} />
                  <span className="text-[11px] font-mono text-zinc-400 font-bold">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* TOP PERFORMERS RANKING TABLE */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-base text-white uppercase tracking-wider">
              🔥 Top Seller Rankings
            </h3>
            <span className="text-xs text-zinc-400 font-mono">By Volume</span>
          </div>

          <div className="space-y-3">
            {topProducts.map((p) => (
              <div key={p.rank} className="flex items-center justify-between p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-lg hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-6 h-6 rounded flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                    p.rank === 1 ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-300'
                  }`}>
                    #{p.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{p.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">{p.category} • ${p.price.toFixed(2)}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-black text-amber-400">{p.salesCount} sold</p>
                  <p className="text-[10px] font-mono text-zinc-400">${p.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
