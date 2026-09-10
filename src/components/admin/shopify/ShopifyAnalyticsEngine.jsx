import React, { useState, useMemo } from 'react';

/**
 * MODULE 1: Overview & Analytics Engine (Shopify-Grade)
 * Includes Top-Level KPI Summary Cards, Funnel Breakdown, Time-range Charts & Acquisition.
 */

export default function ShopifyAnalyticsEngine({ orders = [] }) {
  const [timeRange, setTimeRange] = useState('30D');
  const [metricMode, setMetricMode] = useState('sales'); // 'sales' | 'orders' | 'sessions'

  // Time-range mock multipliers
  const multiplier = useMemo(() => {
    switch (timeRange) {
      case 'Today': return 0.08;
      case '7D': return 0.28;
      case '30D': return 1.0;
      case '90D': return 2.75;
      default: return 1.0;
    }
  }, [timeRange]);

  const baseSales = 148250.00 * multiplier;
  const baseOrders = Math.round(482 * multiplier);
  const baseSessions = Math.round(18400 * multiplier);
  const uniqueVisitors = Math.round(baseSessions * 0.76);
  const aov = baseOrders > 0 ? baseSales / baseOrders : 0;
  const liveVisitors = 38;

  // Funnel calculations
  const addedToCart = Math.round(baseSessions * 0.148);
  const reachedCheckout = Math.round(baseSessions * 0.076);
  const converted = Math.round(baseSessions * 0.038);
  const conversionRate = ((converted / baseSessions) * 100).toFixed(2);

  // Time-series mock points
  const chartPoints = useMemo(() => {
    const count = timeRange === 'Today' ? 12 : timeRange === '7D' ? 7 : timeRange === '30D' ? 15 : 20;
    const pts = [];
    for (let i = 1; i <= count; i++) {
      const dayVal = (Math.sin(i * 0.8) + 1.8) * (baseSales / count) * 0.55;
      pts.push({
        label: timeRange === 'Today' ? `${i * 2}:00` : `Day ${i}`,
        value: Math.round(dayVal),
        orders: Math.round(dayVal / 220),
        sessions: Math.round(dayVal / 18)
      });
    }
    return pts;
  }, [timeRange, baseSales]);

  // Traffic Acquisition Sources
  const trafficSources = [
    { name: 'Social (Instagram / TikTok / YouTube)', visitors: Math.round(baseSessions * 0.44), share: 44, revenue: baseSales * 0.46, trend: '+18%' },
    { name: 'Organic Search (Google / DuckDuckGo)', visitors: Math.round(baseSessions * 0.31), share: 31, revenue: baseSales * 0.29, trend: '+12%' },
    { name: 'Direct Traffic & Bookmark Access', visitors: Math.round(baseSessions * 0.15), share: 15, revenue: baseSales * 0.16, trend: '+6%' },
    { name: 'Paid Ads (Meta / Google Shopping)', visitors: Math.round(baseSessions * 0.10), share: 10, revenue: baseSales * 0.09, trend: '-2%' },
  ];

  // Top Products Leaderboard
  const topProducts = [
    { name: '1st Edition Shadowless Charizard Holo #4 PSA 10', sku: 'CARD-CHARIZARD-1ST', units: Math.round(4 * multiplier) || 1, revenue: 19500 * (Math.round(4 * multiplier) || 1), image: '/assets/charizard.png' },
    { name: 'Loungefly Charizard Metallic Wings Backpack', sku: 'PV-BAG-CHARIZARD', units: Math.round(48 * multiplier), revenue: 88 * Math.round(48 * multiplier), image: '/assets/bag_charizard_backpack.png' },
    { name: 'Pikachu Electric Tail LED Neon Sign', sku: 'PV-DECOR-PIKACHU-NEON', units: Math.round(62 * multiplier), revenue: 69.99 * Math.round(62 * multiplier), image: '/assets/decor_pikachu_neon.png' },
    { name: 'Monopoly: Pokémon Kanto Edition Board Game', sku: 'PV-TOY-MONOPOLY', units: Math.round(54 * multiplier), revenue: 44.99 * Math.round(54 * multiplier), image: '/assets/toy_monopoly_kanto.png' },
    { name: 'Kanto Gym Badges 8-Piece Solid Metal Set', sku: 'PV-PIN-KANTO-BADGES', units: Math.round(71 * multiplier), revenue: 49.99 * Math.round(71 * multiplier), image: '/assets/pin_kanto_badges.png' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: '#F8FAFC' }}>
      
      {/* Top Header Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>Analytics & Sales Overview</h2>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Real-time merchant performance metrics, customer behavior & conversion pipeline</p>
        </div>

        {/* Time-Range Pill Selector */}
        <div style={{ display: 'flex', background: '#1E293B', padding: '4px', borderRadius: '8px', border: '1px solid #334155', gap: '2px' }}>
          {['Today', '7D', '30D', '90D'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                background: timeRange === range ? '#3B82F6' : 'transparent',
                color: timeRange === range ? '#FFF' : '#94A3B8',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        
        {/* Total Sales */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>Total Sales</span>
            <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>+18.4%</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'monospace', color: '#FFF' }}>
            ${baseSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>vs. previous period (${(baseSales * 0.844).toLocaleString('en-US', { maximumFractionDigits: 0 })})</div>
        </div>

        {/* Sessions & Live Visitors */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>Online Store Sessions</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(239,68,68,0.15)', color: '#F87171', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }}></span>
              {liveVisitors} Live Now
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'monospace', color: '#FFF' }}>
            {baseSessions.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>{uniqueVisitors.toLocaleString()} unique visitors (76%)</div>
        </div>

        {/* Conversion Rate & Funnel Summary */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>Conversion Rate</span>
            <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34D399', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>+0.6%</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'monospace', color: '#FFF' }}>
            {conversionRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>{converted.toLocaleString()} converted checkouts</div>
        </div>

        {/* AOV & Total Orders */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8' }}>Avg. Order Value (AOV)</span>
            <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>{baseOrders} Orders</span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'monospace', color: '#FFF' }}>
            ${aov.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>Returning Customer Rate: <strong style={{ color: '#34D399' }}>42.6%</strong></div>
        </div>

      </div>

      {/* Conversion Funnel Step Analyzer */}
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF', marginBottom: '1rem' }}>🛍️ Online Store Conversion Funnel</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          <div style={{ background: '#0F172A', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>1. Total Sessions</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', margin: '4px 0', color: '#FFF' }}>{baseSessions.toLocaleString()}</div>
            <div style={{ fontSize: '0.72rem', color: '#38BDF8' }}>100% of Store Traffic</div>
            <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', background: '#38BDF8' }}></div>
            </div>
          </div>

          <div style={{ background: '#0F172A', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>2. Added to Cart</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', margin: '4px 0', color: '#FFF' }}>{addedToCart.toLocaleString()}</div>
            <div style={{ fontSize: '0.72rem', color: '#FBBF24' }}>14.8% of Sessions</div>
            <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: '14.8%', height: '100%', background: '#FBBF24' }}></div>
            </div>
          </div>

          <div style={{ background: '#0F172A', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>3. Reached Checkout</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', margin: '4px 0', color: '#FFF' }}>{reachedCheckout.toLocaleString()}</div>
            <div style={{ fontSize: '0.72rem', color: '#A78BFA' }}>7.6% of Sessions</div>
            <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: '7.6%', height: '100%', background: '#A78BFA' }}></div>
            </div>
          </div>

          <div style={{ background: '#0F172A', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>4. Sessions Converted</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', margin: '4px 0', color: '#FFF' }}>{converted.toLocaleString()}</div>
            <div style={{ fontSize: '0.72rem', color: '#34D399' }}>{conversionRate}% Total Rate</div>
            <div style={{ width: '100%', height: '6px', background: '#334155', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(Number(conversionRate) * 5, 5)}%`, height: '100%', background: '#34D399' }}></div>
            </div>
          </div>

        </div>
      </div>

      {/* Interactive Sales Chart */}
      <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF' }}>📈 Performance Over Time ({timeRange})</h3>
            <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Interactive revenue timeline breakdown</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'sales', label: 'Sales ($)' },
              { id: 'orders', label: 'Orders' },
              { id: 'sessions', label: 'Sessions' }
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setMetricMode(btn.id)}
                style={{
                  background: metricMode === btn.id ? '#0F172A' : 'transparent',
                  color: metricMode === btn.id ? '#38BDF8' : '#64748B',
                  border: metricMode === btn.id ? '1px solid #38BDF8' : '1px solid #334155',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Chart */}
        <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '20px', borderBottom: '1px solid #334155' }}>
          {chartPoints.map((pt, i) => {
            const maxVal = Math.max(...chartPoints.map(p => metricMode === 'sales' ? p.value : metricMode === 'orders' ? p.orders : p.sessions));
            const currentVal = metricMode === 'sales' ? pt.value : metricMode === 'orders' ? pt.orders : pt.sessions;
            const barHeight = Math.max(12, Math.round((currentVal / (maxVal || 1)) * 160));

            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                  {metricMode === 'sales' ? `$${(currentVal / 1000).toFixed(1)}k` : currentVal}
                </div>
                <div
                  title={`${pt.label}: ${metricMode === 'sales' ? '$' + pt.value.toLocaleString() : currentVal}`}
                  style={{
                    width: '100%',
                    maxWidth: '36px',
                    height: `${barHeight}px`,
                    background: 'linear-gradient(180deg, #38BDF8 0%, #1D4ED8 100%)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ fontSize: '0.65rem', color: '#64748B' }}>{pt.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Split Row: Traffic Sources & Top Products */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* Traffic Sources */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF', marginBottom: '1rem' }}>🌐 Traffic Acquisition Channels</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {trafficSources.map((src, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 600, color: '#E2E8F0' }}>{src.name}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#34D399' }}>${src.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({src.share}%)</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#0F172A', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${src.share}%`, height: '100%', background: i === 0 ? '#38BDF8' : i === 1 ? '#34D399' : i === 2 ? '#FBBF24' : '#A78BFA' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B' }}>
                  <span>{src.visitors.toLocaleString()} visitors</span>
                  <span style={{ color: src.trend.startsWith('+') ? '#34D399' : '#F87171' }}>{src.trend} vs last mo.</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Products */}
        <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFF', marginBottom: '1rem' }}>🏆 Top Selling Vault Collectibles</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topProducts.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0F172A', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#000', borderRadius: '6px', border: '1px solid #475569' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'monospace' }}>{p.sku} &bull; {p.units} units sold</div>
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, color: '#34D399', fontSize: '0.9rem' }}>
                  ${p.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
