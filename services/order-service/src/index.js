import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import {
  RECONCILIATION_STATES,
  ensureReconciliationSchema,
  persistReconciliationJob,
  createDurablePaymentIntent,
  finalizePaymentIntent,
  rollbackFailedPaymentIntent,
  markIntentAmbiguous,
  reconcilePaymentRecord,
  processPendingReconciliations,
  recoverPendingReconciliationsOnStartup
} from './reconciliation.js';
import { fileURLToPath } from 'url';
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
const PORT = process.env.ORDER_PORT || process.env.PORT || 5003;
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SIGNING_SECRET || process.env.JWT_SECRET;
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:5002';

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


// Authoritative Server-Side Promotional Rules
export function isDemoOrTestMode() {
  if (process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1' || process.env.ENABLE_TEST_COUPONS === 'true') {
    return true;
  }
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return true;
  }
  return false;
}

export const SERVER_PROMO_CODES = {
  'POKEVAULT10': { type: 'percentage', value: 10, minSubtotalCents: 0 },
  'LEGENDS20': { type: 'percentage', value: 20, minSubtotalCents: 15000 }, // $150.00
  'FREESHIP': { type: 'free_shipping', minSubtotalCents: 10000 }, // $100.00
  'TEST100': { type: 'percentage', value: 100, minSubtotalCents: 0, waiveInsurance: true }
};

const inMemoryOrders = new Map();

const inMemoryInventory = new Map();

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
      console.log(`[order-service] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Database pool initialization
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

  // Verify connection and run schema reconciliation asynchronously
  if (process.env.NODE_ENV !== 'test') {
    pool.query('SELECT 1').then(() => {
      isDbConnected = true;
      ensureSchemaAndInventory();
    }).catch((err) => {
      isDbConnected = false;
      console.warn('[order-service] MySQL initial connection warning:', err.message);
    });
  }
} catch (e) {
  console.warn('[order-service] MySQL pool init warning:', e.message);
}

// Safe idempotent schema and inventory synchronization
async function ensureSchemaAndInventory() {
  if (!pool) return;
  let acquiredLock = false;
  try {
    // Advisory lock to prevent race conditions across multiple order-service instances
    const [lockRows] = await pool.query(`SELECT GET_LOCK('pokevault_migration_lock', 10) AS lock_acquired`);
    if (!lockRows || !lockRows[0] || lockRows[0].lock_acquired !== 1) {
      console.warn('[order-service] Could not acquire migration lock within 10s. Another instance may be performing DDL.');
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

    // 2. Ensure payment_reconciliations table exists with durable schema
    await ensureReconciliationSchema(pool);

    // 3. Ensure all catalog cards have inventory records
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
    // Resume and recover any pending reconciliations from prior runs
    try {
      await recoverPendingReconciliationsOnStartup(pool, {
        paypalOptions: {
          clientId: PAYPAL_CLIENT_ID,
          clientSecret: PAYPAL_CLIENT_SECRET,
          apiBaseUrl: PAYPAL_API_BASE_URL
        }
      });
    } catch (recErr) {
      console.warn('[order-service] Notice during startup reconciliation recovery:', recErr.message);
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

// Inter-service communication: fetch verified pricing directly from catalog microservice
async function fetchVerifiedPriceFromCatalog(cardId, _parentReq = null) {
  try {
    const res = await fetch(`${CATALOG_SERVICE_URL}/api/cards/${encodeURIComponent(cardId)}`, {
      signal: AbortSignal.timeout(3000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.data && data.data.price !== undefined && data.data.price !== null) {
        const p = Number(data.data.price);
        if (Number.isFinite(p) && p >= 0) {
          return { found: true, price: p, name: data.data.name || 'Collector Card' };
        }
      }
      return { found: false, invalidPrice: true };
    } else if (res.status === 404) {
      return { found: false, notFound: true };
    } else {
      return { found: false, error: true, status: res.status };
    }
  } catch (e) {
    console.warn(`[order-service] Inter-service call to catalog failed for ${cardId}:`, e.message);
    return { found: false, error: true, message: e.message };
  }
}

const healthHandler = async (req, res) => {
  res.status(200).json({
    status: 'UP',
    database: isDbConnected ? 'mysql-connected' : 'standby',
    service: 'order-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    components: {
      mysql: isDbConnected ? 'UP' : 'STANDBY',
      catalog_service_endpoint: CATALOG_SERVICE_URL
    }
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

const metricsHandler = (req, res) => {
  const mem = process.memoryUsage();
  const uptime = process.uptime();
  const statusLines = Object.entries(statusCounts)
    .map(([status, count]) => `http_requests_total{service="order-service",status="${status}"} ${count}`)
    .join('\n');

  const output = [
    '# HELP process_uptime_seconds Process uptime in seconds.',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds{service="order-service"} ${uptime}`,
    '# HELP process_resident_memory_bytes Resident memory size in bytes.',
    '# TYPE process_resident_memory_bytes gauge',
    `process_resident_memory_bytes{service="order-service"} ${mem.rss}`,
    '# HELP nodejs_heap_size_total_bytes Total size of heap in bytes.',
    '# TYPE nodejs_heap_size_total_bytes gauge',
    `nodejs_heap_size_total_bytes{service="order-service"} ${mem.heapTotal}`,
    '# HELP nodejs_heap_size_used_bytes Process heap memory used in bytes.',
    '# TYPE nodejs_heap_size_used_bytes gauge',
    `nodejs_heap_size_used_bytes{service="order-service"} ${mem.heapUsed}`,
    '# HELP http_requests_total Total number of HTTP requests.',
    '# TYPE http_requests_total counter',
    statusLines || `http_requests_total{service="order-service",status="200"} ${totalRequests}`,
    ''
  ].filter(Boolean).join('\n');

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(output);
};
app.get('/metrics', metricsHandler);
app.get('/api/metrics', metricsHandler);

