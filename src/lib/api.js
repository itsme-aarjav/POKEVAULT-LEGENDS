/**
 * PokéVault Legends — Production REST API Client
 * Connects Frontend & Admin Control Center to the Express & MySQL Backend
 */

const API_BASE = '/api';

const getAdminToken = () => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('pvAdminToken') || localStorage.getItem('pvAdminToken') || sessionStorage.getItem('pvAdminKey') || localStorage.getItem('pvAdminKey') || '';
  }
  return '';
};

const getHeaders = (requiresAdmin = false) => {
  const headers = { 'Content-Type': 'application/json' };
  if (requiresAdmin) {
    const token = getAdminToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Admin-Key'] = token;
    }
  }
  return headers;
};

// Health and connection
export const checkApiHealth = async () => {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return await res.json();
  } catch (e) {
    return { status: 'offline', error: e.message };
  }
};

export const isDatabaseConnected = async () => {
  const health = await checkApiHealth();
  return health?.database === 'mysql-connected';
};

// Store settings and hype drop
export const getStoreSettings = async () => {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    const data = await res.json();
    return data.data || {
      is_hype_drop_active: false,
      drop_password: 'POKEVAULTVIP',
      drop_timestamp: '2026-10-01T00:00:00.000Z',
      opt_in_count: 342
    };
  } catch (err) {
    console.warn('Error reading store_settings:', err);
    return {
      is_hype_drop_active: false,
      drop_password: 'POKEVAULTVIP',
      drop_timestamp: '2026-10-01T00:00:00.000Z',
      opt_in_count: 342
    };
  }
};

export const updateStoreSettings = async (settings) => {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(settings)
    });
    return await res.json();
  } catch (err) {
    console.error('Error updating store_settings:', err);
    return { success: false, error: err.message };
  }
};

export const optInHypeDrop = async () => {
  try {
    const res = await fetch(`${API_BASE}/settings/opt-in`, { method: 'POST' });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Admin authentication
export const loginAdmin = async (passkey) => {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: passkey })
    });
    const data = await res.json();
    if (data.success && data.token && typeof window !== 'undefined') {
      sessionStorage.setItem('pvAdminToken', data.token);
      sessionStorage.removeItem('pvAdminKey');
      localStorage.removeItem('pvAdminKey');
    }
    return data;
  } catch (err) {
    return { success: false, message: err.message };
  }
};

export const logoutAdmin = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('pvAdminToken');
    localStorage.removeItem('pvAdminToken');
    sessionStorage.removeItem('pvAdminKey');
    localStorage.removeItem('pvAdminKey');
  }
};

