/**
 * POKÉVAULT LEGENDS — Centralized State Store
 * Manages Cart & Wishlist persistence with custom event listeners
 */

import { getProductById } from '../data/products.js';

// Initial state getters
export const getCart = () => {
  try {
    return JSON.parse(localStorage.getItem('pvCart') || '[]');
  } catch (e) {
    return [];
  }
};

export const getWishlist = () => {
  try {
    return JSON.parse(localStorage.getItem('pvWishlist') || '[]');
  } catch (e) {
    return [];
  }
};

// Dispatch Custom Events
const dispatchCartUpdate = () => {
  window.dispatchEvent(new CustomEvent('pv-cart-updated', { detail: getCart() }));
};

const dispatchWishlistUpdate = () => {
  window.dispatchEvent(new CustomEvent('pv-wishlist-updated', { detail: getWishlist() }));
};

// Cart Actions
export const addToCart = (productId, qty = 1) => {
  const cart = getCart();
  const product = getProductById(productId);
  if (!product) return;

  const existingIndex = cart.findIndex(item => item.id === productId || item.product?.id === productId);
  if (existingIndex !== -1) {
    cart[existingIndex].quantity = Math.max(1, cart[existingIndex].quantity + qty);
  } else {
    cart.push({
      id: productId,
      product: product,
      quantity: Math.max(1, qty),
      addedAt: new Date().toISOString()
    });
  }

  localStorage.setItem('pvCart', JSON.stringify(cart));
  dispatchCartUpdate();
};

export const removeFromCart = (productId) => {
  let cart = getCart();
  cart = cart.filter(item => item.id !== productId && item.product?.id !== productId);
  localStorage.setItem('pvCart', JSON.stringify(cart));
  dispatchCartUpdate();
};

export const updateCartQty = (productId, qty) => {
  const cart = getCart();
  const index = cart.findIndex(item => item.id === productId || item.product?.id === productId);
  if (index !== -1) {
    if (qty <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = Math.max(1, Math.floor(qty));
    }
    localStorage.setItem('pvCart', JSON.stringify(cart));
    dispatchCartUpdate();
  }
};

export const clearCart = () => {
  localStorage.setItem('pvCart', JSON.stringify([]));
  dispatchCartUpdate();
};

export const getCartSubtotal = () => {
  const cart = getCart();
  return cart.reduce((sum, item) => {
    const product = item.product || getProductById(item.id);
    const price = product ? product.price : 0;
    return sum + (price * item.quantity);
  }, 0);
};

// Promo code & insurance state
let appliedPromo = { code: '', discountPercent: 0 };
let insuranceEnabled = true;

export const applyPromoCode = (code) => {
  const cleanCode = (code || '').toUpperCase().trim();
  if (cleanCode === 'POKEVAULT10') {
    appliedPromo = { code: 'POKEVAULT10', discountPercent: 10 };
    return { success: true, message: '★ 10% Vault Collector Discount Applied!' };
  } else if (cleanCode === 'LEGENDS20') {
    appliedPromo = { code: 'LEGENDS20', discountPercent: 20 };
    return { success: true, message: '★ 20% Legend Special Discount Applied!' };
  }
  return { success: false, message: 'Invalid promo code. Try POKEVAULT10 or LEGENDS20' };
};

export const getPromoState = () => appliedPromo;

export const setInsurance = (enabled) => {
  insuranceEnabled = !!enabled;
  dispatchCartUpdate();
};

export const getInsuranceState = () => insuranceEnabled;

// Wishlist Actions
export const isInWishlist = (productId) => {
  const wishlist = getWishlist();
  return wishlist.includes(productId);
};

export const toggleWishlist = (productId) => {
  let wishlist = getWishlist();
  let added = false;
  if (wishlist.includes(productId)) {
    wishlist = wishlist.filter(id => id !== productId);
  } else {
    wishlist.push(productId);
    added = true;
  }
  localStorage.setItem('pvWishlist', JSON.stringify(wishlist));
  dispatchWishlistUpdate();
  return added;
};

// ==========================================================================
// MULTI-CURRENCY CONVERTER SYSTEM (INR, USD, EUR, GBP, JPY)
// ==========================================================================
export const CURRENCY_RATES = {
  INR: { symbol: '₹', rate: 83.0, label: 'INR (₹)' },
  USD: { symbol: '$', rate: 1.0, label: 'USD ($)' },
  EUR: { symbol: '€', rate: 0.92, label: 'EUR (€)' },
  GBP: { symbol: '£', rate: 0.79, label: 'GBP (£)' },
  JPY: { symbol: '¥', rate: 155.0, label: 'JPY (¥)' }
};

export const getCurrency = () => {
  return localStorage.getItem('pvCurrency') || 'INR';
};

export const setCurrency = (currCode) => {
  if (CURRENCY_RATES[currCode]) {
    localStorage.setItem('pvCurrency', currCode);
    window.dispatchEvent(new CustomEvent('pv-currency-changed', { detail: currCode }));
  }
};

export const formatPrice = (priceUSD, targetCurrency = null) => {
  const curr = targetCurrency || getCurrency();
  const config = CURRENCY_RATES[curr] || CURRENCY_RATES.INR;
  
  // If price is stored in USD
  const converted = priceUSD * config.rate;
  
  if (curr === 'INR' || curr === 'JPY') {
    return `${config.symbol}${Math.round(converted).toLocaleString('en-IN')}`;
  }
  return `${config.symbol}${converted.toFixed(2)}`;
};

// ==========================================================================
// POKÉCOINS LOYALTY & REWARDS STATE
// ==========================================================================
export const getPokeCoins = () => {
  return parseInt(localStorage.getItem('pvCoins') || '450', 10);
};

export const addPokeCoins = (amount) => {
  const current = getPokeCoins();
  const updated = Math.max(0, current + amount);
  localStorage.setItem('pvCoins', updated.toString());
  window.dispatchEvent(new CustomEvent('pv-coins-updated', { detail: updated }));
  return updated;
};

export const getStreakData = () => {
  try {
    return JSON.parse(localStorage.getItem('pvStreak') || '{"count": 3, "lastClaimed": ""}');
  } catch (e) {
    return { count: 3, lastClaimed: "" };
  }
};

export const claimDailyStreak = () => {
  const today = new Date().toISOString().split('T')[0];
  const streak = getStreakData();
  
  if (streak.lastClaimed === today) {
    return { success: false, message: "You already claimed today's streak bonus! Come back tomorrow." };
  }

  streak.count = (streak.count % 7) + 1;
  streak.lastClaimed = today;
  localStorage.setItem('pvStreak', JSON.stringify(streak));
  
  const bonusCoins = 50 * streak.count;
  addPokeCoins(bonusCoins);
  
  return { success: true, bonusCoins, streakCount: streak.count };
};

