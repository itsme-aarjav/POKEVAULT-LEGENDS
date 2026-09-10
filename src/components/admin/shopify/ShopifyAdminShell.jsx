import React, { useState } from 'react';
import ShopifyAnalyticsEngine from './ShopifyAnalyticsEngine.jsx';
import ShopifyProductManager from './ShopifyProductManager.jsx';
import ShopifyDraftOrderCreator from './ShopifyDraftOrderCreator.jsx';
import ShopifyDiscountEngine from './ShopifyDiscountEngine.jsx';

/**
 * SHOPIFY POLARIS ADMIN DASHBOARD SHELL
 * Houses persistent sidebar, store switcher, global search command palette,
 * live traffic indicator, notifications, and all 4 core modules.
 */

export default function ShopifyAdminShell() {
  const [activeModule, setActiveModule] = useState('analytics'); // 'analytics' | 'products' | 'draft-orders' | 'discounts'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const notifications = [
    { id: 'n1', title: 'New High-Value Order Placed', desc: 'Order #ORD-PV-1001 for $19,500.00 by Red Trainer', time: '5m ago', unread: true },
    { id: 'n2', title: 'Low Stock Threshold Alert', desc: 'Charizard Base 1st Edition PSA 10 has only 2 units remaining', time: '22m ago', unread: true },
    { id: 'n3', title: 'New Customer Registered', desc: 'Cynthia Shinnoh verified their collector account', time: '1h ago', unread: false }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#090D16', color: '#F8FAFC', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>
      
      {/* ─── POLARIS COLLAPSIBLE SIDEBAR ────────────────────────────── */}
      <aside style={{
        width: isSidebarCollapsed ? '72px' : '260px',
        backgroundColor: '#0F172A',
        borderRight: '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        zIndex: 20
      }}>
        {/* Brand & Store Header */}
        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #3B82F6, #10B981)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              🛍️
            </div>
            {!isSidebarCollapsed && (
              <div style={{ overflow: 'hidden' }}>
                <h1 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>PokéVault Admin</h1>
                <span style={{ fontSize: '0.7rem', color: '#38BDF8', fontWeight: 700, textTransform: 'uppercase' }}>Shopify Polaris Core</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
            title="Toggle Sidebar"
          >
            {isSidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Navigation List */}
        <nav style={{ flex: 1, padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          
          {[
            { id: 'analytics', icon: '📊', label: 'Overview & Analytics', badge: '+18%' },
            { id: 'products', icon: '📦', label: 'Catalog & Inventory', badge: '64' },
            { id: 'draft-orders', icon: '📝', label: 'Create Draft Order', badge: 'New' },
            { id: 'discounts', icon: '🏷️', label: 'Discounts & BXGY', badge: '4' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: activeModule === item.id ? '#1E293B' : 'transparent',
                color: activeModule === item.id ? '#38BDF8' : '#94A3B8',
                border: activeModule === item.id ? '1px solid rgba(56,189,248,0.3)' : '1px solid transparent',
                fontSize: '0.88rem',
                fontWeight: activeModule === item.id ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
              {!isSidebarCollapsed && (
                <>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                  {item.badge && (
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '10px', background: activeModule === item.id ? 'rgba(56,189,248,0.2)' : '#1E293B', color: activeModule === item.id ? '#38BDF8' : '#64748B' }}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}

        </nav>

        {/* User Profile Footer */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #1E293B', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#FFF', fontSize: '0.8rem', flexShrink: 0 }}>
            SA
          </div>
          {!isSidebarCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFF' }}>SuperAdmin</div>
              <div style={{ fontSize: '0.7rem', color: '#10B981' }}>● Vault Verified</div>
            </div>
          )}
        </div>
      </aside>

      {/* ─── MAIN CONTENT VIEWPORT ─────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Top Polaris App Header */}
        <header style={{
          height: '60px',
          backgroundColor: '#0F172A',
          borderBottom: '1px solid #1E293B',
          padding: '0 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          
          {/* Left: Store Switcher & Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1E293B', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#FFF', flexShrink: 0 }}>
              <span>🏬</span> PokéVault Legends (Production)
            </div>

            {/* Global Search Bar */}
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                placeholder="Search products, orders, customers, or promotions..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: '#090D16',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '6px 12px 6px 32px',
                  color: '#FFF',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: '#64748B' }}>🔍</span>
            </div>
          </div>

          {/* Right: Live Traffic Badge & Notification Center */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.78rem', color: '#34D399', fontWeight: 700 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
              38 Live Visitors
            </div>

            {/* Notifications Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                style={{ background: '#1E293B', border: '1px solid #334155', color: '#FFF', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', position: 'relative' }}
              >
                🔔
                <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }}></span>
              </button>

              {/* Notification Drawer Popover */}
              {isNotificationsOpen && (
                <div style={{ position: 'absolute', right: 0, top: '46px', width: '320px', background: '#1E293B', border: '1px solid #334155', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #334155', fontWeight: 800, fontSize: '0.85rem', color: '#FFF' }}>
                    Notifications & Alerts
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {notifications.map(n => (
                      <div key={n.id} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(71,85,105,0.4)', background: n.unread ? 'rgba(59,130,246,0.08)' : 'transparent' }}>
                        <strong style={{ fontSize: '0.8rem', color: '#FFF', display: 'block' }}>{n.title}</strong>
                        <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>{n.desc}</p>
                        <span style={{ fontSize: '0.68rem', color: '#64748B' }}>{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a
              href="/"
              target="_blank"
              style={{ background: '#3B82F6', color: '#FFF', padding: '6px 14px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>🏬</span> View Store
            </a>
          </div>

        </header>

        {/* Content Body Area */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '1.75rem' }}>
          {activeModule === 'analytics' && <ShopifyAnalyticsEngine />}
          {activeModule === 'products' && <ShopifyProductManager />}
          {activeModule === 'draft-orders' && <ShopifyDraftOrderCreator onOrderCreated={() => setActiveModule('analytics')} />}
          {activeModule === 'discounts' && <ShopifyDiscountEngine />}
        </main>

      </div>

    </div>
  );
}
