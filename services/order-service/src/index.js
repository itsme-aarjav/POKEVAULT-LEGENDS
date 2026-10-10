import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import client from 'prom-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { traceMiddleware, createChildSpan } from './tracer.js';
import {
  verifyToken,
  extractToken,
  timingSafeCompare,
  generateOrderAccessToken,
  hashOrderAccessToken,
  extractOrderToken
} from './jwt.js';
import {
  PAYMENT_STATES,
  ORDER_STATES,
  validatePaymentStateTransition,
  isPayPalConfigured,
  createPayPalServerOrder,
  capturePayPalServerOrder,
  verifyPayPalCapture,
  fetchPayPalOrderDetails
} from './paypal.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5003;
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SIGNING_SECRET;
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://catalog-service:5002';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_ENVIRONMENT = (process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase();
const PAYPAL_API_BASE_URL = process.env.PAYPAL_API_BASE_URL || (
  PAYPAL_ENVIRONMENT === 'live' || PAYPAL_ENVIRONMENT === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
);

if (!JWT_SECRET) {
  console.warn('[order-service] WARNING: JWT_SIGNING_SECRET is not configured. Admin token verification will fail-closed.');
}
if (!isPayPalConfigured(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)) {
  console.warn('[order-service] NOTICE: PayPal credentials not configured. PayPal gateway will fail-closed.');
}


// Authoritative Server-Side Promotional Rules (PV-007)
const SERVER_PROMO_CODES = {
  'POKEVAULT10': { type: 'percentage', value: 10, minSubtotalCents: 0 },
  'LEGENDS20': { type: 'percentage', value: 20, minSubtotalCents: 15000 }, // $150.00
  'FREESHIP': { type: 'free_shipping', minSubtotalCents: 10000 } // $100.00
};

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

// Database pool initialization
let pool = null;
let isDbConnected = false;

try {
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'pokevault-mysql',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'pokevault',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'pokevault',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5000
  });

  // Verify connection and run schema reconciliation asynchronously
  pool.query('SELECT 1').then(() => {
    isDbConnected = true;
    ensureSchemaAndInventory();
  }).catch((err) => {
    isDbConnected = false;
    console.warn('[order-service] MySQL initial connection warning:', err.message);
  });
} catch (e) {
  console.warn('[order-service] MySQL pool init warning:', e.message);
}