export const verifyAdminSession = async () => {
  try {
    const token = getAdminToken();
    if (!token) return false;
    const res = await fetch(`${API_BASE}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Admin-Key': token
      }
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.authorized);
  } catch {
    return false;
  }
};

// ============================================================================
// Catalog Normalization, Caching & Deduplication (PV-011)
// ============================================================================

export const normalizeProduct = (raw) => {
  if (!raw || typeof raw !== 'object') return null;

  const id = String(raw.id || '');
  const rawPrice = Number(raw.price);
  const price = isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice;
  const rawOriginalPrice = raw.originalPrice != null
    ? Number(raw.originalPrice)
    : (raw.original_price != null ? Number(raw.original_price) : null);
  const originalPrice = rawOriginalPrice != null && !isNaN(rawOriginalPrice)
    ? Math.max(0, rawOriginalPrice)
    : (price ? Math.round(price * 1.15) : 0);
  const rawDiscount = raw.discountPercent != null
    ? Number(raw.discountPercent)
    : (raw.discount_percent != null ? Number(raw.discount_percent) : null);
  const discountPercent = rawDiscount != null && !isNaN(rawDiscount)
    ? Math.max(0, rawDiscount)
    : (originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0);
  const rawStock = Number(raw.inStock != null ? raw.inStock : (raw.in_stock != null ? raw.in_stock : 10));
  const inStock = isNaN(rawStock) || rawStock < 0 ? 0 : rawStock;
  const rating = Number(raw.rating != null ? raw.rating : 5.0);
  const reviewCount = Number(raw.reviewCount != null ? raw.reviewCount : (raw.review_count != null ? raw.review_count : 1));
  const isFeatured = Boolean(raw.isFeatured ?? raw.is_featured);
  const isTrending = Boolean(raw.isTrending ?? raw.is_trending);
  const isBestseller = Boolean(raw.isBestseller ?? raw.is_bestseller);
  const isNew = Boolean(raw.isNew ?? raw.is_new);
  const subName = raw.subName || raw.sub_name || '';
  const category = raw.category || 'trading-cards';
  const categoryName = raw.categoryName || raw.category_name || (category.replace(/-/g, ' ').toUpperCase());
  const eraCode = raw.eraCode || raw.era_code || '';
  const shortDescription = raw.shortDescription || raw.short_description || raw.description || '';
  const description = raw.description || shortDescription;
  const image = raw.image || '/assets/card_detail.png';

  let gallery = raw.gallery;
  if (typeof gallery === 'string') {
    try { gallery = JSON.parse(gallery); } catch { gallery = [image]; }
  }
  if (!Array.isArray(gallery) || gallery.length === 0) {
    gallery = [image, '/assets/card_back.png', '/assets/card_detail.png'];
  }

  let specs = raw.specs;
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs); } catch { specs = {}; }
  }
  if (!specs || typeof specs !== 'object') {
    specs = {};
  }

  let tags = raw.tags;
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags); } catch { tags = []; }
  }
  if (!Array.isArray(tags)) {
    tags = [];
  }

  return {
    ...raw,
    id,
    sku: raw.sku || `CARD-${id.toUpperCase()}`,
    name: raw.name || 'Vault Card',
    subName,
    sub_name: subName,
    category,
    categoryName,
    category_name: categoryName,
    pokemon: raw.pokemon || 'Pokémon',
    price,
    originalPrice,
    original_price: originalPrice,
    discountPercent,
    discount_percent: discountPercent,
    image,
    gallery,
    shortDescription,
    short_description: shortDescription,
    description,
    rating,
    reviewCount,
    review_count: reviewCount,
    inStock,
    in_stock: inStock,
    availability: inStock > 0 ? 'In Stock' : 'Out of Stock',
    tags,
    badge: raw.badge || '',
    isFeatured,
    is_featured: isFeatured,
    isTrending,
    is_trending: isTrending,
    isBestseller,
    is_bestseller: isBestseller,
    isNew,
    is_new: isNew,
    specs,
    eraCode,
    era_code: eraCode
  };
};

// In-flight request deduplication and short TTL response cache (30s)
const catalogRequestCache = new Map();
const catalogDataCache = new Map();
const CATALOG_CACHE_TTL_MS = 30000;

export const invalidateCatalogCache = () => {
  catalogDataCache.clear();
  catalogRequestCache.clear();
};

export const getProducts = async (params = {}, options = {}) => {
  const { forceRefresh = false } = options;
  const queryString = new URLSearchParams(params).toString();
  const cacheKey = `list:${queryString}`;

  if (!forceRefresh) {
    const cached = catalogDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CATALOG_CACHE_TTL_MS) {
      return cached.data;
    }
    if (catalogRequestCache.has(cacheKey)) {
      return catalogRequestCache.get(cacheKey);
    }
  }

  const fetchPromise = (async () => {
    try {
      const url = `${API_BASE}/cards${queryString ? `?${queryString}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        let errBody = {};
        try { errBody = await res.json(); } catch {}
        return {
          success: false,
          status: res.status,
          error: errBody.message || errBody.error || `HTTP ${res.status}`
        };
      }
      const json = await res.json();
      const rawList = Array.isArray(json?.data)
        ? json.data
        : (Array.isArray(json?.cards)
          ? json.cards
          : (Array.isArray(json?.products)
            ? json.products
            : (Array.isArray(json) ? json : null)));

      if (!rawList) {
        return {
          success: false,
          error: 'Malformed catalog response: expected array under data property'
        };
      }

      const normalizedList = rawList.map(normalizeProduct).filter(Boolean);
      const result = {
        success: true,
        count: normalizedList.length,
        data: normalizedList,
        source: json.source || 'catalog-service'
      };

      catalogDataCache.set(cacheKey, { timestamp: Date.now(), data: result });
      return result;
    } catch (err) {
      return { success: false, error: err.message || 'Network error connecting to catalog service' };
    } finally {
      catalogRequestCache.delete(cacheKey);
    }
  })();

  catalogRequestCache.set(cacheKey, fetchPromise);
  return fetchPromise;
};

export const getProduct = async (id, options = {}) => {
  if (!id) {
    return { success: false, notFound: true, message: 'Card ID is required' };
  }

  const { forceRefresh = false } = options;
  const cacheKey = `item:${id}`;

  if (!forceRefresh) {
    const cached = catalogDataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CATALOG_CACHE_TTL_MS) {
      return cached.data;
    }
    if (catalogRequestCache.has(cacheKey)) {
      return catalogRequestCache.get(cacheKey);
    }
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(id)}`);
      if (res.status === 404) {
        return { success: false, notFound: true, message: 'Product not found' };
      }
      if (!res.ok) {
        let errBody = {};
        try { errBody = await res.json(); } catch {}
        return {
          success: false,
          status: res.status,
          error: errBody.message || errBody.error || `HTTP ${res.status}`
        };
      }
      const json = await res.json();
      const rawItem = json?.data || json?.card || json?.product || (json && typeof json === 'object' && json.id ? json : null);
      if (!rawItem || typeof rawItem !== 'object') {
        return {
          success: false,
          error: 'Malformed catalog response: card data missing'
        };
      }

      const normalized = normalizeProduct(rawItem);
      const result = {
        success: true,
        data: normalized
      };

      catalogDataCache.set(cacheKey, { timestamp: Date.now(), data: result });
      return result;
    } catch (err) {
      return { success: false, error: err.message || 'Network error connecting to catalog service' };
    } finally {
      catalogRequestCache.delete(cacheKey);
    }
  })();

  catalogRequestCache.set(cacheKey, fetchPromise);
  return fetchPromise;
};

