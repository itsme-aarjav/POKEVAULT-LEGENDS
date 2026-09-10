'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '../context/StoreContext';
import { searchProducts } from '../data/products.js';

export default function Navbar({ onOpenCart }) {
  const { cart, wishlist } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchRef = useRef(null);

  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalWishlistCount = wishlist.length;

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const matches = searchProducts(searchQuery).slice(0, 5);
      setSearchResults(matches);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowDropdown(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {/* TOP TICKER MARQUEE */}
      <div class="ticker-wrap">
        <div class="ticker-move">
          <span class="ticker-item">⚡ NATIONWIDE FLAT-RATE VAULT SHIPPING ON ALL MERCHANDISE &amp; SLABS</span>
          <span class="ticker-item">★ 100% OFFICIAL POKÉMON CENTER &amp; PSA / BGS AUTHENTICATED</span>
          <span class="ticker-item">⚡ USE CODE "POKEVAULT10" FOR 10% OFF YOUR ENTIRE ORDER</span>
          <span class="ticker-item">★ OVER 60+ EXCLUSIVE POKÉMON COLLECTIBLES IN STOCK</span>
          <span class="ticker-item">⚡ NATIONWIDE FLAT-RATE VAULT SHIPPING ON ALL MERCHANDISE &amp; SLABS</span>
        </div>
      </div>

      {/* MAIN NAVBAR */}
      <header class="navbar">
        <div class="nav-left">
          <button class="icon-btn" onClick={onOpenCart} aria-label="View Shopping Cart">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <span class="cart-count">{totalCartUnits}</span>
          </button>

          <Link href="/wishlist" class="icon-btn" aria-label="Wishlist">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span class="cart-count" style={{ background: 'var(--accent-red)' }}>{totalWishlistCount}</span>
          </Link>
        </div>

        <Link href="/" class="logo-stamp">
          <div class="logo-badge">POKÉVAULT</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--accent-red)', marginTop: '2px' }}>LEGENDS</div>
        </Link>

        {/* SEARCH BAR */}
        <div class="nav-search-wrap" ref={searchRef}>
          <form onSubmit={handleSearchSubmit} class="nav-search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="nav-search-input"
              placeholder="Search Pikachu, Plush, Cards, Apparel..."
              autoComplete="off"
            />
            <button type="submit" class="nav-search-btn" aria-label="Search">🔍</button>
          </form>

          {showDropdown ? (
            <div class="search-results-dropdown" style={{ display: 'block' }}>
              {searchResults.length === 0 ? (
                <div class="search-no-result">No Pokémon merchandise found matching "{searchQuery}"</div>
              ) : (
                <>
                  {searchResults.map(item => (
                    <Link
                      key={item.id}
                      href={`/product/${item.id}`}
                      className="search-dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      <img src={item.image} alt={item.name} />
                      <div>
                        <div class="search-item-title">{item.name}</div>
                        <div class="search-item-meta">{item.categoryName} • ${item.price.toFixed(2)}</div>
                      </div>
                    </Link>
                  ))}
                  <Link
                    href={`/search?q=${encodeURIComponent(searchQuery)}`}
                    className="search-view-all"
                    onClick={() => setShowDropdown(false)}
                  >
                    View all results for "{searchQuery}" →
                  </Link>
                </>
              )}
            </div>
          ) : null}
        </div>

        <nav class="nav-right">
          <ul class="nav-links">
            <li><Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>Home</Link></li>
            <li><Link href="/shop" className={`nav-link ${pathname === '/shop' ? 'active' : ''}`}>Shop</Link></li>
            <li><Link href="/categories" className={`nav-link ${pathname === '/categories' ? 'active' : ''}`}>All Categories</Link></li>
            <li className="nav-item-dropdown">
              <button type="button" className={`nav-dropdown-trigger ${['/verify', '/rewards', '/mystery-vault', '/blog'].includes(pathname) ? 'active' : ''}`}>
                Vault Features <span className="nav-dropdown-chevron">▼</span>
              </button>
              <div className="nav-dropdown-menu" role="menu">
                <Link href="/verify" className={`nav-dropdown-item ${pathname === '/verify' ? 'active' : ''}`}>
                  <span className="nav-dropdown-icon">🔍</span>
                  <div className="nav-dropdown-text">
                    <span className="nav-dropdown-title">Verify Certs</span>
                    <span className="nav-dropdown-desc">PSA &amp; BGS Forensic Audit</span>
                  </div>
                </Link>
                <Link href="/mystery-vault" className={`nav-dropdown-item ${pathname === '/mystery-vault' ? 'active' : ''}`}>
                  <span className="nav-dropdown-icon">🎁</span>
                  <div className="nav-dropdown-text">
                    <span className="nav-dropdown-title">Mystery Vault</span>
                    <span className="nav-dropdown-desc">Live Box Simulator &amp; Drops</span>
                  </div>
                </Link>
                <Link href="/blog" className={`nav-dropdown-item ${pathname === '/blog' ? 'active' : ''}`}>
                  <span className="nav-dropdown-icon">📰</span>
                  <div className="nav-dropdown-text">
                    <span className="nav-dropdown-title">The Journal</span>
                    <span className="nav-dropdown-desc">Market News &amp; Master Guides</span>
                  </div>
                </Link>
                <Link href="/rewards" className={`nav-dropdown-item ${pathname === '/rewards' ? 'active' : ''}`}>
                  <span className="nav-dropdown-icon">🪙</span>
                  <div className="nav-dropdown-text">
                    <span className="nav-dropdown-title">VIP Rewards</span>
                    <span className="nav-dropdown-desc">PokéCoins &amp; Collector Perks</span>
                  </div>
                </Link>
              </div>
            </li>
            <li><Link href="/about" className={`nav-link ${pathname === '/about' ? 'active' : ''}`}>About</Link></li>
          </ul>

          <button className="mobile-nav-toggle" onClick={() => setMobileMenuOpen(true)} aria-label="Open Mobile Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </nav>
      </header>

      {/* MOBILE NAVIGATION DRAWER OVERLAY */}
      <div className={`mobile-nav-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setMobileMenuOpen(false); }}>
        <div class="mobile-nav-menu">
          <div class="mobile-nav-header">
            <div class="logo-stamp">
              <div class="logo-badge">POKÉVAULT</div>
            </div>
            <button class="mobile-nav-close" onClick={() => setMobileMenuOpen(false)}>&times;</button>
          </div>
          <ul class="mobile-nav-links">
            <li><Link href="/" className={`mobile-nav-link ${pathname === '/' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>⚡ Home</Link></li>
            <li><Link href="/shop" className={`mobile-nav-link ${pathname === '/shop' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>🛒 Shop All Merchandise</Link></li>
            <li><Link href="/categories" className={`mobile-nav-link ${pathname === '/categories' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>🏷️ All Categories</Link></li>
            <li className="mobile-nav-divider"><span>VAULT FEATURES</span></li>
            <li><Link href="/verify" className={`mobile-nav-link ${pathname === '/verify' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>🔍 Verify PSA Slabs</Link></li>
            <li><Link href="/mystery-vault" className={`mobile-nav-link ${pathname === '/mystery-vault' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>🎁 Mystery Vault Simulator</Link></li>
            <li><Link href="/blog" className={`mobile-nav-link ${pathname === '/blog' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>📰 The PokéVault Journal</Link></li>
            <li><Link href="/rewards" className={`mobile-nav-link ${pathname === '/rewards' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>🪙 PokéCoins VIP Rewards</Link></li>
            <li className="mobile-nav-divider"><span>MORE</span></li>
            <li><Link href="/track" className={`mobile-nav-link ${pathname === '/track' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>📦 Track My Package</Link></li>
            <li><Link href="/about" className={`mobile-nav-link ${pathname === '/about' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>📜 About PokéVault</Link></li>
            <li><Link href="/wishlist" className={`mobile-nav-link ${pathname === '/wishlist' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>❤️ My Saved Wishlist</Link></li>
            <li><Link href="/cart" className={`mobile-nav-link ${pathname === '/cart' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>🛍️ Shopping Cart</Link></li>
          </ul>
        </div>
      </div>
    </>
  );
}
