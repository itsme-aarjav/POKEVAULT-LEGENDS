'use client';

import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';

/**
 * CompleteTheFit Component ("Complete the Trainer Fit")
 * 
 * A high-converting cross-sell bundle component designed for Product Detail Pages (PDP).
 * Dynamically pairs a main product with a matching accessory, bag, or protection item,
 * calculates bundle discounts in real-time, supports size/variant selection, and adds
 * both items to the Cart Drawer in a single seamless action.
 * 
 * @param {Object} props
 * @param {Object} props.mainProduct - Main product details ({ id, name, price, image, selectedSize, sizeVariants })
 * @param {Object} props.bundleProduct - Cross-sell product details ({ id, name, price, image, discountPercentage, sizeVariants })
 * @param {Function} [props.onAddToCart] - Optional custom handler when items are added to cart
 * @param {Function} [props.onOpenCart] - Optional callback to open the Cart Drawer
 */
export default function CompleteTheFit({
  mainProduct = {
    id: 'prod_gengar_hoodie',
    name: 'Gengar Heavyweight Hoodie',
    price: 65.00,
    image: '/assets/apparel_gengar_hoodie.png',
    selectedSize: 'L',
    sizeVariants: ['S', 'M', 'L', 'XL', '2XL']
  },
  bundleProduct = {
    id: 'prod_gengar_sling',
    name: 'Gengar Tactical Sling Bag',
    price: 35.00,
    image: '/assets/bag_gengar_sling.png',
    discountPercentage: 10,
    sizeVariants: null
  },
  onAddToCart,
  onOpenCart
}) {
  // Store context fallback if integrated with global store
  const store = useStore?.() || {};

  // Local component state
  const [isMainChecked, setIsMainChecked] = useState(true);
  const [isBundleChecked, setIsBundleChecked] = useState(true);
  const [mainSize, setMainSize] = useState(mainProduct.selectedSize || (mainProduct.sizeVariants ? mainProduct.sizeVariants[0] : ''));
  const [crossSellSize, setCrossSellSize] = useState(bundleProduct.selectedSize || (bundleProduct.sizeVariants ? bundleProduct.sizeVariants[0] : ''));

  // Calculate pricing in real-time
  const discountPercent = bundleProduct.discountPercentage || 10;

  const { originalTotal, finalTotal, isDiscountActive, savingsAmount } = useMemo(() => {
    let rawTotal = 0;
    if (isMainChecked) rawTotal += mainProduct.price;
    if (isBundleChecked) rawTotal += bundleProduct.price;

    const discountEligible = isMainChecked && isBundleChecked;
    const discountFactor = discountEligible ? (1 - discountPercent / 100) : 1;
    const finalPrice = rawTotal * discountFactor;
    const saved = rawTotal - finalPrice;

    return {
      originalTotal: rawTotal,
      finalTotal: finalPrice,
      isDiscountActive: discountEligible,
      savingsAmount: saved
    };
  }, [isMainChecked, isBundleChecked, mainProduct.price, bundleProduct.price, discountPercent]);

  // Handle Add to Cart action
  const handleAddBundleToCart = () => {
    const itemsToAdd = [];

    if (isMainChecked) {
      itemsToAdd.push({
        id: mainProduct.id,
        name: mainProduct.name,
        price: isDiscountActive ? mainProduct.price * (1 - discountPercent / 100) : mainProduct.price,
        originalPrice: mainProduct.price,
        image: mainProduct.image || mainProduct.images?.[0],
        selectedSize: mainSize,
        quantity: 1,
        isBundleItem: isDiscountActive
      });
    }

    if (isBundleChecked) {
      itemsToAdd.push({
        id: bundleProduct.id,
        name: bundleProduct.name,
        price: isDiscountActive ? bundleProduct.price * (1 - discountPercent / 100) : bundleProduct.price,
        originalPrice: bundleProduct.price,
        image: bundleProduct.image || bundleProduct.images?.[0],
        selectedSize: crossSellSize,
        quantity: 1,
        isBundleItem: isDiscountActive
      });
    }

    if (itemsToAdd.length === 0) return;

    // Trigger custom onAddToCart prop or fallback to StoreContext
    if (onAddToCart) {
      onAddToCart(itemsToAdd);
    } else if (store.addToCart) {
      itemsToAdd.forEach(item => store.addToCart(item.id, 1, item));
    }

    // Open Cart Drawer
    if (onOpenCart) {
      onOpenCart();
    }
  };

  return (
    <section className="w-full max-w-4xl mx-auto my-8 p-5 sm:p-7 bg-zinc-950 text-white rounded-xl border-2 border-zinc-800 shadow-2xl transition-all duration-300">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-lg">⚡</span>
            <h3 className="font-extrabold text-xl sm:text-2xl uppercase tracking-wide text-white">
              Complete the Trainer Fit
            </h3>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Bundle &amp; Save <span className="text-amber-400 font-bold">{discountPercent}% OFF</span> on matching merch
          </p>
        </div>

        {isDiscountActive && (
          <span className="self-start sm:self-auto px-3 py-1 bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-md shadow-md animate-pulse">
            SAVE {discountPercent}% APPLIED
          </span>
        )}
      </div>

      {/* BUNDLE ITEMS BREAKDOWN GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-6">
        {/* ITEM 1: MAIN PRODUCT */}
        <div className="md:col-span-5 flex items-center gap-3 p-3 bg-zinc-900/90 border border-zinc-800 rounded-lg relative group">
          <input
            type="checkbox"
            id={`check_${mainProduct.id}`}
            checked={isMainChecked}
            onChange={(e) => setIsMainChecked(e.target.checked)}
            className="w-5 h-5 accent-amber-400 rounded cursor-pointer shrink-0"
          />
          
          <label htmlFor={`check_${mainProduct.id}`} className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-800 rounded-md overflow-hidden shrink-0 border border-zinc-700 p-1 flex items-center justify-center">
              <img
                src={mainProduct.image || mainProduct.images?.[0] || '/assets/placeholder.png'}
                alt={mainProduct.name}
                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-200"
              />
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">MAIN ITEM</span>
              <h4 className="font-bold text-sm sm:text-base text-zinc-100 truncate">{mainProduct.name}</h4>
              <p className="text-zinc-300 font-semibold text-sm mt-0.5">${mainProduct.price.toFixed(2)}</p>

              {/* SIZE / VARIANT SELECTOR */}
              {mainProduct.sizeVariants && mainProduct.sizeVariants.length > 0 && (
                <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <label htmlFor="mainSizeSelect" className="text-xs text-zinc-400 font-medium">Size:</label>
                  <select
                    id="mainSizeSelect"
                    value={mainSize}
                    onChange={(e) => setMainSize(e.target.value)}
                    className="bg-zinc-800 text-zinc-200 text-xs font-bold px-2 py-1 rounded border border-zinc-700 focus:outline-none focus:border-amber-400"
                  >
                    {mainProduct.sizeVariants.map(variant => (
                      <option key={variant} value={variant}>{variant}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* PLUS CONNECTOR ICON */}
        <div className="md:col-span-1 flex justify-center text-amber-400 font-extrabold text-2xl my-1 md:my-0">
          +
        </div>

        {/* ITEM 2: CROSS-SELL BUNDLE PRODUCT */}
        <div className={`md:col-span-6 flex items-center gap-3 p-3 bg-zinc-900/90 border rounded-lg relative transition-colors duration-200 ${isBundleChecked ? 'border-amber-400/50 bg-amber-950/10' : 'border-zinc-800'}`}>
          <input
            type="checkbox"
            id={`check_${bundleProduct.id}`}
            checked={isBundleChecked}
            onChange={(e) => setIsBundleChecked(e.target.checked)}
            className="w-5 h-5 accent-amber-400 rounded cursor-pointer shrink-0"
          />

          <label htmlFor={`check_${bundleProduct.id}`} className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-800 rounded-md overflow-hidden shrink-0 border border-zinc-700 p-1 flex items-center justify-center">
              <img
                src={bundleProduct.image || bundleProduct.images?.[0] || '/assets/placeholder.png'}
                alt={bundleProduct.name}
                className="max-w-full max-h-full object-contain hover:scale-105 transition-transform duration-200"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">MATCHING ADD-ON</span>
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  +{discountPercent}% OFF
                </span>
              </div>
              <h4 className="font-bold text-sm sm:text-base text-zinc-100 truncate">{bundleProduct.name}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-amber-400 font-bold text-sm">
                  ${(bundleProduct.price * (isDiscountActive ? (1 - discountPercent / 100) : 1)).toFixed(2)}
                </p>
                {isDiscountActive && (
                  <span className="text-xs text-zinc-500 line-through font-medium">
                    ${bundleProduct.price.toFixed(2)}
                  </span>
                )}
              </div>

              {/* SIZE / VARIANT SELECTOR */}
              {bundleProduct.sizeVariants && bundleProduct.sizeVariants.length > 0 && (
                <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <label htmlFor="bundleSizeSelect" className="text-xs text-zinc-400 font-medium">Variant:</label>
                  <select
                    id="bundleSizeSelect"
                    value={crossSellSize}
                    onChange={(e) => setCrossSellSize(e.target.value)}
                    className="bg-zinc-800 text-zinc-200 text-xs font-bold px-2 py-1 rounded border border-zinc-700 focus:outline-none focus:border-amber-400"
                  >
                    {bundleProduct.sizeVariants.map(variant => (
                      <option key={variant} value={variant}>{variant}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* PRICING & ACTION FOOTER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-800 bg-zinc-900/40 p-4 rounded-lg">
        {/* PRICE DISPLAY */}
        <div className="flex items-center gap-3 text-center sm:text-left">
          <span className="text-zinc-400 text-xs font-bold uppercase tracking-wide">Total Bundle Price:</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400">
              ${finalTotal.toFixed(2)}
            </span>
            {isDiscountActive && originalTotal > finalTotal && (
              <span className="text-sm sm:text-base text-zinc-500 line-through font-semibold">
                ${originalTotal.toFixed(2)}
              </span>
            )}
          </div>

          {isDiscountActive && savingsAmount > 0 && (
            <span className="hidden lg:inline-block text-xs font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded">
              You Save ${savingsAmount.toFixed(2)}!
            </span>
          )}
        </div>

        {/* ADD TO CART ACTION BUTTON */}
        <button
          type="button"
          onClick={handleAddBundleToCart}
          disabled={!isMainChecked && !isBundleChecked}
          className={`w-full sm:w-auto px-6 py-3.5 rounded-lg font-black text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
            isMainChecked || isBundleChecked
              ? 'bg-amber-400 hover:bg-amber-300 text-black hover:shadow-amber-400/20 active:scale-[0.98]'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
          }`}
        >
          <span>🛒</span>
          <span>
            {isMainChecked && isBundleChecked
              ? `Add Bundle to Cart ($${finalTotal.toFixed(2)})`
              : isMainChecked || isBundleChecked
              ? `Add Selected Item ($${finalTotal.toFixed(2)})`
              : 'Select An Item'}
          </span>
        </button>
      </div>
    </section>
  );
}
