'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getProductById } from '../data/products.js';

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [appliedPromo, setAppliedPromo] = useState({ code: '', discountPercent: 0 });
  const [insuranceEnabled, setInsuranceEnabled] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load state from localStorage on client mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('pvCart');
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedWishlist = localStorage.getItem('pvWishlist');
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('pvCart', JSON.stringify(cart));
    }
  }, [cart, isHydrated]);

  // Save wishlist to localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('pvWishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, isHydrated]);

  const addToCart = (productId, qty = 1) => {
    const product = getProductById(productId);
    if (!product) return;

    setCart(prevCart => {
      const existingIdx = prevCart.findIndex(item => item.id === productId || item.product?.id === productId);
      if (existingIdx !== -1) {
        const next = [...prevCart];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + qty
        };
        return next;
      }
      return [...prevCart, { id: productId, product, quantity: qty }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId && item.product?.id !== productId));
  };

  const updateCartQty = (productId, qty) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.id === productId || item.product?.id === productId) {
        return { ...item, quantity: Math.floor(qty) };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (productId) => {
    let added = false;
    setWishlist(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        added = true;
        return [...prev, productId];
      }
    });
    return added;
  };

  const isInWishlist = (productId) => {
    return wishlist.includes(productId);
  };

  const applyPromoCode = (code) => {
    const cleanCode = (code || '').toUpperCase().trim();
    if (cleanCode === 'POKEVAULT10') {
      setAppliedPromo({ code: 'POKEVAULT10', discountPercent: 10 });
      return { success: true, message: '★ 10% Vault Collector Discount Applied!' };
    } else if (cleanCode === 'LEGENDS20') {
      setAppliedPromo({ code: 'LEGENDS20', discountPercent: 20 });
      return { success: true, message: '★ 20% Legend Special Discount Applied!' };
    }
    return { success: false, message: 'Invalid promo code. Try POKEVAULT10 or LEGENDS20' };
  };

  const subtotal = cart.reduce((sum, item) => {
    const p = item.product || getProductById(item.id);
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);

  const discountAmount = appliedPromo.discountPercent > 0 ? (subtotal * appliedPromo.discountPercent) / 100 : 0;
  const shippingCost = insuranceEnabled ? 9.99 : 0;
  const total = Math.max(0, subtotal - discountAmount + shippingCost);

  return (
    <StoreContext.Provider value={{
      cart,
      wishlist,
      addToCart,
      removeFromCart,
      updateCartQty,
      clearCart,
      toggleWishlist,
      isInWishlist,
      appliedPromo,
      applyPromoCode,
      insuranceEnabled,
      setInsuranceEnabled,
      subtotal,
      discountAmount,
      shippingCost,
      total,
      isHydrated
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
