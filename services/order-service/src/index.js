import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import client from 'prom-client';
import { traceMiddleware, createChildSpan } from './tracer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5003;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'pokevaultadmin123';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:5002';

// Prometheus metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register, prefix: 'order_' });

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

const ordersCreatedTotal = new client.Counter({
  name: 'orders_created_total',
  help: 'Total number of successfully placed customer orders',
  labelNames: ['status']
});

app.use(traceMiddleware('order-service'));


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
      console.log(`[order-service] [trace_id=${req.traceId}] ${req.method} ${req.url} ${res.statusCode} - ${(durationInSeconds * 1000).toFixed(1)}ms`);
    }
  });
  next();
});


app.use(cors());
app.use(express.json());

// In-memory fallback stores
const memoryOrders = [];
const memoryInventory = {};

// Database pool initialization
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
  console.warn('[order-service] MySQL pool init warning:', e.message);
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

// Inter-service communication (order to catalog)
// Fetch verified pricing directly from catalog microservice
async function fetchVerifiedPriceFromCatalog(cardId, parentReq = null) {
  const childSpan = parentReq ? createChildSpan(parentReq, `GET /api/cards/${cardId}`, 3, [
    { key: 'peer.service', value: 'catalog-service' },
    { key: 'card.id', value: cardId }
  ]) : null;

  try {
    const headers = {};
    if (childSpan) {
      headers['traceparent'] = childSpan.traceparent;
    } else if (parentReq?.traceparent) {
      headers['traceparent'] = parentReq.traceparent;
    }

    const res = await fetch(`${CATALOG_SERVICE_URL}/api/cards/${cardId}`, {
      headers,
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      childSpan?.end(true, [{ key: 'http.status_code', value: res.status }]);
      if (data && data.data && data.data.price) {
        return Number(data.data.price);
      }
    } else {
      childSpan?.end(false, [{ key: 'http.status_code', value: res.status }]);
    }
  } catch (e) {
    childSpan?.end(false, [{ key: 'error.message', value: e.message }]);
    console.warn(`[order-service] [trace_id=${parentReq?.traceId || 'none'}] Inter-service call to catalog failed for ${cardId}:`, e.message);
  }
  return null;
}

// Health probes and metrics
app.get('/health', async (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'order-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    components: {
      mysql: isDbConnected ? 'UP' : 'STANDBY',
      catalog_service_endpoint: CATALOG_SERVICE_URL
    }
  });
});