export const saveProduct = async (product) => {
  try {
    const res = await fetch(`${API_BASE}/cards`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(product)
    });
    const data = await res.json();
    if (data.success) {
      invalidateCatalogCache();
    }
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const getInventory = async () => {
  try {
    const res = await fetch(`${API_BASE}/inventory`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const updateInventory = async (cardId, data) => {
  try {
    const res = await fetch(`${API_BASE}/inventory/${cardId}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (json.success) {
      invalidateCatalogCache();
    }
    return json;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Orders
export const getOrders = async () => {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: getHeaders(true)
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const getOrder = async (orderId, orderToken = '') => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    const adminToken = getAdminToken();
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
      headers['X-Admin-Key'] = adminToken;
    }
    if (orderToken) {
      headers['X-Order-Token'] = orderToken;
      if (!adminToken) {
        headers['Authorization'] = `Bearer ${orderToken}`;
      }
    }
    // PV-006: Strictly send token via headers; query parameter is removed
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`, {
      headers
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// PayPal REST API client helpers (PV-008)
export const createPayPalOrder = async (payload) => {
  try {
    const res = await fetch(`${API_BASE}/paypal/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const capturePayPalOrder = async (payload) => {
  try {
    const res = await fetch(`${API_BASE}/paypal/capture-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};


export const createOrder = async (orderData) => {
  try {
    const headers = { 'Content-Type': 'application/json' };
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData)
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const updateOrderStatus = async (orderId, updateData) => {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(updateData)
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const deleteOrder = async (orderId) => {
  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: 'DELETE',
      headers: getHeaders(true)
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Discounts and promo codes
const DEFAULT_DISCOUNTS = [
  {
    id: 'd1',
    code: 'POKEVAULT10',
    type: 'percentage',
    value: 10,
    summary: '10% off entire order (Storewide VIP)',
    appliesTo: 'entire_store',
    minRequirement: { type: 'minimum_amount', value: 0 },
    customerEligibility: 'all',
    totalUses: 0,
    maxUses: 1000,
    startsAt: '2026-01-01',
    endsAt: '2027-12-31',
    status: 'Active'
  },
  {
    id: 'd2',
    code: 'FREESHIP',
    type: 'free_shipping',
    value: 0,
    summary: 'Free Armored Vault Courier Shipping',
    appliesTo: 'entire_store',
    minRequirement: { type: 'minimum_amount', value: 100 },
    customerEligibility: 'all',
    totalUses: 0,
    maxUses: 500,
    startsAt: '2026-01-01',
    endsAt: '2027-12-31',
    status: 'Active'
  },
  {
    id: 'd3',
    code: 'LEGENDS20',
    type: 'percentage',
    value: 20,
    summary: '20% off high-tier Pokémon cards & items',
    appliesTo: 'entire_store',
    minRequirement: { type: 'minimum_amount', value: 150 },
    customerEligibility: 'all',
    totalUses: 0,
    maxUses: 250,
    startsAt: '2026-01-01',
    endsAt: '2027-12-31',
    status: 'Active'
  }
];

export const getDiscounts = () => {
  if (typeof window === 'undefined') return DEFAULT_DISCOUNTS;
  try {
    const saved = localStorage.getItem('pokevault_active_discounts');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Error reading discounts:', e);
  }
  return DEFAULT_DISCOUNTS;
};

export const saveDiscounts = (discounts) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('pokevault_active_discounts', JSON.stringify(discounts));
  } catch (e) {
    console.error('Error saving discounts:', e);
  }
};

