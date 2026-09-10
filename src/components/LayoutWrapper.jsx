'use client';

import React, { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import CartDrawer from './CartDrawer';

export default function LayoutWrapper({ children }) {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <Navbar onOpenCart={() => setIsCartOpen(true)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      {children}
      <Footer />
    </>
  );
}
