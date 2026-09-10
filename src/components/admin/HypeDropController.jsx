'use client';

import React, { useState, useEffect } from 'react';
import { getStoreSettings, updateStoreSettings } from '../../lib/api.js';

/**
 * HypeDropController Component (Module 5 / Custom Feature)
 * 
 * Controls store lock-state (PokeVault Pro Hype Drop Controller).
 * Toggles storefront access behind a VIP password gate with countdown timer & email opt-ins.
 */
export default function HypeDropController() {
  const [isActive, setIsActive] = useState(false);
  const [password, setPassword] = useState('POKEVAULTVIP');
  const [dropTimestamp, setDropTimestamp] = useState(
    new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16)
  );
  const [optInCount, setOptInCount] = useState(342);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const settings = await getStoreSettings();
      if (settings) {
        setIsActive(Boolean(settings.is_hype_drop_active));
        if (settings.drop_password) setPassword(settings.drop_password);
        if (settings.drop_timestamp) {
          try {
            setDropTimestamp(new Date(settings.drop_timestamp).toISOString().slice(0, 16));
          } catch {
            // Keep default
          }
        }
        if (settings.opt_in_count !== undefined) setOptInCount(settings.opt_in_count);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const payload = {
      is_hype_drop_active: isActive,
      drop_password: password.trim(),
      drop_timestamp: new Date(dropTimestamp).toISOString(),
      opt_in_count: Number(optInCount)
    };

    await updateStoreSettings(payload);

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <h2 className="text-2xl font-black uppercase text-white tracking-wide">
              "Hype Drop" Lock-State Controller
            </h2>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Exclusive VIP Gate — Lock storefront behind a release countdown timer &amp; email opt-in password wall.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-black px-3 py-1.5 rounded-lg border ${
            isActive ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
          }`}>
            {isActive ? '🔒 STORE LOCKED (HYPE DROP ON)' : '🟢 STOREFRONT PUBLIC (NORMAL)'}
          </span>
        </div>
      </div>

      {/* MASTER TOGGLE SWITCH CARD */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-zinc-950 rounded-lg border border-zinc-800">
          <div>
            <h3 className="font-extrabold text-base text-white uppercase tracking-wider">
              Master Hype Drop Switch
            </h3>
            <p className="text-zinc-400 text-xs mt-0.5">
              When enabled, all public visitors are redirected to the VIP Password Lock Gate.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`px-6 py-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-lg ${
              isActive
                ? 'bg-red-500 text-white shadow-red-500/20'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            {isActive ? '🔒 Hype Drop Active [ ON ]' : '🟢 Public Mode [ OFF ]'}
          </button>
        </div>

        {/* SETTINGS FORM */}
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-300 mb-1.5">
                VIP Access Password
              </label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-amber-400 font-mono text-sm px-4 py-3 rounded-lg focus:outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-zinc-500 mt-1">Secret passcode for VIP buyers to bypass gate</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-zinc-300 mb-1.5">
                Scheduled Release Timestamp
              </label>
              <input
                type="datetime-local"
                required
                value={dropTimestamp}
                onChange={(e) => setDropTimestamp(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-white font-mono text-sm px-4 py-3 rounded-lg focus:outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-zinc-500 mt-1">Live countdown timer target on VIP gate</p>
            </div>
          </div>

          {/* OPT-IN STATS CARD */}
          <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white uppercase">Pre-Launch Email Opt-Ins</p>
              <p className="text-[11px] text-zinc-500">Total collectors registered for next drop notification</p>
            </div>
            <p className="text-2xl font-black text-amber-400 font-mono">{optInCount}</p>
          </div>

          {saveSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold p-3 rounded-lg text-center">
              ✓ Hype Drop settings updated successfully!
            </div>
          )}

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-black font-black text-xs uppercase px-6 py-3 rounded-lg shadow-lg transition-all"
            >
              {isSaving ? 'Saving...' : '💾 Save Hype Drop Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
