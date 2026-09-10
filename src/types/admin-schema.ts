/**
 * POKÉVAULT LEGENDS — Shopify Polaris Admin TypeScript Schemas & Data Models
 * Enterprise data contracts for Analytics, Catalog, Draft Orders, and Promotions.
 */

// ── 1. Analytics & KPI Types ─────────────────────────────────────────
export interface KPISummary {
  totalSales: number;
  salesGrowthPercent: number;
  onlineStoreSessions: number;
  uniqueVisitors: number;
  liveVisitors: number;
  conversionFunnel: {
    sessions: number;
    addedToCart: number;
    addedToCartRate: number;
    reachedCheckout: number;
    reachedCheckoutRate: number;
    sessionsConverted: number;
    conversionRatePercent: number;
  };
  averageOrderValue: number;
  totalOrdersPlaced: number;
  returningCustomerRatePercent: number;
}

export interface TrafficSourceMetric {
  source: 'Organic Search' | 'Direct Traffic' | 'Social (Instagram/TikTok)' | 'Paid Ads (Google/Meta)';
  visitors: number;
  revenue: number;
  sharePercent: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface TimeSeriesPoint {
  timestamp: string;
  sales: number;
  orders: number;
  sessions: number;
}

// ── 2. Product & Inventory Types ─────────────────────────────────────
export type ProductStatus = 'Active' | 'Draft' | 'Archived';

export interface MediaAsset {
  id: string;
  url: string;
  altText: string;
  isHero: boolean;
  fileSize?: string;
  width?: number;
  height?: number;
}

export interface ProductOption {
  id: string;
  name: string; // e.g. "Size", "Grade", "Material"
  values: string[];
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string;
  barcode?: string;
  price: number;
  compareAtPrice?: number;
  costPerItem?: number;
  optionValues: Record<string, string>;
  inventory: {
    available: number;
    committed: number;
    onHand: number;
    lowStockThreshold: number;
    trackQuantity: boolean;
    continueSellingWhenOutOfStock: boolean;
    locations: {
      locationName: string;
      onHand: number;
    }[];
  };
}

export interface AdminProduct {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  category: string;
  vendor: string;
  tags: string[];
  status: ProductStatus;
  media: MediaAsset[];
  options: ProductOption[];
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

// ── 3. Draft Order Types ─────────────────────────────────────────────
export type PaymentStatus = 'Paid' | 'Pending' | 'Invoice Sent' | 'Refunded';

export interface DraftOrderCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  shippingAddress: {
    address1: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
}

export interface DraftOrderLineItem {
  id: string;
  productId?: string;
  variantId?: string;
  title: string;
  variantTitle?: string;
  thumbnail?: string;
  price: number;
  quantity: number;
  isCustomItem: boolean;
  taxable: boolean;
  appliedDiscount?: {
    type: 'percentage' | 'fixed_amount';
    value: number;
  };
}

export interface DraftOrder {
  id: string;
  orderNumber: string;
  customer: DraftOrderCustomer | null;
  lineItems: DraftOrderLineItem[];
  subtotal: number;
  discountTotal: number;
  shippingMethod: {
    id: string;
    name: string;
    price: number;
  };
  taxRatePercent: number;
  taxTotal: number;
  grandTotal: number;
  notes: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

// ── 4. Promotions & Discount Types ───────────────────────────────────
export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping' | 'bxgy';

export interface DiscountRule {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  bxgyConfig?: {
    customerBuysQuantity: number;
    customerGetsQuantity: number;
    getDiscountPercentage: number;
  };
  appliesTo: 'entire_store' | 'specific_collections' | 'specific_products';
  targetIds?: string[];
  minimumRequirement: {
    type: 'none' | 'minimum_amount' | 'minimum_quantity';
    value: number;
  };
  customerEligibility: 'all' | 'specific_segments' | 'specific_customers';
  usageLimit?: {
    totalUsesMax?: number;
    currentUses: number;
    oncePerCustomer: boolean;
  };
  startsAt: string;
  endsAt?: string;
  isActive: boolean;
}