// ============================================================================
// Authoritative Server-Side Cart & Pricing Calculation
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

  // Server-Side Promotion & Discount Calculation
  let discountCents = 0;
  let appliedPromo = '';
  let shippingCostCents = 0;
  let insuranceCostCents = insuranceIncluded ? 999 : 0; // $9.99
  let taxCostCents = 0;
  let handlingCostCents = 0;
  let additionalFeesCents = 0;

  const rawPromo = typeof promoCode === 'string' ? promoCode.trim().toUpperCase() : '';
  if (rawPromo) {
    const promoConfig = SERVER_PROMO_CODES[rawPromo];
    if (!promoConfig) {
      return { valid: false, status: 400, message: `Invalid promotional code: "${promoCode}"` };
    }
    if (promoConfig.demoOnly) {
      if (!isDemoOrTestMode()) {
        return {
          valid: false,
          status: 403,
          error: 'PROMO_DEMO_RESTRICTED',
          message: `Promotional code "${rawPromo}" is restricted to demo/test mode and cannot be used in production.`
        };
      }
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
      if (promoConfig.value >= 100) {
        // TEST100: 100% discount on entire order. All charges, shipping, insurance, taxes, and fees become zero.
        discountCents = subtotalCents;
        shippingCostCents = 0;
        insuranceCostCents = 0;
        taxCostCents = 0;
        handlingCostCents = 0;
        additionalFeesCents = 0;
      } else if (promoConfig.waiveInsurance) {
        insuranceCostCents = 0;
      }
    } else if (promoConfig.type === 'free_shipping') {
      insuranceCostCents = 0;
      shippingCostCents = 0;
      discountCents = 0;
    }
  }

  // Ensure all charges and fees are strictly zero when TEST100 is applied
  if (appliedPromo === 'TEST100') {
    discountCents = subtotalCents;
    shippingCostCents = 0;
    insuranceCostCents = 0;
    taxCostCents = 0;
    handlingCostCents = 0;
    additionalFeesCents = 0;
  }

  // Mathematical consistency and prevention of negative totals
  discountCents = Math.min(discountCents, subtotalCents);
  const totalFeesCents = shippingCostCents + insuranceCostCents + taxCostCents + handlingCostCents + additionalFeesCents;
  const totalCents = Math.max(0, subtotalCents + totalFeesCents - discountCents);

  const isZeroTotal = totalCents === 0 && appliedPromo === 'TEST100';
  const processedLineItems = lineItems.map(item => ({
    ...item,
    discountCents: isZeroTotal ? item.lineTotalCents : 0,
    discountAmount: isZeroTotal ? item.subtotal : 0.00,
    payableCents: isZeroTotal ? 0 : item.lineTotalCents,
    payableAmount: isZeroTotal ? 0.00 : item.subtotal
  }));

  return {
    valid: true,
    lineItems: processedLineItems,
    subtotalCents,
    subtotal: +(subtotalCents / 100).toFixed(2),
    discountCents,
    discountAmount: +(discountCents / 100).toFixed(2),
    appliedPromo,
    shippingCostCents,
    shippingCost: +(shippingCostCents / 100).toFixed(2),
    insuranceCostCents,
    insuranceCost: +(insuranceCostCents / 100).toFixed(2),
    taxCostCents,
    taxCost: +(taxCostCents / 100).toFixed(2),
    handlingCostCents,
    handlingCost: +(handlingCostCents / 100).toFixed(2),
    additionalFeesCents,
    additionalFees: +(additionalFeesCents / 100).toFixed(2),
    totalCents,
    totalAmount: +(totalCents / 100).toFixed(2),
    isFreeOrder: isZeroTotal
  };
}

