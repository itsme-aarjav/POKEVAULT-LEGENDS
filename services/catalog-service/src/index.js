import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyToken, extractToken } from './jwt.js';
import { formatCardRecord } from './format.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.CATALOG_PORT || process.env.PORT || 5002;
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SIGNING_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('[catalog-service] WARNING: JWT_SIGNING_SECRET is not configured. Admin token verification will fail-closed.');
}

const fallbackPath = path.resolve(__dirname, 'data/products.json');
let FALLBACK_PRODUCTS = [];
try {
  FALLBACK_PRODUCTS = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
} catch (e) {
  console.warn('[catalog-service] Could not load products.json fallback:', e.message);
}

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? '*' : (corsOrigin.includes(',') ? corsOrigin.split(',').map(s => s.trim()) : corsOrigin)
}));
app.use(express.json());

let totalRequests = 0;
const statusCounts = {};

app.use((req, res, next) => {
  totalRequests++;
  const start = Date.now();
  res.on('finish', () => {
    const status = res.statusCode;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    const duration = Date.now() - start;
    if (req.path !== '/health' && req.path !== '/metrics') {
      console.log(`[catalog-service] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

let pool = null;
let isDbConnected = false;

try {
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'pokevault',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'pokevault',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5000
  });
} catch (e) {
  console.warn('[catalog-service] MySQL pool init warning:', e.message);
}

// In-Memory Cache Fallback
const memoryCache = new Map();

function setMemoryCache(key, value, ttlSeconds = 60) {
  memoryCache.set(key, {
    data: value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

function getMemoryCache(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function clearMemoryCache(prefix = 'cards:') {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

// Distributed Redis Client
let redis = null;
let isRedisConnected = false;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 1000, 5000)
    });
    redis.on('connect', () => {
      isRedisConnected = true;
      console.log('[catalog-service] Connected to Redis cluster');
    });
    redis.on('ready', () => {
      isRedisConnected = true;
    });
    redis.on('error', (err) => {
      isRedisConnected = false;
      console.warn('[catalog-service] Redis warning (falling back to memory cache):', err.message);
    });
    redis.on('close', () => {
      isRedisConnected = false;
    });
    redis.connect().catch(() => {
      isRedisConnected = false;
    });
  } catch (err) {
    isRedisConnected = false;
    console.warn('[catalog-service] Redis init warning:', err.message);
  }
}

async function getCached(key) {
  if (isRedisConnected && redis) {
    try {
      const data = await redis.get(key);
      if (data) return JSON.parse(data);
    } catch {}
  }
  return getMemoryCache(key);
}

async function setCached(key, value, ttlSeconds = 60) {
  setMemoryCache(key, value, ttlSeconds);
  if (isRedisConnected && redis) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {}
  }
}

async function invalidateCache(prefix = 'cards:*') {
  clearMemoryCache('cards:');
  if (isRedisConnected && redis) {
    try {
      const keys = await redis.keys(prefix);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {}
  }
}

async function queryDatabase(sql, params = []) {
  if (!pool) return null;
  try {
    const [rows] = await pool.query(sql, params);
    isDbConnected = true;
    return rows;
  } catch (err) {
    isDbConnected = false;
    return null;
  }
}

const metricsHandler = (req, res) => {
  const mem = process.memoryUsage();
  const uptime = process.uptime();
  const statusLines = Object.entries(statusCounts)
    .map(([status, count]) => `http_requests_total{service="catalog-service",status="${status}"} ${count}`)
    .join('\n');

  const output = [
    '# HELP process_uptime_seconds Process uptime in seconds.',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds{service="catalog-service"} ${uptime}`,
    '# HELP process_resident_memory_bytes Resident memory size in bytes.',
    '# TYPE process_resident_memory_bytes gauge',
    `process_resident_memory_bytes{service="catalog-service"} ${mem.rss}`,
    '# HELP nodejs_heap_size_total_bytes Total size of heap in bytes.',
    '# TYPE nodejs_heap_size_total_bytes gauge',
    `nodejs_heap_size_total_bytes{service="catalog-service"} ${mem.heapTotal}`,
    '# HELP nodejs_heap_size_used_bytes Process heap memory used in bytes.',
    '# TYPE nodejs_heap_size_used_bytes gauge',
    `nodejs_heap_size_used_bytes{service="catalog-service"} ${mem.heapUsed}`,
    '# HELP http_requests_total Total number of HTTP requests.',
    '# TYPE http_requests_total counter',
    statusLines || `http_requests_total{service="catalog-service",status="200"} ${totalRequests}`,
    ''
  ].filter(Boolean).join('\n');

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(output);
};

app.get('/metrics', metricsHandler);
app.get('/api/metrics', metricsHandler);

app.get('/health', async (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'catalog-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    components: {
      redis: isRedisConnected ? 'UP' : 'FALLBACK',
      mysql: isDbConnected ? 'UP' : 'STANDBY'
    }
  });
});

export { formatCardRecord };

const getProductsHandler = async (req, res) => {
  try {
    const { category, era, search, trending, featured, pokemon } = req.query;
    const cacheKey = `cards:list:${JSON.stringify(req.query)}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    res.set('X-Cache', 'MISS');

    let items = null;
    let conditions = [];
    let params = [];

    if (category && category !== 'all') {
      conditions.push('category = ?');
      params.push(category);
    }
    if (era && era !== 'all') {
      conditions.push('era_code = ?');
      params.push(era);
    }
    if (pokemon && pokemon !== 'all') {
      conditions.push('LOWER(pokemon) = LOWER(?)');
      params.push(pokemon);
    }
    if (trending === 'true') {
      conditions.push('is_trending = 1');
    }
    if (featured === 'true') {
      conditions.push('is_featured = 1');
    }
    if (search) {
      conditions.push('(name LIKE ? OR pokemon LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await queryDatabase(`SELECT * FROM cards ${whereClause} ORDER BY created_at DESC`, params);

    if (rows && rows.length > 0) {
      items = rows.map(formatCardRecord);
    } else {
      items = FALLBACK_PRODUCTS.filter(p => {
        if (category && category !== 'all' && p.category !== category) return false;
        if (era && era !== 'all' && (p.eraCode !== era && p.era_code !== era)) return false;
        if (pokemon && pokemon !== 'all' && p.pokemon?.toLowerCase() !== pokemon.toLowerCase()) return false;
        if (trending === 'true' && !(p.isTrending || p.is_trending)) return false;
        if (featured === 'true' && !(p.isFeatured || p.is_featured)) return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }).map(formatCardRecord);
    }

    const responsePayload = {
      success: true,
      count: items.length,
      data: items,
      source: rows && rows.length > 0 ? 'mysql' : 'catalog-cache'
    };

    await setCached(cacheKey, responsePayload, 60);
    return res.json(responsePayload);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.get('/api/cards', getProductsHandler);
app.get('/api/products', getProductsHandler);

const getSingleProductHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `cards:item:${id}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    res.set('X-Cache', 'MISS');

    const rows = await queryDatabase('SELECT * FROM cards WHERE id = ? LIMIT 1', [id]);
    let item = null;

    if (rows && rows.length > 0) {
      item = formatCardRecord(rows[0]);
    } else {
      const fallback = FALLBACK_PRODUCTS.find(c => c.id === id);
      item = fallback ? formatCardRecord(fallback) : null;
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const payload = { success: true, data: item };
    await setCached(cacheKey, payload, 120);
    return res.json(payload);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.get('/api/cards/:id', getSingleProductHandler);
app.get('/api/products/:id', getSingleProductHandler);

const checkAdminAuth = (req, res) => {
  const token = extractToken(req);
  if (!token || !JWT_SECRET) {
    res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
    return false;
  }
  const payload = verifyToken(token, JWT_SECRET);
  if (!payload || payload.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
    return false;
  }
  return true;
};

// POST /api/cards — Upsert Product (Admin protected)
app.post('/api/cards', async (req, res) => {
  if (!checkAdminAuth(req, res)) return;

  try {
    const p = req.body;
    if (!p.id || !p.name || !p.price) {
      return res.status(400).json({ success: false, message: 'Missing required card fields: id, name, price.' });
    }

    await queryDatabase(`
      INSERT INTO cards (id, sku, name, category, price, image, in_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), in_stock=VALUES(in_stock)
    `, [p.id, p.sku || `SKU-${p.id}`, p.name, p.category || 'trading-cards', p.price, p.image || '', p.inStock ?? p.in_stock ?? 10]);

    const idx = FALLBACK_PRODUCTS.findIndex(item => item.id === p.id);
    if (idx !== -1) {
      FALLBACK_PRODUCTS[idx] = { ...FALLBACK_PRODUCTS[idx], ...p };
    } else {
      FALLBACK_PRODUCTS.push(p);
    }

    await invalidateCache('cards:*');
    return res.json({ success: true, message: 'Card saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/cards & PUT /api/cards/:id
const updateCardHandler = async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const id = req.params.id || req.body.id;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Missing card id' });
    }
    const p = req.body;
    await queryDatabase(`
      UPDATE cards SET
        name = COALESCE(?, name),
        price = COALESCE(?, price),
        in_stock = COALESCE(?, in_stock),
        category = COALESCE(?, category),
        image = COALESCE(?, image)
      WHERE id = ?
    `, [p.name, p.price, p.inStock ?? p.in_stock, p.category, p.image, id]);

    const idx = FALLBACK_PRODUCTS.findIndex(item => item.id === id);
    if (idx !== -1) {
      FALLBACK_PRODUCTS[idx] = { ...FALLBACK_PRODUCTS[idx], ...p };
    }

    await invalidateCache('cards:*');
    return res.json({ success: true, message: 'Card updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.put('/api/cards/:id', updateCardHandler);
app.put('/api/cards', updateCardHandler);

// DELETE /api/cards & DELETE /api/cards/:id
const deleteCardHandler = async (req, res) => {
  if (!checkAdminAuth(req, res)) return;
  try {
    const id = req.params.id || req.body.id;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Missing card id' });
    }
    await queryDatabase('DELETE FROM cards WHERE id = ?', [id]);

    const idx = FALLBACK_PRODUCTS.findIndex(item => item.id === id);
    if (idx !== -1) {
      FALLBACK_PRODUCTS.splice(idx, 1);
    }

    await invalidateCache('cards:*');
    return res.json({ success: true, message: 'Card deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
app.delete('/api/cards/:id', deleteCardHandler);
app.delete('/api/cards', deleteCardHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`[catalog-service] Running on http://${HOST}:${PORT}`);
    console.log(`[catalog-service] Health probe: http://${HOST}:${PORT}/health`);
  });
}

export default app;