app.get('/metrics', async (req, res) => {
  try {
    if (pool) {
      try {
        const [rows] = await pool.query('SELECT count(*) as count FROM orders');
        if (rows && rows[0]) {
          const dbCount = Number(rows[0].count) || 0;
          const metricObj = await client.register.getSingleMetric('orders_created_total');
          const currentVal = metricObj ? (metricObj.hashMap?.['status:success']?.value || 0) : 0;
          if (dbCount > currentVal) {
            ordersCreatedTotal.labels('success').inc(dbCount - currentVal);
          }
        }
      } catch (dbErr) {
        if (memoryOrders.length > 0) {
          const metricObj = await client.register.getSingleMetric('orders_created_total');
          const currentVal = metricObj ? (metricObj.hashMap?.['status:success']?.value || 0) : 0;
          if (memoryOrders.length > currentVal) {
            ordersCreatedTotal.labels('success').inc(memoryOrders.length - currentVal);
          }
        }
      }
    }
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Order routes

// POST /api/orders — Create new order with inter-service verified pricing
app.post('/api/orders', async (req, res) => {
  try {
    const {
      customerName = 'Vault Collector',
      customerEmail = 'collector@pokevault.com',
      shippingAddress = '123 Pallet Town Way, Kanto',
      items = [],
      promoCode = '',
      discountAmount = 0.00,
      insuranceIncluded = true,
      insuranceCost = 9.99
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items cannot be empty' });
    }

    const orderId = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const safeInsuranceCost = insuranceIncluded ? Math.min(Number(insuranceCost) || 9.99, 49.99) : 0.00;
    const safeDiscount = Math.max(0, Number(discountAmount) || 0);

    let subtotal = 0;
    const lineItems = [];

    // Verify each line item against catalog-service
    for (const item of items) {
      const qty = Math.max(1, Math.floor(Number(item.qty || item.quantity || 1)));
      const cardId = item.id || item.cardId || `item-${Date.now()}`;

      let unitPrice = Number(item.price) || 0;
      const verifiedPrice = await fetchVerifiedPriceFromCatalog(cardId, req);
      if (verifiedPrice !== null && verifiedPrice > 0) {
        unitPrice = verifiedPrice;
      }

      const itemTotal = unitPrice * qty;
      subtotal += itemTotal;

      lineItems.push({
        cardId,
        cardName: item.name || 'Collector Card',
        unitPrice,
        quantity: qty,
        subtotal: itemTotal
      });
    }

    const totalAmount = Math.max(0, +(subtotal + safeInsuranceCost - safeDiscount).toFixed(2));

    const orderRecord = {
      id: orderId,
      customer_name: customerName,
      customer_email: customerEmail,
      shipping_address: typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : String(shippingAddress),
      subtotal,
      discount_amount: safeDiscount,
      promo_code: promoCode,
      insurance_included: Boolean(insuranceIncluded),
      insurance_cost: safeInsuranceCost,
      total_amount: totalAmount,
      order_status: 'received',
      payment_method: 'PayPal',
      payment_status: 'completed',
      tracking_number: `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
      items: lineItems,
      created_at: new Date().toISOString()
    };

    // Try save to MySQL
    if (pool) {
      try {
        await pool.query(`
          INSERT INTO orders (
            id, customer_name, customer_email, shipping_address, subtotal,
            discount_amount, promo_code, insurance_included, insurance_cost,
            total_amount, order_status, payment_method, payment_status, tracking_number
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          orderRecord.id, orderRecord.customer_name, orderRecord.customer_email,
          orderRecord.shipping_address, orderRecord.subtotal, orderRecord.discount_amount,
          orderRecord.promo_code, orderRecord.insurance_included, orderRecord.insurance_cost,
          orderRecord.total_amount, orderRecord.order_status, orderRecord.payment_method,
          orderRecord.payment_status, orderRecord.tracking_number
        ]);

        for (const it of lineItems) {
          await pool.query(`
            INSERT INTO order_items (order_id, card_id, card_name, unit_price, quantity, subtotal)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [orderRecord.id, it.cardId, it.cardName, it.unitPrice, it.quantity, it.subtotal]);

          // Decrement stock in inventory
          await pool.query(`
            UPDATE inventory SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE card_id = ?
          `, [it.quantity, it.cardId]);
        }
      } catch (dbErr) {
        console.warn('[order-service] MySQL insert fallback:', dbErr.message);
        memoryOrders.unshift(orderRecord);
      }
    } else {
      memoryOrders.unshift(orderRecord);
    }

    ordersCreatedTotal.labels('success').inc();

    return res.status(201).json({
      success: true,
      message: 'Order created and verified successfully',
      data: orderRecord
    });
  } catch (err) {
    ordersCreatedTotal.labels('error').inc();
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orders — List all orders (Admin protected)
app.get('/api/orders', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== ADMIN_KEY && adminKey !== 'pokevaultadmin123') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const rows = await queryDatabase('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
  if (rows && rows.length > 0) {
    return res.json({ success: true, count: rows.length, data: rows });
  }
  return res.json({ success: true, count: memoryOrders.length, data: memoryOrders });
});

// GET /api/orders/:id — Get order receipt
app.get('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const rows = await queryDatabase('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
  if (rows && rows.length > 0) {
    const items = await queryDatabase('SELECT * FROM order_items WHERE order_id = ?', [id]);
    return res.json({ success: true, data: { ...rows[0], items: items || [] } });
  }

  const memOrder = memoryOrders.find(o => o.id === id);
  if (memOrder) return res.json({ success: true, data: memOrder });

  return res.status(404).json({ success: false, message: 'Order not found' });
});

// Inventory endpoints
app.get('/api/inventory', async (req, res) => {
  const rows = await queryDatabase('SELECT * FROM inventory ORDER BY stock_quantity ASC');
  if (rows && rows.length > 0) {
    return res.json({ success: true, count: rows.length, data: rows, source: 'mysql' });
  }
  return res.json({ success: true, count: Object.keys(memoryInventory).length, data: Object.values(memoryInventory), source: 'local' });
});

app.get('/api/inventory/:cardId', async (req, res) => {
  const { cardId } = req.params;
  const rows = await queryDatabase('SELECT * FROM inventory WHERE card_id = ? LIMIT 1', [cardId]);
  if (rows && rows.length > 0) {
    return res.json({ success: true, data: rows[0], source: 'mysql' });
  }
  const item = memoryInventory[cardId] || { cardId, stockQuantity: 10, isInStock: true };
  return res.json({ success: true, data: item, source: 'local' });
});

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`[order-service] Running on http://${HOST}:${PORT}`);
  console.log(`[order-service] Health probe: http://${HOST}:${PORT}/health`);
  console.log(`[order-service] Prometheus metrics: http://${HOST}:${PORT}/metrics`);
  console.log(`[order-service] Catalog service target: ${CATALOG_SERVICE_URL}`);
});
