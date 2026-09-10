/**
 * PokéVault Legends — Production REST API Client
 * Connects Frontend & Admin Control Center to the Express & MySQL Backend
 */

const API_BASE = '/api';

const getAdminKey = () => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('pvAdminKey') || localStorage.getItem('pvAdminKey') || '';
  }
  return '';
};

const getHeaders = (requiresAdmin = false) => {
  const headers = { 'Content-Type': 'application/json' };
  if (requiresAdmin) {
    const key = getAdminKey();
    if (key) headers['X-Admin-Key'] = key;
  }
  return headers;
};

// ─── Health & Connection ──────────────────────────────────────────────────
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

// ─── Store Settings & Hype Drop ───────────────────────────────────────────
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

// ─── Admin Authentication ─────────────────────────────────────────────────
export const loginAdmin = async (passkey) => {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: passkey })
    });
    const data = await res.json();
    if (data.success && typeof window !== 'undefined') {
      sessionStorage.setItem('pvAdminKey', passkey);
    }
    return data;
  } catch (err) {
    return { success: false, message: err.message };
  }
};

export const verifyAdminSession = async () => {
  try {
    const key = getAdminKey();
    if (!key) return false;
    const res = await fetch(`${API_BASE}/auth/verify`, {
      headers: { 'X-Admin-Key': key }
    });
    const data = await res.json();
    return Boolean(data.authorized);
  } catch {
    return false;
  }
};

// ─── Products & Inventory ─────────────────────────────────────────────────
export const getProducts = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/cards${query ? `?${query}` : ''}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const saveProduct = async (product) => {
  try {
    const res = await fetch(`${API_BASE}/cards`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(product)
    });
    return await res.json();
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
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ─── Orders ───────────────────────────────────────────────────────────────
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
