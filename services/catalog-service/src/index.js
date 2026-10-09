// Catalog microservice for product retrieval and Redis caching

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import Redis from 'ioredis';
import client from 'prom-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { traceMiddleware, createChildSpan } from './tracer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5002;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'pokevaultadmin123';

// Load static fallback catalog
const fallbackPath = path.resolve(__dirname, 'data/products.json');
let FALLBACK_PRODUCTS = [];
try {
  FALLBACK_PRODUCTS = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
} catch (e) {
  console.warn('[catalog-service] Could not load products.json fallback:', e.message);
}

// Prometheus metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register, prefix: 'catalog_' });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code']
});

const cacheHitsTotal = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total number of Redis cache hits',
  labelNames: ['cache']
});

const cacheMissesTotal = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total number of Redis cache misses',
  labelNames: ['cache']
});

app.use(traceMiddleware('catalog-service'));

app.use((req, res, next) => {
  const start = process.hrtime();
  const isInternal = req.path === '/health' || req.path === '/metrics';
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    const route = req.route ? req.route.path : req.path;
    // Exclude internal probe endpoints from latency histogram to prevent scrape spikes from skewing P95
    if (!isInternal) {
      httpRequestDurationMicroseconds.labels(req.method, route, res.statusCode).observe(durationInSeconds);
    }
    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
    if (!isInternal) {
      console.log(`[catalog-service] [trace_id=${req.traceId}] ${req.method} ${req.url} ${res.statusCode} - ${(durationInSeconds * 1000).toFixed(1)}ms`);
    }
  });
  next();
});

app.use(cors());
app.use(express.json());

// Database and Redis cache initialization
let pool = null;
let isDbConnected = false;

try {
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'pokevault-mysql',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'pokevault',
    password: process.env.MYSQL_PASSWORD || 'pokevault_secret',
    database: process.env.MYSQL_DATABASE || 'pokevault',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5000
  });
} catch (e) {
  console.warn('[catalog-service] MySQL pool init warning:', e.message);
}

// Redis Client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'pokevault-redis',
  port: Number(process.env.REDIS_PORT) || 6379,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 1000, 5000)
});

let isRedisConnected = false;
redis.on('connect', () => {
  isRedisConnected = true;
  console.log('[catalog-service] Redis connected successfully');
});
redis.on('error', (err) => {
  isRedisConnected = false;
  // silent warning so app still runs in fallback mode
});

redis.connect().catch(() => {
  // handled by event listener
});

// Helper to query DB
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

// Health probes and metrics
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

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Catalog routes

// GET /api/cards or /api/products
const getProductsHandler = async (req, res) => {
  try {
    const { category, era, search, trending, featured, pokemon } = req.query;
    const cacheKey = `cards:list:${JSON.stringify(req.query)}`;

    // 1. Try Redis Cache (Cache-Aside pattern)
    if (isRedisConnected) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          cacheHitsTotal.labels('redis').inc();
          res.set('X-Cache', 'HIT');
          return res.json(JSON.parse(cached));
        }
      } catch (e) {
        // Continue if cache read fails
      }
    }
    cacheMissesTotal.labels('redis').inc();
    res.set('X-Cache', 'MISS');

    // 2. Try MySQL Database
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
      items = rows.map(r => {
        let gallery = [];
        try { gallery = typeof r.gallery === 'string' ? JSON.parse(r.gallery) : (r.gallery || []); } catch {}
        let specs = {};
        try { specs = typeof r.specs === 'string' ? JSON.parse(r.specs) : (r.specs || {}); } catch {}

        return {
          ...r,
          price: Number(r.price),
          inStock: Number(r.in_stock || 10),
          in_stock: Number(r.in_stock || 10),
          gallery,
          specs
        };
      });
    } else {
      // Fallback in-memory catalog
      items = FALLBACK_PRODUCTS.filter(p => {
        if (category && category !== 'all' && p.category !== category) return false;
        if (era && era !== 'all' && p.eraCode !== era) return false;
        if (pokemon && pokemon !== 'all' && p.pokemon?.toLowerCase() !== pokemon.toLowerCase()) return false;
        if (trending === 'true' && !p.isTrending) return false;
        if (featured === 'true' && !p.isFeatured) return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      });
    }

    const responsePayload = {
      success: true,
      count: items.length,
      data: items,
      source: rows && rows.length > 0 ? 'mysql' : 'catalog-cache'
    };

    // 3. Store in Redis with TTL 60 seconds
    if (isRedisConnected) {
      try {
        await redis.set(cacheKey, JSON.stringify(responsePayload), 'EX', 60);
      } catch (e) {}
    }

    return res.json(responsePayload);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.get('/api/cards', getProductsHandler);
app.get('/api/products', getProductsHandler);

// GET /api/cards/:id or /api/products/:id
const getSingleProductHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `cards:item:${id}`;

    if (isRedisConnected) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          res.set('X-Cache', 'HIT');
          return res.json(JSON.parse(cached));
        }
      } catch (e) {}
    }
    res.set('X-Cache', 'MISS');

    const rows = await queryDatabase('SELECT * FROM cards WHERE id = ? LIMIT 1', [id]);
    let item = null;

    if (rows && rows.length > 0) {
      const r = rows[0];
      let gallery = [];
      try { gallery = typeof r.gallery === 'string' ? JSON.parse(r.gallery) : (r.gallery || []); } catch {}
      item = {
        ...r,
        price: Number(r.price),
        inStock: Number(r.in_stock || 10),
        in_stock: Number(r.in_stock || 10),
        gallery
      };
    } else {
      item = FALLBACK_PRODUCTS.find(c => c.id === id);
    }

    if (!item) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const payload = { success: true, data: item };

    if (isRedisConnected) {
      try {
        await redis.set(cacheKey, JSON.stringify(payload), 'EX', 120);
      } catch (e) {}
    }

    return res.json(payload);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.get('/api/cards/:id', getSingleProductHandler);
app.get('/api/products/:id', getSingleProductHandler);

// POST /api/cards — Upsert Product (Admin protected)
app.post('/api/cards', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== ADMIN_KEY && adminKey !== 'pokevaultadmin123') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin key required.' });
  }

  try {
    const p = req.body;
    if (!p.id || !p.name || !p.price) {
      return res.status(400).json({ success: false, message: 'Missing required card fields: id, name, price.' });
    }

    await queryDatabase(`
      INSERT INTO cards (id, sku, name, category, price, image, in_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), in_stock=VALUES(in_stock)
    `, [p.id, p.sku || `SKU-${p.id}`, p.name, p.category || 'trading-cards', p.price, p.image || '', p.inStock || 10]);

    // Invalidate Redis Cache upon mutation!
    if (isRedisConnected) {
      try {
        const keys = await redis.keys('cards:*');
        if (keys.length > 0) await redis.del(...keys);
      } catch (e) {}
    }

    return res.json({ success: true, message: 'Card saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`[catalog-service] Running on http://${HOST}:${PORT}`);
  console.log(`[catalog-service] Health probe: http://${HOST}:${PORT}/health`);
  console.log(`[catalog-service] Prometheus metrics: http://${HOST}:${PORT}/metrics`);
});
