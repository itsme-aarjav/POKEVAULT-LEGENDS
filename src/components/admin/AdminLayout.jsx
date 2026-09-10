'use client';

import React, { useState, useEffect } from 'react';
import { isDatabaseConnected } from '../../lib/api.js';

/**
 * AdminLayout Component
 * 
 * Provides a responsive dark-mode sidebar layout for PokeVault Control Center
 * with live MySQL status indicator, tab switcher, and curator profile header.
 */
export default function AdminLayout({ activeTab, setActiveTab, children }) {
  const [isDbConnected, setIsDbConnected] = useState(true);

  useEffect(() => {
    isDatabaseConnected().then(connected => setIsDbConnected(connected));
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pvAdminKey');
      window.location.reload();
    }
  };

  const navItems = [
    { id: 'overview', label: 'Analytics & Reports', icon: '📊' },
    { id: 'orders', label: 'Orders & Pipeline', icon: '📦' },
    { id: 'products', label: 'Inventory & Variants', icon: '👕' },
    { id: 'customers', label: 'Customers & Loyalty', icon: '👥' },
    { id: 'discounts', label: 'Discounts & Promos', icon: '🏷️' },
    { id: 'hypedrop', label: 'Hype Drop Controller', icon: '🔥' },
    { id: 'tcgmarket', label: 'TCG Market Watcher', icon: '🃏' },
    { id: 'fraudrisk', label: 'Fraud Risk Shield', icon: '🛡️' },
    { id: 'settings', label: 'Store Configuration', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-amber-400 selection:text-black">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-72 bg-zinc-900 border-r border-zinc-800 shrink-0 flex flex-col justify-between">
        <div>
          {/* BRAND HEADER */}
          <div className="p-5 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-amber-400 font-extrabold text-xs tracking-widest uppercase block">
                ADMIN CONTROL CENTER
              </span>
              {/* LIVE MYSQL STATUS DOT */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded-full" title={isDbConnected ? 'Connected to MySQL Database (AWS RDS/Local)' : 'Using Local Storage Mode'}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${isDbConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-[10px] font-mono text-zinc-400">
                  {isDbConnected ? 'MYSQL DB' : 'LOCAL DB'}
                </span>
              </div>
            </div>

            <h1 className="text-xl font-black text-white uppercase tracking-wider mt-1 flex items-center gap-2">
              <span>⚡ POKEVAULT</span>
            </h1>
          </div>

          {/* TAB NAVIGATION BUTTONS */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all ${
                    isActive
                      ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/10'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* SIDEBAR FOOTER & LOGOUT */}
        <div className="p-4 border-t border-zinc-800 space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-400 text-black font-black text-xs flex items-center justify-center">
                PV
              </div>
              <div>
                <p className="text-xs font-bold text-white">Master Curator</p>
                <p className="text-[10px] text-zinc-500 font-mono">admin@pokevault.com</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-zinc-500 hover:text-red-400 text-xs font-bold transition-colors p-1"
              title="Sign Out"
            >
              🚪 Exit
            </button>
          </div>

          <a
            href="/"
            className="block text-center text-xs font-bold text-zinc-400 hover:text-amber-400 bg-zinc-950 border border-zinc-800 hover:border-amber-400/40 py-2 rounded-md transition-colors"
          >
            ← View Storefront Website
          </a>
        </div>
      </aside>

      {/* MAIN DASHBOARD CONTENT AREA */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-zinc-950">
        {children}
      </main>
    </div>
  );
}