// Safe idempotent schema and inventory synchronization (PV-006, PV-008, PV-013 & Phase 3)
async function ensureSchemaAndInventory() {
  if (!pool) return;
  let acquiredLock = false;
  try {
    // Distributed migration advisory lock to prevent race conditions across multiple order-service replicas
    const [lockRows] = await pool.query(`SELECT GET_LOCK('pokevault_migration_lock', 10) AS lock_acquired`);
    if (!lockRows || !lockRows[0] || lockRows[0].lock_acquired !== 1) {
      console.warn('[order-service] Could not acquire migration lock within 10s. Another replica may be performing DDL.');
      return;
    }
    acquiredLock = true;

    // 1. Ensure access_token_hash, paypal_order_id, paypal_capture_id columns exist on orders table
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
    `);
    const existingColNames = new Set(cols.map(c => c.COLUMN_NAME));

    if (!existingColNames.has('access_token_hash')) {
      console.log('[order-service] Adding access_token_hash column to orders table...');
      await pool.query(`ALTER TABLE orders ADD COLUMN access_token_hash VARCHAR(64) DEFAULT NULL`);
      await pool.query(`CREATE INDEX idx_access_token_hash ON orders (access_token_hash)`);
    }

    if (!existingColNames.has('paypal_order_id')) {
      console.log('[order-service] Adding paypal_order_id column to orders table...');
      await pool.query(`ALTER TABLE orders ADD COLUMN paypal_order_id VARCHAR(100) DEFAULT NULL`);
      await pool.query(`CREATE INDEX idx_paypal_order_id ON orders (paypal_order_id)`);
    }

    if (!existingColNames.has('paypal_capture_id')) {
      console.log('[order-service] Adding paypal_capture_id column to orders table...');
      await pool.query(`ALTER TABLE orders ADD COLUMN paypal_capture_id VARCHAR(100) DEFAULT NULL`);
      await pool.query(`CREATE INDEX idx_paypal_capture_id ON orders (paypal_capture_id)`);
    }

    // 2. Ensure payment_reconciliations table exists for post-capture persistence failure handling (PV-008)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_reconciliations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        paypal_order_id VARCHAR(100) NOT NULL,
        paypal_capture_id VARCHAR(100) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        customer_email VARCHAR(255),
        error_message TEXT,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_recon_paypal_order (paypal_order_id),
        INDEX idx_recon_capture (paypal_capture_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. Ensure all catalog cards have inventory records (PV-013 regression fix)
    // Using INSERT IGNORE guarantees that legitimately adjusted/decremented stock is NEVER overwritten on startup/seed rerun!
    await pool.query(`
      INSERT IGNORE INTO inventory (card_id, stock_quantity, reserved_quantity, low_stock_threshold, warehouse_location)
      SELECT id, COALESCE(in_stock, 10), 0, 1, 'Vault Alpha-1'
      FROM cards
    `);
  } catch (err) {
    console.warn('[order-service] Schema/inventory reconciliation notice:', err.message);
  } finally {
    if (acquiredLock) {
      try {
        await pool.query(`SELECT RELEASE_LOCK('pokevault_migration_lock')`);
      } catch (unlockErr) {
        console.warn('[order-service] Failed to release migration lock:', unlockErr.message);
      }
    }
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

// Inter-service communication: fetch verified pricing directly from catalog microservice (PV-007)
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

    const res = await fetch(`${CATALOG_SERVICE_URL}/api/cards/${encodeURIComponent(cardId)}`, {
      headers,
      signal: AbortSignal.timeout(3000)
    });

    if (res.ok) {
      const data = await res.json();
      childSpan?.end(true, [{ key: 'http.status_code', value: res.status }]);
      if (data && data.data && data.data.price !== undefined && data.data.price !== null) {
        const p = Number(data.data.price);
        if (Number.isFinite(p) && p >= 0) {
          return { found: true, price: p, name: data.data.name || 'Collector Card' };
        }
      }
      return { found: false, invalidPrice: true };
    } else if (res.status === 404) {
      childSpan?.end(false, [{ key: 'http.status_code', value: 404 }]);
      return { found: false, notFound: true };
    } else {
      childSpan?.end(false, [{ key: 'http.status_code', value: res.status }]);
      return { found: false, error: true, status: res.status };
    }
  } catch (e) {
    childSpan?.end(false, [{ key: 'error.message', value: e.message }]);
    console.warn(`[order-service] [trace_id=${parentReq?.traceId || 'none'}] Inter-service call to catalog failed for ${cardId}:`, e.message);
    return { found: false, error: true, message: e.message };
  }
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
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// ============================================================================
// Authoritative Server-Side Cart & Pricing Calculation (PV-007, PV-008)
// ============================================================================
export async function calculateAuthoritativeCart(items, promoCode = '', insuranceIncluded = true, parentReq = null) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { valid: false, status: 400, message: 'Cart items cannot be empty' };
  }

  const lineItems = [];
  let subtotalCents = 0;

  for (const item of items) {
    const cardId = item.id || item.cardId;
    if (!cardId || typeof cardId !== 'string' || !cardId.trim()) {
      return { valid: false, status: 400, message: 'Invalid product identifier in cart items' };
    }

    const rawQty = item.quantity !== undefined ? item.quantity : item.qty;
    const qty = Number(rawQty);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 100) {
      return {
        valid: false,
        status: 400,
        message: `Invalid quantity for item "${cardId}". Quantity must be a positive integer between 1 and 100.`
      };
    }

    // Retrieve authoritative price directly from catalog microservice; NEVER trust client submitted price
    const verified = await fetchVerifiedPriceFromCatalog(cardId.trim(), parentReq);
    if (!verified.found) {
      if (verified.notFound) {
        return {
          valid: false,
          status: 400,
          message: `Product "${cardId}" not found in catalog. Unable to verify price.`
        };
      }
      return {
        valid: false,
        status: 503,
        message: `Unable to verify price for product "${cardId}" from catalog service. Please try again.`
      };
    }

    const unitPriceCents = Math.round(verified.price * 100);
    const lineTotalCents = unitPriceCents * qty;
    subtotalCents += lineTotalCents;

    lineItems.push({
      cardId: cardId.trim(),
      cardName: verified.name || item.name || 'Collector Card',
      unitPrice: +(unitPriceCents / 100).toFixed(2),
      quantity: qty,
      subtotal: +(lineTotalCents / 100).toFixed(2),
      unitPriceCents,
      lineTotalCents
    });
  }

  // Server-Side Promotion & Discount Calculation (PV-007)
  let discountCents = 0;
  let appliedPromo = '';
  let insuranceCostCents = insuranceIncluded ? 999 : 0; // $9.99

  const rawPromo = typeof promoCode === 'string' ? promoCode.trim().toUpperCase() : '';
  if (rawPromo) {
    const promoConfig = SERVER_PROMO_CODES[rawPromo];
    if (!promoConfig) {
      return { valid: false, status: 400, message: `Invalid promotional code: "${promoCode}"` };
    }
    if (subtotalCents < promoConfig.minSubtotalCents) {
      const minDollars = (promoConfig.minSubtotalCents / 100).toFixed(2);
      return {
        valid: false,
        status: 400,
        message: `Promotional code "${rawPromo}" requires a minimum subtotal of $${minDollars}`
      };
    }
    appliedPromo = rawPromo;
    if (promoConfig.type === 'percentage') {
      discountCents = Math.round((subtotalCents * promoConfig.value) / 100);
    } else if (promoConfig.type === 'free_shipping') {
      insuranceCostCents = 0;
      discountCents = 0;
    }
  }

  discountCents = Math.min(discountCents, subtotalCents);
  const totalCents = Math.max(0, subtotalCents + insuranceCostCents - discountCents);

  return {
    valid: true,
    lineItems,
    subtotalCents,
    subtotal: +(subtotalCents / 100).toFixed(2),
    discountCents,
    discountAmount: +(discountCents / 100).toFixed(2),
    appliedPromo,
    insuranceCostCents,
    insuranceCost: +(insuranceCostCents / 100).toFixed(2),
    totalCents,
    totalAmount: +(totalCents / 100).toFixed(2)
  };
}

// ============================================================================
// PAYPAL PAYMENT GATEWAY ENDPOINTS (PV-008)
// ============================================================================

// POST /api/paypal/create-order — Server-side authenticated PayPal order creation
app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { items = [], promoCode = '', insuranceIncluded = true } = req.body;

    const cart = await calculateAuthoritativeCart(items, promoCode, insuranceIncluded, req);
    if (!cart.valid) {
      return res.status(cart.status).json({ success: false, message: cart.message });
    }

    // Fail closed if PayPal credentials are not configured
    if (!isPayPalConfigured(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)) {
      return res.status(503).json({
        success: false,
        error: 'PAYMENT_GATEWAY_UNCONFIGURED',
        message: 'PayPal payment gateway is not configured on the server. Simulated demo orders are strictly disabled.'
      });
    }

    const result = await createPayPalServerOrder({
      totalAmount: cart.totalAmount,
      subtotal: cart.subtotal,
      insuranceCost: cart.insuranceCost,
      discountAmount: cart.discountAmount,
      currency: 'USD',
      options: {
        clientId: PAYPAL_CLIENT_ID,
        clientSecret: PAYPAL_CLIENT_SECRET,
        apiBaseUrl: PAYPAL_API_BASE_URL
      }
    });

    if (!result.success) {
      return res.status(result.status || 502).json({
        success: false,
        error: 'PAYPAL_ORDER_CREATION_FAILED',
        message: result.error || 'Failed to initialize order with PayPal gateway'
      });
    }

    return res.status(201).json({
      success: true,
      orderID: result.orderId,
      amount: cart.totalAmount,
      currency: 'USD'
    });
  } catch (err) {
    console.error('[order-service] Error in /api/paypal/create-order:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/paypal/capture-order — Server-side PayPal capture & verification
app.post('/api/paypal/capture-order', async (req, res) => {
  try {
    const { paypalOrderId, items = [], promoCode = '', insuranceIncluded = true } = req.body;

    if (!paypalOrderId || typeof paypalOrderId !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid paypalOrderId is required' });
    }

    // Eliminate fabricated demo success
    if (paypalOrderId.toUpperCase().startsWith('DEMO-') || paypalOrderId.includes('MOCK')) {
      return res.status(400).json({
        success: false,
        error: 'FABRICATED_PAYMENT_REJECTED',
        message: 'Fabricated DEMO payment identifiers are strictly prohibited.'
      });
    }

    const cart = await calculateAuthoritativeCart(items, promoCode, insuranceIncluded, req);
    if (!cart.valid) {
      return res.status(cart.status).json({ success: false, message: cart.message });
    }

    // Check idempotency in database: has this PayPal order already been processed and completed?
    if (pool) {
      const existing = await queryDatabase(
        'SELECT id, order_status, payment_status, paypal_capture_id, total_amount FROM orders WHERE paypal_order_id = ? LIMIT 1',
        [paypalOrderId]
      );
      if (existing && existing.length > 0) {
        const ord = existing[0];
        if (ord.payment_status === PAYMENT_STATES.COMPLETED) {
          return res.json({
            success: true,
            alreadyCompleted: true,
            orderId: ord.id,
            captureId: ord.paypal_capture_id,
            status: PAYMENT_STATES.COMPLETED,
            message: 'Order payment was already captured and finalized.'
          });
        }
      }
    }

    // Fail closed if PayPal credentials are not configured
    if (!isPayPalConfigured(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)) {
      return res.status(503).json({
        success: false,
        error: 'PAYMENT_GATEWAY_UNCONFIGURED',
        message: 'PayPal payment gateway is not configured on the server. Simulated captures are disabled.'
      });
    }

    // Execute capture on PayPal API
    const captureResult = await capturePayPalServerOrder({
      paypalOrderId,
      options: {
        clientId: PAYPAL_CLIENT_ID,
        clientSecret: PAYPAL_CLIENT_SECRET,
        apiBaseUrl: PAYPAL_API_BASE_URL
      }
    });

    if (!captureResult.success) {
      return res.status(captureResult.status || 502).json({
        success: false,
        error: 'PAYPAL_CAPTURE_FAILED',
        message: captureResult.error || 'Payment capture failed with provider'
      });
    }

    // Verify capture details against authoritative cart
    const verification = verifyPayPalCapture({
      captureResponse: captureResult.data,
      expectedTotalAmount: cart.totalAmount,
      expectedCurrency: 'USD'
    });

    if (!verification.verified) {
      return res.status(422).json({
        success: false,
        error: 'PAYMENT_VERIFICATION_MISMATCH',
        message: `Capture verification failed: ${verification.reason}`
      });
    }

    return res.json({
      success: true,
      captureId: verification.captureId,
      status: PAYMENT_STATES.COMPLETED,
      amount: verification.amount,
      currency: verification.currency
    });
  } catch (err) {
    console.error('[order-service] Error in /api/paypal/capture-order:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/paypal/reconcile — Reconcile captured payment whose DB persistence failed (PV-008)
app.post('/api/paypal/reconcile', async (req, res) => {
  const adminToken = extractToken(req);
  if (!adminToken || !JWT_SECRET) {
    return res.status(403).json({ success: false, message: 'Admin authorization required for payment reconciliation' });
  }
  const payload = verifyToken(adminToken, JWT_SECRET);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin authorization required for payment reconciliation' });
  }

  if (!pool) {
    return res.status(503).json({ success: false, message: 'Database service unavailable' });
  }

  const { paypalOrderId, paypalCaptureId } = req.body;
  if (!paypalOrderId && !paypalCaptureId) {
    return res.status(400).json({ success: false, message: 'Either paypalOrderId or paypalCaptureId must be provided' });
  }

  const rows = await queryDatabase(
    'SELECT * FROM payment_reconciliations WHERE paypal_order_id = ? OR paypal_capture_id = ? ORDER BY created_at DESC LIMIT 10',
    [paypalOrderId || '', paypalCaptureId || '']
  );

  return res.json({
    success: true,
    reconciliations: rows || []
  });
});

// PATCH /api/orders/:id/payment — Controlled payment state transitions (PV-008)
app.patch('/api/orders/:id/payment', async (req, res) => {
  const adminToken = extractToken(req);
  if (!adminToken || !JWT_SECRET) {
    return res.status(403).json({ success: false, message: 'Admin authorization required to modify payment state' });
  }
  const payload = verifyToken(adminToken, JWT_SECRET);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin authorization required to modify payment state' });
  }

  const { id } = req.params;
  const { newStatus } = req.body;

  if (!pool) {
    return res.status(503).json({ success: false, message: 'Database service unavailable' });
  }

  const orders = await queryDatabase('SELECT id, payment_status, order_status FROM orders WHERE id = ? LIMIT 1', [id]);
  if (!orders || orders.length === 0) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const currentOrder = orders[0];
  const transition = validatePaymentStateTransition(currentOrder.payment_status, newStatus);
  if (!transition.valid) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PAYMENT_STATE_TRANSITION',
      message: transition.error
    });
  }

  if (transition.noop) {
    return res.json({ success: true, message: 'Payment status already in requested state', payment_status: currentOrder.payment_status });
  }

  const updatedOrderStatus = newStatus === PAYMENT_STATES.COMPLETED ? ORDER_STATES.RECEIVED : (newStatus === PAYMENT_STATES.FAILED ? ORDER_STATES.FAILED : currentOrder.order_status);
  await pool.query('UPDATE orders SET payment_status = ?, order_status = ? WHERE id = ?', [newStatus, updatedOrderStatus, id]);

  return res.json({
    success: true,
    message: `Payment status transitioned from "${currentOrder.payment_status}" to "${newStatus}"`,
    orderId: id,
    payment_status: newStatus,
    order_status: updatedOrderStatus
  });
});

// ============================================================================
// ORDER CREATION ENDPOINT (PV-006, PV-007, PV-008, PV-012)
// ============================================================================

// POST /api/orders — Create new order with verified pricing, atomic transaction, and payment integrity
app.post('/api/orders', async (req, res) => {
  try {
    const {
      customerName = 'Vault Collector',
      customerEmail = 'collector@pokevault.com',
      shippingAddress = '123 Pallet Town Way, Kanto',
      items = [],
      promoCode = '',
      insuranceIncluded = true,
      paymentMethod = 'PayPal',
      paypalOrderId = null,
      paypalCaptureId = null
    } = req.body;

    if (!pool) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }

    // Step 1: Reject fabricated DEMO payment identifiers (PV-008)
    if (typeof paypalOrderId === 'string' && (paypalOrderId.toUpperCase().startsWith('DEMO-') || paypalOrderId.includes('MOCK'))) {
      return res.status(400).json({
        success: false,
        error: 'FABRICATED_PAYMENT_REJECTED',
        message: 'Fabricated DEMO payment identifiers are strictly prohibited.'
      });
    }

    // Step 2: Calculate Authoritative Pricing and Discounts (PV-007)
    const cart = await calculateAuthoritativeCart(items, promoCode, insuranceIncluded, req);
    if (!cart.valid) {
      return res.status(cart.status).json({ success: false, message: cart.message });
    }

    // Step 3: Check Idempotency for repeated PayPal captures / order submissions (PV-008)
    if (paypalOrderId) {
      const [existingOrders] = await pool.query(
        'SELECT * FROM orders WHERE paypal_order_id = ? OR paypal_capture_id = ? LIMIT 1',
        [paypalOrderId, paypalCaptureId || paypalOrderId]
      );
      if (existingOrders && existingOrders.length > 0) {
        const existing = existingOrders[0];
        if (existing.payment_status === PAYMENT_STATES.COMPLETED) {
          const { access_token_hash, ...sanitized } = existing;
          const itemsRows = await queryDatabase('SELECT * FROM order_items WHERE order_id = ?', [existing.id]);
          return res.status(200).json({
            success: true,
            idempotent: true,
            message: 'Order already exists and payment is completed',
            data: {
              ...sanitized,
              items: itemsRows || []
            }
          });
        }
      }
    }

    // Step 4: Server-Side Payment Verification (PV-008)
    // Never mark payment_status: "completed" merely because the frontend submitted a request!
    let paymentStatus = PAYMENT_STATES.PENDING;
    let orderStatus = ORDER_STATES.PENDING_PAYMENT;
    let verifiedCaptureId = paypalCaptureId;

    if (paymentMethod === 'PayPal') {
      if (paypalOrderId && isPayPalConfigured(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)) {
        try {
          const details = await fetchPayPalOrderDetails({
            paypalOrderId,
            options: {
              clientId: PAYPAL_CLIENT_ID,
              clientSecret: PAYPAL_CLIENT_SECRET,
              apiBaseUrl: PAYPAL_API_BASE_URL
            }
          });
          if (details.success && details.data) {
            const verification = verifyPayPalCapture({
              captureResponse: details.data,
              expectedTotalAmount: cart.totalAmount,
              expectedCurrency: 'USD'
            });
            if (verification.verified) {
              paymentStatus = PAYMENT_STATES.COMPLETED;
              orderStatus = ORDER_STATES.RECEIVED;
              verifiedCaptureId = verification.captureId;
            } else {
              console.warn(`[order-service] PayPal payment verification failed for ${paypalOrderId}:`, verification.reason);
              paymentStatus = PAYMENT_STATES.PENDING;
              orderStatus = ORDER_STATES.PENDING_PAYMENT;
            }
          }
        } catch (verErr) {
          console.warn('[order-service] Failed to query PayPal API for order details:', verErr.message);
          paymentStatus = PAYMENT_STATES.PENDING;
          orderStatus = ORDER_STATES.PENDING_PAYMENT;
        }
      } else {
        // Missing credentials or unverified capture: fail-closed to pending
        paymentStatus = PAYMENT_STATES.PENDING;
        orderStatus = ORDER_STATES.PENDING_PAYMENT;
      }
    } else {
      // Non-PayPal / demo card checkout: always explicitly pending
      paymentStatus = PAYMENT_STATES.PENDING;
      orderStatus = ORDER_STATES.PENDING_PAYMENT;
    }

    const orderId = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const trackingNumber = `TRK-${Math.floor(100000 + Math.random() * 900000)}`;

    // Generate high-entropy order access token (PV-006)
    const rawAccessToken = generateOrderAccessToken();
    const accessTokenHash = hashOrderAccessToken(rawAccessToken);

    const orderRecord = {
      id: orderId,
      customer_name: typeof customerName === 'string' ? customerName.trim() : 'Vault Collector',
      customer_email: typeof customerEmail === 'string' ? customerEmail.trim() : 'collector@pokevault.com',
      shipping_address: typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : String(shippingAddress).trim(),
      subtotal: cart.subtotal,
      discount_amount: cart.discountAmount,
      promo_code: cart.appliedPromo,
      insurance_included: Boolean(insuranceIncluded),
      insurance_cost: cart.insuranceCost,
      total_amount: cart.totalAmount,
      order_status: orderStatus,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      paypal_order_id: paypalOrderId || null,
      paypal_capture_id: verifiedCaptureId || null,
      tracking_number: trackingNumber,
      access_token_hash: accessTokenHash,
      items: cart.lineItems.map(({ cardId, cardName, unitPrice, quantity, subtotal }) => ({
        cardId, cardName, unitPrice, quantity, subtotal
      })),
      created_at: new Date().toISOString()
    };

    // Step 5: Transactional, Atomic Database Execution with dedicated connection (PV-012)
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Lock and verify inventory for all line items
      for (const it of cart.lineItems) {
        const [invRows] = await connection.query(
          'SELECT stock_quantity FROM inventory WHERE card_id = ? FOR UPDATE',
          [it.cardId]
        );

        let currentStock = null;
        if (invRows && invRows.length > 0) {
          currentStock = Number(invRows[0].stock_quantity);
        } else {
          // If inventory row missing, initialize safely from cards table without overwriting
          const [cardRows] = await connection.query(
            'SELECT in_stock, name FROM cards WHERE id = ? FOR UPDATE',
            [it.cardId]
          );
          if (cardRows && cardRows.length > 0) {
            currentStock = Number(cardRows[0].in_stock || 0);
            await connection.query(
              'INSERT IGNORE INTO inventory (card_id, stock_quantity) VALUES (?, ?)',
              [it.cardId, currentStock]
            );
          }
        }

        if (currentStock === null || currentStock < it.quantity) {
          await connection.rollback();
          connection.release();
          return res.status(409).json({
            success: false,
            message: `Insufficient inventory for "${it.cardName}". Requested: ${it.quantity}, available: ${currentStock ?? 0}.`
          });
        }

        // Deduct inventory atomically
        await connection.query(
          'UPDATE inventory SET stock_quantity = stock_quantity - ? WHERE card_id = ?',
          [it.quantity, it.cardId]
        );

        // Synchronize read-cache in cards table
        await connection.query(
          'UPDATE cards SET in_stock = GREATEST(0, in_stock - ?) WHERE id = ?',
          [it.quantity, it.cardId]
        );
      }

      // Insert order
      await connection.query(`
        INSERT INTO orders (
          id, customer_name, customer_email, shipping_address, subtotal,
          discount_amount, promo_code, insurance_included, insurance_cost,
          total_amount, order_status, payment_method, payment_status,
          paypal_order_id, paypal_capture_id, tracking_number,
          access_token_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderRecord.id, orderRecord.customer_name, orderRecord.customer_email,
        orderRecord.shipping_address, orderRecord.subtotal, orderRecord.discount_amount,
        orderRecord.promo_code, orderRecord.insurance_included, orderRecord.insurance_cost,
        orderRecord.total_amount, orderRecord.order_status, orderRecord.payment_method,
        orderRecord.payment_status, orderRecord.paypal_order_id, orderRecord.paypal_capture_id,
        orderRecord.tracking_number, orderRecord.access_token_hash
      ]);

      // Insert order items
      for (const it of cart.lineItems) {
        await connection.query(`
          INSERT INTO order_items (order_id, card_id, card_name, unit_price, quantity, subtotal)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [orderRecord.id, it.cardId, it.cardName, it.unitPrice, it.quantity, it.subtotal]);
      }

      await connection.commit();
      connection.release();
    } catch (dbErr) {
      await connection.rollback();
      connection.release();

      // Step 6: Post-Capture Database Persistence Failure Handling (PV-008 Requirement 10 & Phase 4 Guard)
      if (paymentStatus === PAYMENT_STATES.COMPLETED && verifiedCaptureId) {
        console.error(`[CRITICAL_PAYMENT_RECONCILIATION_REQUIRED] PayPal capture ${verifiedCaptureId} succeeded for order ${orderId} but database persistence failed: ${dbErr.message}`);
        const reconRecord = {
          timestamp: new Date().toISOString(),
          orderId,
          paypalOrderId: paypalOrderId || 'UNKNOWN',
          paypalCaptureId: verifiedCaptureId,
          amount: cart.totalAmount,
          currency: 'USD',
          customerEmail,
          dbErrorMessage: dbErr.message
        };

        let dbSaved = false;
        try {
          await pool.query(`
            INSERT INTO payment_reconciliations (paypal_order_id, paypal_capture_id, amount, currency, customer_email, error_message)
            VALUES (?, ?, ?, 'USD', ?, ?)
          `, [reconRecord.paypalOrderId, reconRecord.paypalCaptureId, reconRecord.amount, reconRecord.customerEmail, reconRecord.dbErrorMessage]);
          dbSaved = true;
        } catch (reconErr) {
          console.error('[CRITICAL] Failed to write reconciliation record to MySQL:', reconErr.message);
        }

        // Emergency fallback persistence: append to durable local JSONL log so captured money is NEVER lost if DB is dead
        try {
          const fallbackLogPath = process.env.PAYMENT_RECONCILIATION_LOG_FILE || path.resolve(__dirname, '../data/payment_reconciliations_fallback.jsonl');
          const fallbackDir = path.dirname(fallbackLogPath);
          if (!fs.existsSync(fallbackDir)) {
            fs.mkdirSync(fallbackDir, { recursive: true });
          }
          fs.appendFileSync(fallbackLogPath, JSON.stringify({ ...reconRecord, dbSaved }) + '\n', 'utf8');
        } catch (fileErr) {
          console.error('[CRITICAL] Failed to append emergency reconciliation log file:', fileErr.message);
        }

        return res.status(500).json({
          success: false,
          error: 'PAYMENT_CAPTURE_PERSISTENCE_FAILED',
          message: 'Payment was successfully captured by PayPal, but saving the order in the database encountered an error. A reconciliation record has been logged for automatic fulfillment.',
          reconciliation: {
            paypalOrderId,
            paypalCaptureId: verifiedCaptureId,
            amount: cart.totalAmount,
            currency: 'USD',
            customerEmail,
            requiresReconciliation: true,
            persistedToDb: dbSaved
          }
        });
      }

      throw dbErr;
    }

    ordersCreatedTotal.labels('success').inc();

    // Return order to client with raw order access token; NEVER return access_token_hash
    const { access_token_hash, ...publicOrderRecord } = orderRecord;
    return res.status(201).json({
      success: true,
      message: 'Order created and verified successfully',
      data: {
        ...publicOrderRecord,
        accessToken: rawAccessToken
      }
    });
  } catch (err) {
    ordersCreatedTotal.labels('error').inc();
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET /api/orders — List all orders (Admin protected, PV-006)
app.get('/api/orders', async (req, res) => {
  const token = extractToken(req);
  if (!token || !JWT_SECRET) {
    return res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
  }

  const payload = verifyToken(token, JWT_SECRET);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
  }

  if (!pool) {
    return res.status(503).json({ success: false, message: 'Database service unavailable' });
  }

  const rows = await queryDatabase('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
  if (rows) {
    const sanitizedRows = rows.map(({ access_token_hash, ...r }) => r);
    return res.json({ success: true, count: sanitizedRows.length, data: sanitizedRows });
  }
  return res.json({ success: true, count: 0, data: [] });
});

// GET /api/orders/:id — Get order receipt (Secured with Order Access Token or Admin JWT, PV-006)
app.get('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid order identifier' });
  }

  // Check Admin Authorization
  const adminToken = extractToken(req);
  let isAdmin = false;
  if (adminToken && JWT_SECRET) {
    const adminPayload = verifyToken(adminToken, JWT_SECRET);
    if (adminPayload && adminPayload.role === 'admin') {
      isAdmin = true;
    }
  }

  // Check Order Access Token
  const orderToken = extractOrderToken(req);

  // If neither admin nor order token provided, fail closed with 401 without revealing order existence
  if (!isAdmin && !orderToken) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required: Valid Order Access Token or Admin credentials required.'
    });
  }

  if (!pool) {
    return res.status(503).json({ success: false, message: 'Database service unavailable' });
  }

  const rows = await queryDatabase('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
  if (!rows || rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const order = rows[0];

  // If not admin, verify candidate order token against access_token_hash using constant-time comparison
  if (!isAdmin) {
    const candidateHash = hashOrderAccessToken(orderToken);
    const storedHash = order.access_token_hash;

    if (!storedHash || !timingSafeCompare(candidateHash, storedHash)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid Order Access Token for this order.'
      });
    }
  }

  const items = await queryDatabase('SELECT * FROM order_items WHERE order_id = ?', [id]);
  const { access_token_hash, ...sanitizedOrder } = order;

  return res.json({
    success: true,
    data: {
      ...sanitizedOrder,
      items: items || []
    }
  });
});

// Inventory endpoints
app.get('/api/inventory', async (req, res) => {
  const rows = await queryDatabase('SELECT * FROM inventory ORDER BY stock_quantity ASC');
  if (rows && rows.length > 0) {
    return res.json({ success: true, count: rows.length, data: rows, source: 'mysql' });
  }
  return res.json({ success: true, count: 0, data: [], source: 'mysql' });
});

app.get('/api/inventory/:cardId', async (req, res) => {
  const { cardId } = req.params;
  const rows = await queryDatabase('SELECT * FROM inventory WHERE card_id = ? LIMIT 1', [cardId]);
  if (rows && rows.length > 0) {
    return res.json({ success: true, data: rows[0], source: 'mysql' });
  }
  const cardRows = await queryDatabase('SELECT id, in_stock FROM cards WHERE id = ? LIMIT 1', [cardId]);
  if (cardRows && cardRows.length > 0) {
    return res.json({
      success: true,
      data: { card_id: cardId, stock_quantity: Number(cardRows[0].in_stock || 0), isInStock: (cardRows[0].in_stock || 0) > 0 },
      source: 'mysql'
    });
  }
  return res.status(404).json({ success: false, message: 'Item not found in inventory' });
});

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`[order-service] Running on http://${HOST}:${PORT}`);
  console.log(`[order-service] Health probe: http://${HOST}:${PORT}/health`);
  console.log(`[order-service] Prometheus metrics: http://${HOST}:${PORT}/metrics`);
  console.log(`[order-service] Catalog service target: ${CATALOG_SERVICE_URL}`);
});