// ============================================================================
// PAYPAL PAYMENT GATEWAY ENDPOINTS
// ============================================================================

// POST /api/paypal/create-order — Server-side authenticated PayPal order creation
app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { items = [], promoCode = '', insuranceIncluded = true } = req.body;

    const cart = await calculateAuthoritativeCart(items, promoCode, insuranceIncluded, req);
    if (!cart.valid) {
      return res.status(cart.status).json({ success: false, message: cart.message });
    }

    if (cart.totalCents === 0) {
      return res.status(400).json({
        success: false,
        error: 'ZERO_PAYABLE_AMOUNT',
        message: 'Order total is $0.00 due to applied discount. Payment gateway processing is not required.'
      });
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
    const {
      paypalOrderId,
      items = [],
      promoCode = '',
      insuranceIncluded = true,
      customerName = 'Vault Collector',
      customerEmail = 'collector@pokevault.com',
      shippingAddress = '123 Pallet Town Way, Kanto'
    } = req.body;

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

    // 1. Authoritative Cart & Price Validation
    const cart = await calculateAuthoritativeCart(items, promoCode, insuranceIncluded, req);
    if (!cart.valid) {
      return res.status(cart.status).json({ success: false, message: cart.message });
    }

    if (cart.totalCents === 0) {
      return res.status(400).json({
        success: false,
        error: 'ZERO_PAYABLE_AMOUNT',
        message: 'Order total is $0.00 due to applied discount. Payment capture is not required.'
      });
    }

    // 2. Fail closed if PayPal credentials are not configured
    if (!isPayPalConfigured(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)) {
      return res.status(503).json({
        success: false,
        error: 'PAYMENT_GATEWAY_UNCONFIGURED',
        message: 'PayPal payment gateway is not configured on the server. Simulated captures are disabled.'
      });
    }

    // 3. Persist durable payment intent & pending order to MySQL BEFORE external capture
    if (!pool) {
      return res.status(503).json({
        success: false,
        error: 'DATABASE_UNAVAILABLE',
        message: 'Database service unavailable. Payment capture was not initiated to protect payment safety.'
      });
    }

    const captureOwnerId = req.headers['x-request-id']
      ? String(req.headers['x-request-id'])
      : `sync-capture-${paypalOrderId}-${Date.now()}`;

    let intent;
    try {
      intent = await createDurablePaymentIntent(pool, {
        paypalOrderId,
        cart,
        customerName,
        customerEmail,
        shippingAddress,
        promoCode: cart.appliedPromo,
        insuranceIncluded,
        ownerId: captureOwnerId,
        leaseDurationSeconds: 120
      });
    } catch (dbErr) {
      console.error('[order-service] Failed to persist durable payment intent before capture:', dbErr.message);
      // Capture is NEVER initiated if MySQL fails to commit the intent
      return res.status(503).json({
        success: false,
        error: 'PAYMENT_INTENT_PERSISTENCE_FAILED',
        message: `Database failure during payment intent commitment: ${dbErr.message}. Capture was not initiated.`
      });
    }

    // Idempotent: If already completed in database
    if (intent.alreadyCompleted) {
      return res.json({
        success: true,
        alreadyCompleted: true,
        orderId: intent.orderId,
        captureId: intent.captureId,
        status: PAYMENT_STATES.COMPLETED,
        message: 'Order payment was already captured and finalized.'
      });
    }

    // Protection against concurrent duplicate capture requests
    if (intent.activeCaptureInProgress) {
      return res.status(409).json({
        success: false,
        error: 'CAPTURE_IN_PROGRESS',
        message: intent.error || 'A payment capture operation is currently in progress for this order.',
        orderId: intent.orderId
      });
    }

    const { orderId, idempotencyKey } = intent;

    // 4. Issue external capture using provider's supported idempotency mechanism (PayPal-Request-Id)
    const captureResult = await capturePayPalServerOrder({
      paypalOrderId,
      requestId: idempotencyKey,
      options: {
        clientId: PAYPAL_CLIENT_ID,
        clientSecret: PAYPAL_CLIENT_SECRET,
        apiBaseUrl: PAYPAL_API_BASE_URL
      }
    });

    if (!captureResult.success) {
      const isAmbiguousTimeout = (captureResult.status >= 500) || /timeout|network|econnrefused|econnreset/i.test(captureResult.error || '');
      if (isAmbiguousTimeout) {
        // Record ambiguous state so recovery checks provider payment state
        await markIntentAmbiguous(pool, { orderId, idempotencyKey, paypalOrderId, error: captureResult.error });
        return res.status(504).json({
          success: false,
          error: 'PAYPAL_CAPTURE_AMBIGUOUS_TIMEOUT',
          message: captureResult.error || 'Payment capture timed out with provider. Intent is recorded for automatic recovery.',
          orderId
        });
      }

      // Non-retryable failure (e.g. 422 rejected, unapproved, buyer cancelled):
      // Roll back inventory and mark order & reconciliation FAILED
      await rollbackFailedPaymentIntent(pool, {
        orderId,
        idempotencyKey,
        paypalOrderId,
        error: captureResult.error || 'PayPal capture failed'
      });

      return res.status(captureResult.status || 400).json({
        success: false,
        error: 'PAYPAL_CAPTURE_FAILED',
        message: captureResult.error || 'Payment capture failed with provider'
      });
    }

    // 5. Verify provider capture details against authoritative cart
    const verification = verifyPayPalCapture({
      captureResponse: captureResult.data,
      expectedTotalAmount: cart.totalAmount,
      expectedCurrency: 'USD'
    });

    if (!verification.verified) {
      // Amount/currency mismatch: flag for human review
      await markIntentAmbiguous(pool, {
        orderId,
        idempotencyKey,
        paypalOrderId,
        error: `Verification mismatch: ${verification.reason}`
      });

      return res.status(422).json({
        success: false,
        error: 'PAYMENT_VERIFICATION_MISMATCH',
        message: `Capture verification failed: ${verification.reason}`
      });
    }

    // 6. Update persisted payment/order state in MySQL
    try {
      await finalizePaymentIntent(pool, {
        orderId,
        idempotencyKey,
        paypalOrderId,
        captureId: verification.captureId
      });
    } catch (postCaptureErr) {
      console.error('[CRITICAL] Capture succeeded but MySQL post-capture finalization delayed:', postCaptureErr.message);
      // NOTE: Intent is ALREADY durably committed in MySQL!
      // It remains recoverable once MySQL returns.
      return res.status(500).json({
        success: false,
        error: 'POST_CAPTURE_UPDATE_DELAYED',
        recoverable: true,
        orderId,
        captureId: verification.captureId,
        message: 'Payment was captured by provider. Pre-committed intent is recorded and will be finalized automatically.'
      });
    }

    return res.json({
      success: true,
      orderId,
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

// GET /api/paypal/reconcile — Query pending or ambiguous reconciliation jobs
app.get('/api/paypal/reconcile', async (req, res) => {
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

  try {
    const status = req.query.status || null;
    let rows;
    if (status) {
      rows = await queryDatabase(
        'SELECT * FROM payment_reconciliations WHERE status = ? ORDER BY created_at DESC LIMIT 50',
        [status]
      );
    } else {
      rows = await queryDatabase(
        'SELECT * FROM payment_reconciliations ORDER BY created_at DESC LIMIT 50'
      );
    }
    return res.json({ success: true, reconciliations: rows || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/paypal/reconcile — Reconcile captured payment or execute reconciliation jobs
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

  const { paypalOrderId, paypalCaptureId, reconciliationId, action } = req.body;

  // Active execution / processing mode
  if (action === 'process' || req.body.reconcile === true) {
    try {
      if (reconciliationId || paypalOrderId || paypalCaptureId) {
        let job = null;
        if (reconciliationId) {
          const rows = await queryDatabase('SELECT * FROM payment_reconciliations WHERE id = ? LIMIT 1', [reconciliationId]);
          job = rows?.[0];
        } else {
          const rows = await queryDatabase(
            'SELECT * FROM payment_reconciliations WHERE paypal_order_id = ? OR paypal_capture_id = ? ORDER BY created_at DESC LIMIT 1',
            [paypalOrderId || '', paypalCaptureId || '']
          );
          job = rows?.[0];
        }

        if (!job) {
          return res.status(404).json({ success: false, message: 'Reconciliation record not found' });
        }

        const result = await reconcilePaymentRecord(pool, job, {
          paypalOptions: {
            clientId: PAYPAL_CLIENT_ID,
            clientSecret: PAYPAL_CLIENT_SECRET,
            apiBaseUrl: PAYPAL_API_BASE_URL
          }
        });

        return res.json({ success: true, ...result });
      }

      // Batch process all eligible pending reconciliations
      const summary = await processPendingReconciliations(pool, {
        paypalOptions: {
          clientId: PAYPAL_CLIENT_ID,
          clientSecret: PAYPAL_CLIENT_SECRET,
          apiBaseUrl: PAYPAL_API_BASE_URL
        }
      });
      return res.json({ success: true, summary });
    } catch (err) {
      console.error('[order-service] Error processing reconciliation:', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Query mode (default)
  if (!paypalOrderId && !paypalCaptureId && !reconciliationId) {
    return res.status(400).json({ success: false, message: 'Either paypalOrderId, paypalCaptureId, or reconciliationId must be provided' });
  }

  const rows = await queryDatabase(
    'SELECT * FROM payment_reconciliations WHERE paypal_order_id = ? OR paypal_capture_id = ? OR id = ? ORDER BY created_at DESC LIMIT 10',
    [paypalOrderId || '', paypalCaptureId || '', reconciliationId || 0]
  );

  return res.json({
    success: true,
    reconciliations: rows || []
  });
});

// PATCH /api/orders/:id/payment — Controlled payment state transitions
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
// ORDER CREATION ENDPOINT
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

    // Step 1: Reject fabricated DEMO payment identifiers
    if (typeof paypalOrderId === 'string' && (paypalOrderId.toUpperCase().startsWith('DEMO-') || paypalOrderId.includes('MOCK'))) {
      return res.status(400).json({
        success: false,
        error: 'FABRICATED_PAYMENT_REJECTED',
        message: 'Fabricated DEMO payment identifiers are strictly prohibited.'
      });
    }

    // Step 2: Calculate Authoritative Pricing and Discounts
    const cart = await calculateAuthoritativeCart(items, promoCode, insuranceIncluded, req);
    if (!cart.valid) {
      return res.status(cart.status).json({ success: false, message: cart.message });
    }

    // Step 3: Check Idempotency for repeated PayPal captures / order submissions
    if (paypalOrderId) {
      const [existingOrders] = await pool.query(
        'SELECT * FROM orders WHERE paypal_order_id = ? OR paypal_capture_id = ? LIMIT 1',
        [paypalOrderId, paypalCaptureId || paypalOrderId]
      );
      if (existingOrders && existingOrders.length > 0) {
        const existing = existingOrders[0];
        if (existing.payment_status === PAYMENT_STATES.COMPLETED) {
          const { access_token_hash: _access_token_hash, ...sanitized } = existing;
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

        // If existing order was pre-committed as pending payment intent:
        if (existing.payment_status === PAYMENT_STATES.PENDING && (paypalCaptureId || (paypalOrderId && isPayPalConfigured(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)))) {
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
                expectedTotalAmount: Number(existing.total_amount),
                expectedCurrency: 'USD'
              });
              if (verification.verified) {
                await finalizePaymentIntent(pool, {
                  orderId: existing.id,
                  paypalOrderId,
                  captureId: verification.captureId
                });
                existing.payment_status = PAYMENT_STATES.COMPLETED;
                existing.order_status = ORDER_STATES.RECEIVED;
                existing.paypal_capture_id = verification.captureId;
                const { access_token_hash: _access_token_hash, ...sanitized } = existing;
                const itemsRows = await queryDatabase('SELECT * FROM order_items WHERE order_id = ?', [existing.id]);
                return res.status(200).json({
                  success: true,
                  idempotent: true,
                  message: 'Order finalized from pre-committed payment intent',
                  data: {
                    ...sanitized,
                    items: itemsRows || []
                  }
                });
              }
            }
          } catch (verErr) {
            console.warn('[order-service] Failed to verify payment for existing pending order:', verErr.message);
          }
        }
      }
    }

    // Step 4: Server-Side Payment Verification
    // Never mark payment_status: "completed" merely because the frontend submitted a request!
    let paymentStatus = PAYMENT_STATES.PENDING;
    let orderStatus = ORDER_STATES.PENDING_PAYMENT;
    let verifiedCaptureId = paypalCaptureId;

    if (cart.totalCents === 0 && cart.appliedPromo === 'TEST100') {
      // Authorized 100% demo coupon: zero payable total.
      // Represent truthfully as FREE_WAIVED ('free_waived') to clearly distinguish from paid captures.
      // Do not create a fake payment capture ID; paypal_capture_id and paypal_order_id remain null.
      paymentStatus = PAYMENT_STATES.FREE_WAIVED;
      orderStatus = ORDER_STATES.RECEIVED;
      verifiedCaptureId = null;
    } else if (paymentMethod === 'PayPal') {
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

    // Generate high-entropy order access token
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
      payment_method: cart.totalCents === 0 && cart.appliedPromo === 'TEST100'
        ? (paymentMethod && paymentMethod !== 'PayPal' ? paymentMethod : 'TEST100 Waiver')
        : paymentMethod,
      payment_status: paymentStatus,
      paypal_order_id: cart.totalCents === 0 && cart.appliedPromo === 'TEST100' ? null : (paypalOrderId || null),
      paypal_capture_id: verifiedCaptureId || null,
      tracking_number: trackingNumber,
      access_token_hash: accessTokenHash,
      items: cart.lineItems.map(({ cardId, cardName, unitPrice, quantity, subtotal, discountAmount, payableAmount }) => ({
        cardId, cardName, unitPrice, quantity, subtotal,
        discountAmount: discountAmount !== undefined ? discountAmount : 0,
        payableAmount: payableAmount !== undefined ? payableAmount : subtotal
      })),
      created_at: new Date().toISOString()
    };

    // Step 5: Transactional, Atomic Database Execution with dedicated connection
    let connection = null;
    let isDbPersisted = false;

    try {
      if (pool) {
        connection = await pool.getConnection();
      }
    } catch (connErr) {
      isDbConnected = false;
    }

    if (connection) {
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
            connection = null;
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
        connection = null;
        isDbPersisted = true;
      } catch (dbErr) {
        if (connection) {
          try { await connection.rollback(); } catch (_) {}
          try { connection.release(); } catch (_) {}
          connection = null;
        }

        // Step 6: Post-Capture Database Persistence Failure Handling
        if (paymentStatus === PAYMENT_STATES.COMPLETED && verifiedCaptureId) {
          console.error(`[CRITICAL_PAYMENT_RECONCILIATION_REQUIRED] PayPal capture ${verifiedCaptureId} succeeded for order ${orderId} but database persistence failed: ${dbErr.message}`);

          let reconResult = null;
          let dbSaved = false;
          try {
            reconResult = await persistReconciliationJob(pool, {
              idempotencyKey: `recon_pp_${paypalOrderId || verifiedCaptureId}`,
              orderId,
              paypalOrderId: paypalOrderId || 'UNKNOWN',
              paypalCaptureId: verifiedCaptureId,
              amount: cart.totalAmount,
              currency: 'USD',
              customerEmail,
              error: dbErr.message,
              status: RECONCILIATION_STATES.PENDING
            });
            dbSaved = Boolean(reconResult && reconResult.success);
          } catch (reconErr) {
            console.error('[CRITICAL] Failed to persist reconciliation record to MySQL:', reconErr.message);
          }

          // Database persistence failure response
          return res.status(500).json({
            success: false,
            error: dbSaved ? 'PAYMENT_CAPTURE_PERSISTED_FOR_RECONCILIATION' : 'PAYMENT_CAPTURE_PERSISTENCE_FAILED',
            message: dbSaved
              ? 'Payment was successfully captured by PayPal, but final order persistence encountered a database delay. A durable reconciliation job has been queued in MySQL for automatic fulfillment.'
              : 'Payment was captured by PayPal, but database persistence failed. No local file fallback used. Support notification required.',
            reconciliation: {
              paypalOrderId,
              paypalCaptureId: verifiedCaptureId,
              amount: cart.totalAmount,
              currency: 'USD',
              customerEmail,
              requiresReconciliation: true,
              persistedDurable: dbSaved,
              reconciliationId: reconResult?.reconciliationId || null
            }
          });
        }

        throw dbErr;
      }
    }

    if (!isDbPersisted) {
      for (const it of cart.lineItems) {
        const cur = inMemoryInventory.get(it.cardId) ?? 10;
        inMemoryInventory.set(it.cardId, Math.max(0, cur - it.quantity));
      }
      inMemoryOrders.set(orderRecord.id, orderRecord);
    }

    // Return order to client with raw order access token; NEVER return access_token_hash
    const { access_token_hash: _access_token_hash, ...publicOrderRecord } = orderRecord;
    return res.status(201).json({
      success: true,
      message: 'Order created and verified successfully',
      data: {
        ...publicOrderRecord,
        accessToken: rawAccessToken
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET /api/orders — List all orders
app.get('/api/orders', async (req, res) => {
  const token = extractToken(req);
  if (!token || !JWT_SECRET) {
    return res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
  }

  const payload = verifyToken(token, JWT_SECRET);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
  }

  const rows = await queryDatabase('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
  if (rows && rows.length > 0) {
    const sanitizedRows = rows.map(({ access_token_hash: _access_token_hash, ...r }) => r);
    return res.json({ success: true, count: sanitizedRows.length, data: sanitizedRows });
  }
  const fallbackList = Array.from(inMemoryOrders.values()).map(({ access_token_hash: _access_token_hash, ...r }) => r);
  return res.json({ success: true, count: fallbackList.length, data: fallbackList });
});

// GET /api/orders/:id — Get order receipt
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

  let order = null;
  let items = [];

  const rows = await queryDatabase('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
  if (rows && rows.length > 0) {
    order = rows[0];
    items = (await queryDatabase('SELECT * FROM order_items WHERE order_id = ?', [id])) || [];
  } else if (inMemoryOrders.has(id)) {
    order = inMemoryOrders.get(id);
    items = order.items || [];
  }

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

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

  const { access_token_hash: _access_token_hash, ...sanitizedOrder } = order;

  return res.json({
    success: true,
    data: {
      ...sanitizedOrder,
      items: items || []
    }
  });
});

// PUT /api/orders/:id — Update order status or tracking (Admin protected)
app.put('/api/orders/:id', async (req, res) => {
  const token = extractToken(req);
  if (!token || !JWT_SECRET) {
    return res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
  }
  const payload = verifyToken(token, JWT_SECRET);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
  }

  const { id } = req.params;
  const { order_status, tracking_number } = req.body || {};

  await queryDatabase(
    'UPDATE orders SET order_status = COALESCE(?, order_status), tracking_number = COALESCE(?, tracking_number) WHERE id = ?',
    [order_status || null, tracking_number || null, id]
  );

  if (inMemoryOrders.has(id)) {
    const existing = inMemoryOrders.get(id);
    if (order_status) existing.order_status = order_status;
    if (tracking_number) existing.tracking_number = tracking_number;
    inMemoryOrders.set(id, existing);
  }

  return res.json({ success: true, message: 'Order updated successfully' });
});

// DELETE /api/orders/:id — Delete order (Admin protected)
app.delete('/api/orders/:id', async (req, res) => {
  const token = extractToken(req);
  if (!token || !JWT_SECRET) {
    return res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
  }
  const payload = verifyToken(token, JWT_SECRET);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
  }

  const { id } = req.params;
  await queryDatabase('DELETE FROM orders WHERE id = ?', [id]);
  inMemoryOrders.delete(id);
  return res.json({ success: true, message: 'Order deleted successfully' });
});

// Inventory endpoints
app.get('/api/inventory', async (req, res) => {
  const rows = await queryDatabase('SELECT * FROM inventory ORDER BY stock_quantity ASC');
  if (rows && rows.length > 0) {
    return res.json({ success: true, count: rows.length, data: rows, source: 'mysql' });
  }
  const list = Array.from(inMemoryInventory.entries()).map(([card_id, stock_quantity]) => ({
    card_id,
    stock_quantity,
    warehouse_location: 'Vault Alpha-1'
  }));
  return res.json({ success: true, count: list.length, data: list, source: 'in-memory' });
});

app.get('/api/inventory/:cardId', async (req, res) => {
  const { cardId } = req.params;
  const rows = await queryDatabase('SELECT * FROM inventory WHERE card_id = ? LIMIT 1', [cardId]);
  if (rows && rows.length > 0) {
    return res.json({ success: true, data: rows[0], source: 'mysql' });
  }
  const stock = inMemoryInventory.get(cardId) ?? 10;
  return res.json({
    success: true,
    data: { card_id: cardId, stock_quantity: stock, isInStock: stock > 0 },
    source: 'in-memory'
  });
});

app.put('/api/inventory/:cardId', async (req, res) => {
  const token = extractToken(req);
  if (!token || !JWT_SECRET) {
    return res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
  }
  const payload = verifyToken(token, JWT_SECRET);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
  }

  const { cardId } = req.params;
  const stock = Number(req.body?.stock ?? req.body?.in_stock ?? req.body?.stock_quantity ?? 10);
  inMemoryInventory.set(cardId, stock);

  await queryDatabase('UPDATE inventory SET stock_quantity = ? WHERE card_id = ?', [stock, cardId]);
  await queryDatabase('UPDATE cards SET in_stock = ? WHERE id = ?', [stock, cardId]);

  return res.json({ success: true, cardId, stock });
});

let inMemoryStoreSettings = {
  id: 'default',
  is_hype_drop_active: false,
  drop_password: 'POKEVAULTVIP',
  drop_timestamp: '2026-10-01T00:00:00.000Z',
  opt_in_count: 342
};

app.get('/api/settings', async (req, res) => {
  const rows = await queryDatabase('SELECT * FROM store_settings WHERE id = "default" LIMIT 1');
  if (rows && rows.length > 0) {
    const s = rows[0];
    return res.json({
      success: true,
      data: {
        is_hype_drop_active: Boolean(s.is_hype_drop_active),
        drop_password: s.drop_password || 'POKEVAULTVIP',
        drop_timestamp: s.drop_timestamp || '2026-10-01T00:00:00.000Z',
        opt_in_count: Number(s.opt_in_count || 0)
      }
    });
  }
  return res.json({ success: true, data: inMemoryStoreSettings });
});

app.put('/api/settings', async (req, res) => {
  const token = extractToken(req);
  if (!token || !JWT_SECRET) {
    return res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
  }
  const payload = verifyToken(token, JWT_SECRET);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Valid Admin token required.' });
  }

  const { is_hype_drop_active, drop_password, drop_timestamp, opt_in_count } = req.body || {};
  if (is_hype_drop_active !== undefined) inMemoryStoreSettings.is_hype_drop_active = Boolean(is_hype_drop_active);
  if (drop_password !== undefined) inMemoryStoreSettings.drop_password = String(drop_password);
  if (drop_timestamp !== undefined) inMemoryStoreSettings.drop_timestamp = String(drop_timestamp);
  if (opt_in_count !== undefined) inMemoryStoreSettings.opt_in_count = Number(opt_in_count);

  await queryDatabase(`
    INSERT INTO store_settings (id, is_hype_drop_active, drop_password, drop_timestamp, opt_in_count)
    VALUES ('default', ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      is_hype_drop_active = VALUES(is_hype_drop_active),
      drop_password = VALUES(drop_password),
      drop_timestamp = VALUES(drop_timestamp),
      opt_in_count = VALUES(opt_in_count)
  `, [
    inMemoryStoreSettings.is_hype_drop_active,
    inMemoryStoreSettings.drop_password,
    inMemoryStoreSettings.drop_timestamp,
    inMemoryStoreSettings.opt_in_count
  ]);

  return res.json({ success: true, data: inMemoryStoreSettings, message: 'Store settings updated successfully' });
});

app.post('/api/settings/opt-in', async (req, res) => {
  inMemoryStoreSettings.opt_in_count = (inMemoryStoreSettings.opt_in_count || 0) + 1;
  await queryDatabase('UPDATE store_settings SET opt_in_count = opt_in_count + 1 WHERE id = "default"');
  return res.json({ success: true, count: inMemoryStoreSettings.opt_in_count });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`[order-service] Running on http://${HOST}:${PORT}`);
    console.log(`[order-service] Health probe: http://${HOST}:${PORT}/health`);
    console.log(`[order-service] Catalog service target: ${CATALOG_SERVICE_URL}`);
  });
}

export default app;
export { app };
