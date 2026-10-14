'use client';

import React from 'react';
import AdminProtectedRoute from './AdminProtectedRoute.jsx';
import BackendAdminShell from './dashboard/BackendAdminShell.jsx';

/**
 * AdminDashboard Main Container Component (Backend Dashboard Architecture)
 * Aggregates all 4 core merchant modules:
 * - Module 1: Overview & Analytics Engine
 * - Module 2: Catalog & Inventory Management
 * - Module 3: Manual Order Creation (Draft Orders)
 * - Module 4: Promotions & Coupon Engine (BXGY, Free Shipping, Percentage)
 */
export default function AdminDashboard() {
  return (
    <AdminProtectedRoute>
      <BackendAdminShell />
    </AdminProtectedRoute>
  );
}
