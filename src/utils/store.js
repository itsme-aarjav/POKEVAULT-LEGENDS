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

  const stock = product.in_stock !== undefined ? Number(product.in_stock) : (product.inStock !== undefined ? Number(product.inStock) : 10);
  if (stock <= 0) {
    if (typeof window !== 'undefined') {
      alert(`⚠️ "${product.name}" is currently out of stock and cannot be added to your vault cart.`);
    }
    return;
  }

  const existingIndex = cart.findIndex(item => item.id === productId || item.product?.id === productId);
  if (existingIndex !== -1) {
    const newQty = cart[existingIndex].quantity + qty;
    cart[existingIndex].quantity = Math.max(1, Math.min(stock, newQty));
  } else {
    cart.push({
      id: productId,
      product: product,
      quantity: Math.max(1, Math.min(stock, qty)),
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

// Promo code & insurance state with LocalStorage persistence
export const getPromoState = () => {
  try {
    const raw = localStorage.getItem('pvPromo');
    if (!raw) return { code: '', discountPercent: 0, type: 'none', value: 0, description: '' };
    return JSON.parse(raw);
  } catch (e) {
    return { code: '', discountPercent: 0, type: 'none', value: 0, description: '' };
  }
};

export const applyPromoCode = (code) => {
  const cleanCode = (code || '').toUpperCase().trim();
  let promo = null;

  // 1. Check custom admin discounts from localStorage
  try {
    const rawDiscounts = localStorage.getItem('pokevault_active_discounts');
    if (rawDiscounts) {
      const customDiscounts = JSON.parse(rawDiscounts);
      const found = customDiscounts.find(d => d.code && d.code.toUpperCase() === cleanCode);
      if (found && found.status !== 'Disabled') {
        if (found.type === 'percentage') {
          promo = { code: found.code, discountPercent: Number(found.value) || 10, type: 'percent', value: Number(found.value) || 10, description: `${found.value}% Discount (${found.code})` };
        } else if (found.type === 'fixed_amount') {
          promo = { code: found.code, discountPercent: 0, type: 'fixed', value: Number(found.value) || 10, fixedINR: (Number(found.value) || 10) * 83, description: `$${found.value} Discount (${found.code})` };
        } else if (found.type === 'free_shipping') {
          promo = { code: found.code, discountPercent: 0, type: 'shipping', freeShipping: true, description: `Free Shipping (${found.code})` };
        }
      }
    }
  } catch (e) {
    console.warn('Error matching dynamic discounts:', e);
  }

  // 2. Standard built-in codes
  if (!promo) {
    if (cleanCode === 'POKEVAULT10') {
      promo = { code: 'POKEVAULT10', discountPercent: 10, type: 'percent', value: 10, description: '10% Vault Collector Discount' };
    } else if (cleanCode === 'LEGENDS20') {
      promo = { code: 'LEGENDS20', discountPercent: 20, type: 'percent', value: 20, description: '20% Legend Special Discount' };
    } else if (cleanCode === 'VIP15PASS') {
      promo = { code: 'VIP15PASS', discountPercent: 15, type: 'percent', value: 15, description: '15% VIP Collector Pass' };
    } else if (cleanCode === 'COIN250') {
      promo = { code: 'COIN250', discountPercent: 0, type: 'fixed', fixedINR: 250, value: 3.01, description: '₹250 PokéCoins Voucher' };
    } else if (cleanCode === 'COIN500') {
      promo = { code: 'COIN500', discountPercent: 0, type: 'fixed', fixedINR: 500, value: 6.02, description: '₹500 PokéCoins Voucher' };
    } else if (cleanCode === 'FREESHIP' || cleanCode === 'FREESHIPVIP') {
      promo = { code: cleanCode, discountPercent: 0, type: 'shipping', freeShipping: true, description: 'Free Armored Vault Courier Shipping' };
    } else if (cleanCode === 'FREEBOOSTER') {
      promo = { code: 'FREEBOOSTER', discountPercent: 0, type: 'gift', gift: 'Free Japanese Booster Pack', description: 'Free Booster Pack Voucher' };
    }
  }

  if (promo) {
    localStorage.setItem('pvPromo', JSON.stringify(promo));
    window.dispatchEvent(new CustomEvent('pv-promo-updated', { detail: promo }));
    dispatchCartUpdate();
    return { success: true, message: `★ ${promo.description} Applied!`, promo };
  }
  return { success: false, message: 'Invalid promo code. Try POKEVAULT10 or LEGENDS20' };
};

export const removePromoCode = () => {
  localStorage.removeItem('pvPromo');
  const empty = { code: '', discountPercent: 0, type: 'none', value: 0, description: '' };
  window.dispatchEvent(new CustomEvent('pv-promo-updated', { detail: empty }));
  dispatchCartUpdate();
  return { success: true, message: 'Promo code removed.' };
};

export const setInsurance = (enabled) => {
  localStorage.setItem('pvInsurance', enabled ? 'true' : 'false');
  dispatchCartUpdate();
};

export const getInsuranceState = () => {
  const val = localStorage.getItem('pvInsurance');
  return val === null ? true : val === 'true';
};

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

