/**
 * PokéVault Legends — Durable Payment Reconciliation & Order Reliability Engine
 *
 * Implements database-backed, idempotent, observable, and retryable payment reconciliation.
 * Uses MySQL as the authoritative source of truth.
 *
 * Safety Corrections:
 * 1. Intent-Before-Capture: Durably persists a pending order/payment intent with inventory reservation
 *    to MySQL before issuing external PayPal capture requests. Fails closed if MySQL is unavailable.
 * 2. Lease-Based Recovery: Safe reclamation of expired PROCESSING jobs if a worker crashes mid-task,
 *    preventing jobs from remaining stranded indefinitely while guarding against concurrent worker races.
 * 3. Provider State Verification: Always queries provider before repeating actions.
 * 4. PII Minimization: Leverages durable order record instead of duplicating customer PII in reconciliation jobs.
 */

import { fetchPayPalOrderDetails, capturePayPalServerOrder, verifyPayPalCapture, PAYMENT_STATES, ORDER_STATES } from './paypal.js';

// ============================================================================
// CONSTANTS & STATE DEFINITIONS
// ============================================================================

export const RECONCILIATION_STATES = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  AMBIGUOUS: 'AMBIGUOUS',
  REQUIRES_HUMAN_REVIEW: 'REQUIRES_HUMAN_REVIEW'
});

export const RECONCILIATION_DEFAULTS = Object.freeze({
  MAX_ATTEMPTS: 5,
  INITIAL_BACKOFF_SECONDS: 15,
  MAX_BACKOFF_SECONDS: 300,
  BATCH_LIMIT: 20,
  LEASE_DURATION_SECONDS: 120 // 2 minutes worker lease timeout
});

/**
 * Calculates exponential backoff with a hard cap to avoid infinite delays.
 */
export function calculateBackoffSeconds(
  attemptCount,
  initialSec = RECONCILIATION_DEFAULTS.INITIAL_BACKOFF_SECONDS,
  maxSec = RECONCILIATION_DEFAULTS.MAX_BACKOFF_SECONDS
) {
  const attempts = Math.max(1, Number(attemptCount) || 1);
  const backoff = initialSec * Math.pow(2, attempts - 1);
  return Math.min(maxSec, Math.round(backoff));
}

/**
 * Generates an idempotent key for payment reconciliation operations.
 */
export function generateIdempotencyKey(paypalOrderId, captureId) {
  if (paypalOrderId && typeof paypalOrderId === 'string') {
    return `recon_pp_${paypalOrderId.trim()}`;
  }
  if (captureId && typeof captureId === 'string') {
    return `recon_cap_${captureId.trim()}`;
  }
  return `recon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// SCHEMA MIGRATION & RECONCILIATION
// ============================================================================

/**
 * Ensures payment_reconciliations table has all necessary columns and indexes for durable tracking.
 */
export async function ensureReconciliationSchema(pool) {
  if (!pool) return;

  // 1. Base table creation if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_reconciliations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      idempotency_key VARCHAR(128) NOT NULL,
      order_id VARCHAR(100) DEFAULT NULL,
      paypal_order_id VARCHAR(100) NOT NULL,
      paypal_capture_id VARCHAR(100) DEFAULT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      customer_email VARCHAR(255),
      customer_name VARCHAR(255) DEFAULT NULL,
      shipping_address TEXT DEFAULT NULL,
      items_payload JSON DEFAULT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      attempt_count INT NOT NULL DEFAULT 0,
      max_attempts INT NOT NULL DEFAULT 5,
      next_retry_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      locked_by VARCHAR(100) DEFAULT NULL,
      locked_at TIMESTAMP NULL DEFAULT NULL,
      lease_expires_at TIMESTAMP NULL DEFAULT NULL,
      last_error TEXT DEFAULT NULL,
      error_message TEXT DEFAULT NULL,
      resolved BOOLEAN DEFAULT FALSE,
      resolved_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_recon_idempotency (idempotency_key),
      INDEX idx_recon_paypal_order (paypal_order_id),
      INDEX idx_recon_capture (paypal_capture_id),
      INDEX idx_recon_status_retry (status, next_retry_at),
      INDEX idx_recon_lease (status, lease_expires_at),
      INDEX idx_recon_order_id (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // 2. Introspect existing columns for backwards compatibility with earlier schema revisions
  const [cols] = await pool.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_reconciliations'
  `);
  const colSet = new Set(cols.map(c => c.COLUMN_NAME));

  const addColumnSafe = async (colName, colDef) => {
    if (!colSet.has(colName)) {
      try {
        console.log(`[order-service] Adding ${colName} column to payment_reconciliations...`);
        await pool.query(`ALTER TABLE payment_reconciliations ADD COLUMN ${colName} ${colDef}`);
      } catch (e) {
        console.warn(`[order-service] Column add notice for ${colName}:`, e.message);
      }
    }
  };

  await addColumnSafe('idempotency_key', 'VARCHAR(128) DEFAULT NULL');
  await addColumnSafe('order_id', 'VARCHAR(100) DEFAULT NULL');
  await addColumnSafe('customer_name', 'VARCHAR(255) DEFAULT NULL');
  await addColumnSafe('shipping_address', 'TEXT DEFAULT NULL');
  await addColumnSafe('items_payload', 'JSON DEFAULT NULL');
  await addColumnSafe('status', "VARCHAR(50) NOT NULL DEFAULT 'PENDING'");
  await addColumnSafe('attempt_count', 'INT NOT NULL DEFAULT 0');
  await addColumnSafe('max_attempts', 'INT NOT NULL DEFAULT 5');
  await addColumnSafe('next_retry_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP');
  await addColumnSafe('locked_by', 'VARCHAR(100) DEFAULT NULL');
  await addColumnSafe('locked_at', 'TIMESTAMP NULL DEFAULT NULL');
  await addColumnSafe('lease_expires_at', 'TIMESTAMP NULL DEFAULT NULL');
  await addColumnSafe('last_error', 'TEXT DEFAULT NULL');
  await addColumnSafe('resolved_at', 'TIMESTAMP NULL DEFAULT NULL');
  await addColumnSafe('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  // Backfill idempotency_key for legacy rows if any
  try {
    await pool.query(`
      UPDATE payment_reconciliations
      SET idempotency_key = CONCAT('recon_pp_', paypal_order_id, '_', id)
      WHERE idempotency_key IS NULL OR idempotency_key = ''
    `);
  } catch (e) {
    // Ignore if no legacy rows
  }

  // Ensure recovery indexes exist idempotently
  try {
    const [indexes] = await pool.query('SHOW INDEX FROM payment_reconciliations');
    const idxNames = new Set((indexes || []).map(i => i.Key_name));
    if (!idxNames.has('uk_recon_idempotency')) {
      await pool.query('ALTER TABLE payment_reconciliations ADD UNIQUE KEY uk_recon_idempotency (idempotency_key)');
    }
    if (!idxNames.has('idx_recon_lease')) {
      await pool.query('ALTER TABLE payment_reconciliations ADD INDEX idx_recon_lease (status, lease_expires_at)');
    }
    if (!idxNames.has('idx_recon_order_id')) {
      await pool.query('ALTER TABLE payment_reconciliations ADD INDEX idx_recon_order_id (order_id)');
    }
  } catch (idxErr) {
    // Silently continue if SHOW INDEX is unsupported by mock or user lacks privileges
  }
}

// ============================================================================
// DURABLE PERSISTENCE & IDEMPOTENCY
// ============================================================================

/**
 * Durably persists a reconciliation job in MySQL with uniqueness and idempotency guarantees.
 * Avoids copying customer names, shipping addresses or items when linked to an existing order.
 * Throws on database failure — NEVER falls back to local file.
 */
export async function persistReconciliationJob(pool, {
  idempotencyKey = null,
  orderId = null,
  paypalOrderId,
  paypalCaptureId = null,
  amount,
  currency = 'USD',
  customerEmail = null,
  customerName = null,
  shippingAddress = null,
  items = null,
  error = null,
  status = RECONCILIATION_STATES.PENDING,
  maxAttempts = RECONCILIATION_DEFAULTS.MAX_ATTEMPTS
}) {
  if (!pool) {
    throw new Error('Database service unavailable: cannot durably persist payment reconciliation job');
  }

  if (!paypalOrderId && !paypalCaptureId) {
    throw new Error('Either paypalOrderId or paypalCaptureId is required for reconciliation');
  }

  const finalKey = idempotencyKey || generateIdempotencyKey(paypalOrderId, paypalCaptureId);
  const hasLinkedOrder = Boolean(orderId);
  const itemsJson = hasLinkedOrder ? null : (items ? JSON.stringify(items) : null);
  const sanitizedCustomerName = hasLinkedOrder ? null : (customerName || null);
  const sanitizedShippingAddress = hasLinkedOrder ? null : (typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : shippingAddress);
  const initialNextRetry = new Date();

  // Check if an existing reconciliation with this idempotency key already exists
  const [existing] = await pool.query(
    'SELECT * FROM payment_reconciliations WHERE idempotency_key = ? OR (paypal_order_id = ? AND paypal_order_id IS NOT NULL AND status = "COMPLETED") LIMIT 1',
    [finalKey, paypalOrderId || '']
  );

  if (existing && existing.length > 0) {
    const rec = existing[0];
    return {
      success: true,
      alreadyExists: true,
      reconciliationId: rec.id,
      idempotencyKey: rec.idempotency_key,
      status: rec.status,
      job: rec
    };
  }

  try {
    const [insertResult] = await pool.query(`
      INSERT INTO payment_reconciliations (
        idempotency_key, order_id, paypal_order_id, paypal_capture_id,
        amount, currency, customer_email, customer_name, shipping_address,
        items_payload, status, attempt_count, max_attempts, next_retry_at,
        last_error, error_message, resolved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
    `, [
      finalKey,
      orderId,
      paypalOrderId || '',
      paypalCaptureId || null,
      Number(amount) || 0,
      currency || 'USD',
      customerEmail,
      sanitizedCustomerName,
      sanitizedShippingAddress,
      itemsJson,
      status,
      maxAttempts,
      initialNextRetry,
      error,
      error,
      status === RECONCILIATION_STATES.COMPLETED
    ]);

    return {
      success: true,
      alreadyExists: false,
      reconciliationId: insertResult.insertId,
      idempotencyKey: finalKey,
      status
    };
  } catch (insertErr) {
    if (insertErr.code === 'ER_DUP_ENTRY' || insertErr.errno === 1062) {
      const [dupRows] = await pool.query(
        'SELECT * FROM payment_reconciliations WHERE idempotency_key = ? LIMIT 1',
        [finalKey]
      );
      if (dupRows && dupRows.length > 0) {
        return {
          success: true,
          alreadyExists: true,
          reconciliationId: dupRows[0].id,
          idempotencyKey: dupRows[0].idempotency_key,
          status: dupRows[0].status,
          job: dupRows[0]
        };
      }
    }
    throw insertErr;
  }
}

/**
 * Persists a durable order and payment intent to MySQL before issuing external capture.
 * Validates inventory and commits atomically with status 'pending_payment' and 'pending'.
 * Throws on database failure so external capture is NEVER initiated.
 */
export async function createDurablePaymentIntent(pool, {
  paypalOrderId,
  cart,
  customerName = 'Vault Collector',
  customerEmail = 'collector@pokevault.com',
  shippingAddress = '123 Pallet Town Way, Kanto',
  promoCode = '',
  insuranceIncluded = true,
  idempotencyKey = null,
  orderId = null,
  accessTokenHash = null,
  ownerId = null,
  leaseDurationSeconds = RECONCILIATION_DEFAULTS.LEASE_DURATION_SECONDS
}) {
  if (!pool) {
    throw new Error('Database service unavailable: cannot persist durable payment intent');
  }

  if (!paypalOrderId || typeof paypalOrderId !== 'string') {
    throw new Error('Valid paypalOrderId is required for durable payment intent');
  }

  const finalKey = idempotencyKey || generateIdempotencyKey(paypalOrderId);

  // 1. Check idempotency: has an order already been completed for this PayPal order ID?
  const [existingOrders] = await pool.query(
    'SELECT id, order_status, payment_status, paypal_capture_id, total_amount FROM orders WHERE paypal_order_id = ? LIMIT 1',
    [paypalOrderId]
  );

  if (existingOrders && existingOrders.length > 0) {
    const existing = existingOrders[0];
    if (existing.payment_status === PAYMENT_STATES.COMPLETED) {
      return {
        success: true,
        alreadyCompleted: true,
        orderId: existing.id,
        captureId: existing.paypal_capture_id,
        idempotencyKey: finalKey
      };
    }

    // Existing pending order found: inspect whether an active capture lease is held by another worker
    const [existingRecons] = await pool.query(
      'SELECT id, status, locked_by, lease_expires_at FROM payment_reconciliations WHERE paypal_order_id = ? OR order_id = ? LIMIT 1',
      [paypalOrderId, existing.id]
    );

    if (existingRecons && existingRecons.length > 0) {
      const rec = existingRecons[0];
      const now = new Date();
      const leaseSec = Number(leaseDurationSeconds) || RECONCILIATION_DEFAULTS.LEASE_DURATION_SECONDS;
      const workerOwner = ownerId || `sync-capture-${existing.id}`;
      const isLockedByOther = rec.status === RECONCILIATION_STATES.PROCESSING &&
        rec.lease_expires_at && new Date(rec.lease_expires_at) > now &&
        rec.locked_by && rec.locked_by !== workerOwner;

      if (isLockedByOther) {
        return {
          success: false,
          activeCaptureInProgress: true,
          orderId: existing.id,
          idempotencyKey: finalKey,
          error: 'A payment capture operation is currently in progress for this order'
        };
      }

      // Re-acquire/renew lease for this caller if previous lease expired or state is recoverable
      await pool.query(`
        UPDATE payment_reconciliations
        SET status = ?, locked_by = ?, locked_at = NOW(),
            lease_expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND),
            next_retry_at = DATE_ADD(NOW(), INTERVAL ? SECOND),
            updated_at = NOW()
        WHERE id = ?
      `, [RECONCILIATION_STATES.PROCESSING, workerOwner, leaseSec, leaseSec, rec.id]);
    }

    return {
      success: true,
      alreadyExists: true,
      orderId: existing.id,
      idempotencyKey: finalKey
    };
  }

  // 2. Transactional pending order creation with inventory reservation
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const targetOrderId = orderId || `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const trackingNumber = `TRK-${Math.floor(100000 + Math.random() * 900000)}`;

    // Verify and reserve inventory atomically
    for (const it of (cart.lineItems || [])) {
      if (!it.cardId) continue;
      const [invRows] = await connection.query(
        'SELECT stock_quantity FROM inventory WHERE card_id = ? FOR UPDATE',
        [it.cardId]
      );

      let currentStock = null;
      if (invRows && invRows.length > 0) {
        currentStock = Number(invRows[0].stock_quantity);
      } else {
        const [cardRows] = await connection.query(
          'SELECT in_stock FROM cards WHERE id = ? FOR UPDATE',
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

      if (currentStock === null || currentStock < (it.quantity || 1)) {
        throw new Error(`Insufficient inventory for "${it.cardName || it.cardId}". Requested: ${it.quantity || 1}, available: ${currentStock ?? 0}.`);
      }

      // Deduct inventory
      await connection.query(
        'UPDATE inventory SET stock_quantity = stock_quantity - ? WHERE card_id = ?',
        [it.quantity || 1, it.cardId]
      );
      await connection.query(
        'UPDATE cards SET in_stock = GREATEST(0, in_stock - ?) WHERE id = ?',
        [it.quantity || 1, it.cardId]
      );
    }

    // Insert pending order record
    await connection.query(`
      INSERT INTO orders (
        id, customer_name, customer_email, shipping_address, subtotal,
        discount_amount, promo_code, insurance_included, insurance_cost,
        total_amount, order_status, payment_method, payment_status,
        paypal_order_id, paypal_capture_id, tracking_number, access_token_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `, [
      targetOrderId,
      typeof customerName === 'string' ? customerName.trim() : 'Vault Collector',
      typeof customerEmail === 'string' ? customerEmail.trim() : 'collector@pokevault.com',
      typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : String(shippingAddress).trim(),
      cart.subtotal,
      cart.discountAmount,
      cart.appliedPromo || promoCode,
      Boolean(insuranceIncluded),
      cart.insuranceCost,
      cart.totalAmount,
      ORDER_STATES.PENDING_PAYMENT,
      'PayPal',
      PAYMENT_STATES.PENDING,
      paypalOrderId,
      trackingNumber,
      accessTokenHash || null
    ]);

    // Insert order items
    for (const it of (cart.lineItems || [])) {
      if (!it.cardId) continue;
      await connection.query(`
        INSERT INTO order_items (order_id, card_id, card_name, unit_price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        targetOrderId,
        it.cardId,
        it.cardName || 'Collectible Item',
        it.unitPrice || 0,
        it.quantity || 1,
        it.subtotal || 0
      ]);
    }

    // Insert payment reconciliation job (Minimized PII: linked via order_id)
    // Enforce explicit capture ownership to prevent worker race prior to external capture
    const leaseSec = Number(leaseDurationSeconds) || RECONCILIATION_DEFAULTS.LEASE_DURATION_SECONDS;
    const workerOwner = ownerId || `sync-capture-${targetOrderId}`;

    await connection.query(`
      INSERT INTO payment_reconciliations (
        idempotency_key, order_id, paypal_order_id, amount, currency,
        status, attempt_count, max_attempts, next_retry_at,
        locked_by, locked_at, lease_expires_at, resolved
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, DATE_ADD(NOW(), INTERVAL ? SECOND), ?, NOW(), DATE_ADD(NOW(), INTERVAL ? SECOND), FALSE)
      ON DUPLICATE KEY UPDATE order_id = VALUES(order_id)
    `, [
      finalKey,
      targetOrderId,
      paypalOrderId,
      cart.totalAmount,
      'USD',
      RECONCILIATION_STATES.PROCESSING,
      RECONCILIATION_DEFAULTS.MAX_ATTEMPTS,
      leaseSec,
      workerOwner,
      leaseSec
    ]);

    await connection.commit();
    connection.release();

    return {
      success: true,
      orderId: targetOrderId,
      idempotencyKey: finalKey,
      isNew: true
    };
  } catch (err) {
    await connection.rollback();
    connection.release();
    throw err;
  }
}

/**
 * Updates order and payment reconciliation state to completed after successful provider capture.
 */
export async function finalizePaymentIntent(pool, {
  orderId,
  idempotencyKey = null,
  paypalOrderId = null,
  captureId
}) {
  if (!pool) throw new Error('Database service unavailable');

  // Update order
  if (orderId) {
    await pool.query(`
      UPDATE orders
      SET payment_status = ?, order_status = ?, paypal_capture_id = ?
      WHERE id = ?
    `, [PAYMENT_STATES.COMPLETED, ORDER_STATES.RECEIVED, captureId, orderId]);
  }

  // Update reconciliation job
  await pool.query(`
    UPDATE payment_reconciliations
    SET status = ?, resolved = TRUE, resolved_at = NOW(),
        paypal_capture_id = ?, locked_by = NULL, locked_at = NULL,
        lease_expires_at = NULL, last_error = NULL
    WHERE (idempotency_key = ? AND idempotency_key IS NOT NULL)
       OR (order_id = ? AND order_id IS NOT NULL)
       OR (paypal_order_id = ? AND paypal_order_id IS NOT NULL)
  `, [
    RECONCILIATION_STATES.COMPLETED,
    captureId,
    idempotencyKey || '',
    orderId || '',
    paypalOrderId || ''
  ]);

  return { success: true };
}

/**
 * Transactionally restores inventory and marks order and reconciliation job failed
 * when provider capture terminally rejects or buyer cancels.
 */
export async function rollbackFailedPaymentIntent(pool, {
  orderId,
  idempotencyKey = null,
  paypalOrderId = null,
  error = 'Payment capture failed'
}) {
  if (!pool || !orderId) return;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Query order items to restore stock
    const [items] = await connection.query(
      'SELECT card_id, quantity FROM order_items WHERE order_id = ?',
      [orderId]
    );

    if (items && items.length > 0) {
      for (const it of items) {
        if (!it.card_id) continue;
        const qty = Number(it.quantity) || 1;
        await connection.query(
          'UPDATE inventory SET stock_quantity = stock_quantity + ? WHERE card_id = ?',
          [qty, it.card_id]
        );
        await connection.query(
          'UPDATE cards SET in_stock = in_stock + ? WHERE id = ?',
          [qty, it.card_id]
        );
      }
    }

    // Mark order failed
    await connection.query(`
      UPDATE orders
      SET payment_status = ?, order_status = ?
      WHERE id = ?
    `, [PAYMENT_STATES.FAILED, ORDER_STATES.FAILED, orderId]);

    // Mark reconciliation failed
    await connection.query(`
      UPDATE payment_reconciliations
      SET status = ?, resolved = TRUE, resolved_at = NOW(),
          last_error = ?, error_message = ?, locked_by = NULL,
          locked_at = NULL, lease_expires_at = NULL
      WHERE (idempotency_key = ? AND idempotency_key IS NOT NULL)
         OR (order_id = ? AND order_id IS NOT NULL)
         OR (paypal_order_id = ? AND paypal_order_id IS NOT NULL)
    `, [
      RECONCILIATION_STATES.FAILED,
      error,
      error,
      idempotencyKey || '',
      orderId,
      paypalOrderId || ''
    ]);

    await connection.commit();
    connection.release();
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.warn(`[order-service] Failed to rollback inventory for failed order ${orderId}:`, err.message);
  }
}

/**
 * Marks payment reconciliation job as AMBIGUOUS following capture timeout or network error.
 */
export async function markIntentAmbiguous(pool, {
  orderId = null,
  idempotencyKey = null,
  paypalOrderId = null,
  error = 'Provider timeout'
}) {
  if (!pool) return;
  try {
    await pool.query(`
      UPDATE payment_reconciliations
      SET status = ?, last_error = ?, locked_by = NULL, lease_expires_at = NULL
      WHERE (idempotency_key = ? AND idempotency_key IS NOT NULL)
         OR (order_id = ? AND order_id IS NOT NULL)
         OR (paypal_order_id = ? AND paypal_order_id IS NOT NULL)
    `, [
      RECONCILIATION_STATES.AMBIGUOUS,
      error,
      idempotencyKey || '',
      orderId || '',
      paypalOrderId || ''
    ]);
  } catch (e) {
    console.warn('[order-service] Notice updating ambiguous reconciliation state:', e.message);
  }
}

// ============================================================================
// LEASE-BASED WORKER CLAIMING & CONCURRENCY PROTECTION
// ============================================================================

/**
 * Claims a pending or expired reconciliation job for exclusive execution by a worker.
 * Uses conditional MySQL update with lease expiration to prevent concurrent races
 * and allow safe reclamation if a previous worker crashed while status was 'PROCESSING'.
 */
export async function claimReconciliationJob(pool, jobId, options = {}) {
  if (!pool || !jobId) return false;

  const workerId = options.workerId || `worker-${process.pid}-${Math.random().toString(36).substring(2, 7)}`;
  const leaseSeconds = Number(options.leaseDurationSeconds) || RECONCILIATION_DEFAULTS.LEASE_DURATION_SECONDS;

  const [res] = await pool.query(`
    UPDATE payment_reconciliations
    SET status = ?,
        locked_by = ?,
        locked_at = NOW(),
        lease_expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND),
        updated_at = NOW()
    WHERE id = ?
      AND (
        status IN (?, ?)
        OR (status = ? AND (lease_expires_at IS NULL OR lease_expires_at <= NOW()))
      )
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
  `, [
    RECONCILIATION_STATES.PROCESSING,
    workerId,
    leaseSeconds,
    jobId,
    RECONCILIATION_STATES.PENDING,
    RECONCILIATION_STATES.AMBIGUOUS,
    RECONCILIATION_STATES.PROCESSING
  ]);

  return Boolean(res && res.affectedRows === 1);
}

// ============================================================================
// RECONCILIATION EXECUTOR & PROVIDER VALIDATION
// ============================================================================

/**
 * Reconciles an individual payment record against the PayPal provider and local database.
 * Handles:
 *  - Provider verification before repeating actions
 *  - Idempotent order finalization (no duplicate inventory deductions or orders)
 *  - Transient failures (exponential backoff)
 *  - Non-retryable terminal failures & inventory rollbacks
 *  - Financial mismatch flagging for human review
 */
export async function reconcilePaymentRecord(pool, job, options = {}) {
  if (!pool || !job) {
    return { success: false, error: 'Database pool or job record missing' };
  }

  const {
    fetchOrderDetailsFn = fetchPayPalOrderDetails,
    captureOrderFn = capturePayPalServerOrder,
    verifyCaptureFn = verifyPayPalCapture,
    paypalOptions = {}
  } = options;

  // 1. If already completed, return immediately
  if (job.status === RECONCILIATION_STATES.COMPLETED) {
    return {
      success: true,
      outcome: 'ALREADY_COMPLETED',
      reconciliationId: job.id,
      orderId: job.order_id
    };
  }

  // 2. Check if an order already exists and is completed in the orders table
  const [existingOrders] = await pool.query(
    'SELECT id, order_status, payment_status, paypal_capture_id FROM orders WHERE id = ? OR paypal_order_id = ? OR (paypal_capture_id IS NOT NULL AND paypal_capture_id = ?) LIMIT 1',
    [job.order_id || '', job.paypal_order_id, job.paypal_capture_id || job.paypal_order_id]
  );

  if (existingOrders && existingOrders.length > 0) {
    const ord = existingOrders[0];
    if (ord.payment_status === PAYMENT_STATES.COMPLETED) {
      await pool.query(`
        UPDATE payment_reconciliations
        SET status = ?, resolved = TRUE, resolved_at = NOW(), order_id = ?,
            paypal_capture_id = COALESCE(paypal_capture_id, ?),
            locked_by = NULL, locked_at = NULL, lease_expires_at = NULL
        WHERE id = ?
      `, [RECONCILIATION_STATES.COMPLETED, ord.id, ord.paypal_capture_id, job.id]);

      return {
        success: true,
        outcome: 'ALREADY_COMPLETED',
        reconciliationId: job.id,
        orderId: ord.id,
        captureId: ord.paypal_capture_id
      };
    }
  }

  // 3. Query PayPal gateway to verify the real payment state BEFORE repeating actions
  let providerDetails;
  try {
    providerDetails = await fetchOrderDetailsFn({
      paypalOrderId: job.paypal_order_id,
      options: paypalOptions
    });
  } catch (fetchErr) {
    providerDetails = {
      success: false,
      status: 500,
      error: fetchErr.message,
      isTransient: true
    };
  }

  // 4. Handle provider query failures
  if (!providerDetails.success) {
    const errorMsg = providerDetails.error || 'Unknown provider error';
    const isTransient = options.isTransientError !== undefined
      ? Boolean(options.isTransientError)
      : (providerDetails.status >= 500 || /timeout|network|econnrefused|econnreset/i.test(errorMsg));

    const nextAttempt = (Number(job.attempt_count) || 0) + 1;
    const maxAttempts = Number(job.max_attempts) || RECONCILIATION_DEFAULTS.MAX_ATTEMPTS;

    if (isTransient && nextAttempt < maxAttempts) {
      const backoffSec = calculateBackoffSeconds(nextAttempt);
      const nextRetryDate = new Date(Date.now() + backoffSec * 1000);

      await pool.query(`
        UPDATE payment_reconciliations
        SET status = ?, attempt_count = ?, next_retry_at = ?, last_error = ?, error_message = ?,
            locked_by = NULL, lease_expires_at = NULL
        WHERE id = ?
      `, [
        RECONCILIATION_STATES.PENDING,
        nextAttempt,
        nextRetryDate,
        `[Transient Error: attempt ${nextAttempt}/${maxAttempts}] ${errorMsg}`,
        errorMsg,
        job.id
      ]);

      return {
        success: false,
        retryable: true,
        status: RECONCILIATION_STATES.PENDING,
        attemptCount: nextAttempt,
        nextRetryAt: nextRetryDate,
        error: errorMsg
      };
    }

    if (isTransient && nextAttempt >= maxAttempts) {
      // Exceeded max attempts on transient failures -> requires human review
      await pool.query(`
        UPDATE payment_reconciliations
        SET status = ?, attempt_count = ?, last_error = ?, error_message = ?,
            locked_by = NULL, lease_expires_at = NULL
        WHERE id = ?
      `, [
        RECONCILIATION_STATES.REQUIRES_HUMAN_REVIEW,
        nextAttempt,
        `[Max Attempts Reached (${nextAttempt})] ${errorMsg}`,
        errorMsg,
        job.id
      ]);

      return {
        success: false,
        retryable: false,
        status: RECONCILIATION_STATES.REQUIRES_HUMAN_REVIEW,
        attemptCount: nextAttempt,
        error: `Reconciliation exceeded max retry attempts: ${errorMsg}`
      };
    }

    // Non-retryable terminal failure (e.g. 404 ORDER_NOT_FOUND, 422 rejected, unapproved)
    // If order was already persisted, rollback inventory
    if (job.order_id) {
      await rollbackFailedPaymentIntent(pool, {
        orderId: job.order_id,
        idempotencyKey: job.idempotency_key,
        paypalOrderId: job.paypal_order_id,
        error: errorMsg
      });
    } else {
      await pool.query(`
        UPDATE payment_reconciliations
        SET status = ?, resolved = TRUE, resolved_at = NOW(), attempt_count = ?,
            last_error = ?, error_message = ?, locked_by = NULL, lease_expires_at = NULL
        WHERE id = ?
      `, [
        RECONCILIATION_STATES.FAILED,
        nextAttempt,
        `[Terminal Failure] ${errorMsg}`,
        errorMsg,
        job.id
      ]);
    }

    return {
      success: false,
      retryable: false,
      status: RECONCILIATION_STATES.FAILED,
      error: errorMsg
    };
  }

  // 5. Verify provider capture details
  const currency = typeof job.currency === 'string' ? job.currency : 'USD';
  let verification = verifyCaptureFn({
    captureResponse: providerDetails.data,
    expectedTotalAmount: job.amount,
    expectedCurrency: currency
  });

  if (!verification.verified) {
    const paypalStatus = (providerDetails.data?.status || '').toUpperCase();

    // If order was approved by payer on frontend, but server crashed before capture completed:
    // Execute capture safely using provider's supported idempotency mechanism
    if (paypalStatus === 'APPROVED') {
      let capResult;
      try {
        capResult = await captureOrderFn({
          paypalOrderId: job.paypal_order_id,
          requestId: job.idempotency_key,
          options: paypalOptions
        });
      } catch (capErr) {
        capResult = { success: false, error: capErr.message };
      }

      if (capResult && capResult.success && capResult.data) {
        const postCapVerification = verifyCaptureFn({
          captureResponse: capResult.data,
          expectedTotalAmount: job.amount,
          expectedCurrency: currency
        });
        if (postCapVerification.verified) {
          verification = postCapVerification;
          providerDetails.data = capResult.data;
        } else {
          await pool.query(`
            UPDATE payment_reconciliations
            SET status = ?, last_error = ?, locked_by = NULL, lease_expires_at = NULL
            WHERE id = ?
          `, [RECONCILIATION_STATES.REQUIRES_HUMAN_REVIEW, postCapVerification.reason, job.id]);

          return {
            success: false,
            retryable: false,
            status: RECONCILIATION_STATES.REQUIRES_HUMAN_REVIEW,
            error: postCapVerification.reason
          };
        }
      } else {
        const capErr = capResult?.error || 'Failed to capture approved PayPal order during recovery';
        const isTransient = /timeout|network|econnrefused|econnreset/i.test(capErr);
        if (isTransient) {
          const nextAttempt = (Number(job.attempt_count) || 0) + 1;
          const backoffSec = calculateBackoffSeconds(nextAttempt);
          const nextRetry = new Date(Date.now() + backoffSec * 1000);
          await pool.query(`
            UPDATE payment_reconciliations
            SET status = ?, attempt_count = ?, next_retry_at = ?, last_error = ?,
                locked_by = NULL, lease_expires_at = NULL
            WHERE id = ?
          `, [RECONCILIATION_STATES.PENDING, nextAttempt, nextRetry, capErr, job.id]);
          return { success: false, retryable: true, error: capErr };
        }

        if (job.order_id) {
          await rollbackFailedPaymentIntent(pool, {
            orderId: job.order_id,
            idempotencyKey: job.idempotency_key,
            paypalOrderId: job.paypal_order_id,
            error: capErr
          });
        }
        return { success: false, retryable: false, status: RECONCILIATION_STATES.FAILED, error: capErr };
      }
    }
  }

  if (!verification.verified) {
    const paypalStatus = (providerDetails.data?.status || '').toUpperCase();
    if (['VOIDED', 'CANCELLED', 'EXPIRED'].includes(paypalStatus)) {
      if (job.order_id) {
        await rollbackFailedPaymentIntent(pool, {
          orderId: job.order_id,
          idempotencyKey: job.idempotency_key,
          paypalOrderId: job.paypal_order_id,
          error: `PayPal order was ${paypalStatus}`
        });
      } else {
        await pool.query(`
          UPDATE payment_reconciliations
          SET status = ?, resolved = TRUE, resolved_at = NOW(), last_error = ?,
              locked_by = NULL, lease_expires_at = NULL
          WHERE id = ?
        `, [RECONCILIATION_STATES.FAILED, `PayPal order was ${paypalStatus}`, job.id]);
      }

      return {
        success: false,
        retryable: false,
        status: RECONCILIATION_STATES.FAILED,
        error: `PayPal order ${paypalStatus}`
      };
    }

    // Financial mismatch (amount or currency discrepancy) -> Require human review
    await pool.query(`
      UPDATE payment_reconciliations
      SET status = ?, last_error = ?, locked_by = NULL, lease_expires_at = NULL
      WHERE id = ?
    `, [RECONCILIATION_STATES.REQUIRES_HUMAN_REVIEW, verification.reason, job.id]);

    return {
      success: false,
      retryable: false,
      status: RECONCILIATION_STATES.REQUIRES_HUMAN_REVIEW,
      error: verification.reason
    };
  }

  // 6. Payment verified: Execute transactional order finalization
  const verifiedCaptureId = verification.captureId;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let orderId = job.order_id;

    // Check if order record already exists
    const [existingOrderCheck] = await connection.query(
      'SELECT id, customer_name, customer_email, shipping_address FROM orders WHERE id = ? OR paypal_order_id = ? FOR UPDATE',
      [orderId || '', job.paypal_order_id]
    );

    if (existingOrderCheck && existingOrderCheck.length > 0) {
      // Order was already persisted when payment intent was durably committed!
      // DO NOT create duplicate order and DO NOT decrement inventory a second time!
      orderId = existingOrderCheck[0].id;
      await connection.query(`
        UPDATE orders
        SET payment_status = ?, order_status = ?, paypal_capture_id = ?
        WHERE id = ?
      `, [PAYMENT_STATES.COMPLETED, ORDER_STATES.RECEIVED, verifiedCaptureId, orderId]);
    } else {
      // Legacy or orphan record without pre-committed order: create order and decrement stock once
      if (!orderId) {
        orderId = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      }

      let items = [];
      try {
        if (typeof job.items_payload === 'string') {
          items = JSON.parse(job.items_payload);
        } else if (Array.isArray(job.items_payload)) {
          items = job.items_payload;
        }
      } catch (e) {
        items = [];
      }

      if (items.length > 0) {
        for (const it of items) {
          if (!it.cardId) continue;
          const [invRows] = await connection.query(
            'SELECT stock_quantity FROM inventory WHERE card_id = ? FOR UPDATE',
            [it.cardId]
          );
          if (invRows && invRows.length > 0) {
            const qty = Number(it.quantity) || 1;
            await connection.query(
              'UPDATE inventory SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE card_id = ?',
              [qty, it.cardId]
            );
            await connection.query(
              'UPDATE cards SET in_stock = GREATEST(0, in_stock - ?) WHERE id = ?',
              [qty, it.cardId]
            );
          }
        }
      }

      const trackingNumber = `TRK-${Math.floor(100000 + Math.random() * 900000)}`;
      await connection.query(`
        INSERT INTO orders (
          id, customer_name, customer_email, shipping_address, subtotal,
          discount_amount, promo_code, insurance_included, insurance_cost,
          total_amount, order_status, payment_method, payment_status,
          paypal_order_id, paypal_capture_id, tracking_number
        ) VALUES (?, ?, ?, ?, ?, 0.00, NULL, TRUE, 0.00, ?, ?, 'PayPal', ?, ?, ?, ?)
      `, [
        orderId,
        job.customer_name || 'Vault Collector',
        job.customer_email || 'collector@pokevault.com',
        job.shipping_address || '123 Pallet Town Way, Kanto',
        job.amount,
        job.amount,
        ORDER_STATES.RECEIVED,
        PAYMENT_STATES.COMPLETED,
        job.paypal_order_id,
        verifiedCaptureId,
        trackingNumber
      ]);

      for (const it of items) {
        if (!it.cardId) continue;
        await connection.query(`
          INSERT INTO order_items (order_id, card_id, card_name, unit_price, quantity, subtotal)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          orderId,
          it.cardId,
          it.cardName || 'Collectible Item',
          it.unitPrice || job.amount,
          it.quantity || 1,
          it.subtotal || job.amount
        ]);
      }
    }

    // Mark reconciliation COMPLETED and release lease
    await connection.query(`
      UPDATE payment_reconciliations
      SET status = ?, resolved = TRUE, resolved_at = NOW(),
          order_id = ?, paypal_capture_id = ?, last_error = NULL,
          locked_by = NULL, locked_at = NULL, lease_expires_at = NULL
      WHERE id = ?
    `, [
      RECONCILIATION_STATES.COMPLETED,
      orderId,
      verifiedCaptureId,
      job.id
    ]);

    await connection.commit();
    connection.release();

    return {
      success: true,
      outcome: 'RECONCILED_AND_ORDER_CREATED',
      reconciliationId: job.id,
      orderId,
      captureId: verifiedCaptureId
    };
  } catch (transErr) {
    await connection.rollback();
    connection.release();

    await pool.query(`
      UPDATE payment_reconciliations
      SET status = ?, last_error = ?, locked_by = NULL, lease_expires_at = NULL
      WHERE id = ?
    `, [RECONCILIATION_STATES.PENDING, `Transaction failed: ${transErr.message}`, job.id]);

    throw transErr;
  }
}

// ============================================================================
// WORKER & BATCH PROCESSING
// ============================================================================

/**
 * Fetches pending reconciliation jobs that are due for processing.
 * Discovers PENDING, AMBIGUOUS, and expired PROCESSING jobs whose lease timed out.
 */
export async function fetchPendingReconciliations(pool, limit = RECONCILIATION_DEFAULTS.BATCH_LIMIT) {
  if (!pool) return [];

  const [rows] = await pool.query(`
    SELECT * FROM payment_reconciliations
    WHERE (
      status IN (?, ?)
      OR (status = ? AND (lease_expires_at IS NULL OR lease_expires_at <= NOW()))
    )
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    ORDER BY created_at ASC
    LIMIT ?
  `, [
    RECONCILIATION_STATES.PENDING,
    RECONCILIATION_STATES.AMBIGUOUS,
    RECONCILIATION_STATES.PROCESSING,
    Math.max(1, Number(limit) || 10)
  ]);

  return rows || [];
}

/**
 * Processes a batch of pending reconciliation jobs.
 */
export async function processPendingReconciliations(pool, options = {}) {
  if (!pool) return { total: 0, processed: 0, succeeded: 0, failed: 0, retried: 0 };

  const jobs = await fetchPendingReconciliations(pool, options.limit);
  let succeeded = 0;
  let failed = 0;
  let retried = 0;

  for (const job of jobs) {
    const claimed = await claimReconciliationJob(pool, job.id, options);
    if (!claimed) {
      continue; // Claimed by another concurrent worker or lease active
    }

    try {
      const result = await reconcilePaymentRecord(pool, job, options);
      if (result.success) {
        succeeded++;
      } else if (result.retryable) {
        retried++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`[order-service] Reconciliation job ${job.id} unexpected error:`, err.message);
      failed++;
    }
  }

  return {
    total: jobs.length,
    processed: succeeded + failed + retried,
    succeeded,
    failed,
    retried
  };
}

/**
 * Safe recovery on startup: discovers and resumes any pending or expired reconciliation jobs left from a previous run.
 */
export async function recoverPendingReconciliationsOnStartup(pool, options = {}) {
  if (!pool) return;

  try {
    const [countRows] = await pool.query(`
      SELECT COUNT(*) as count FROM payment_reconciliations
      WHERE status IN (?, ?)
         OR (status = ? AND (lease_expires_at IS NULL OR lease_expires_at <= NOW()))
    `, [
      RECONCILIATION_STATES.PENDING,
      RECONCILIATION_STATES.AMBIGUOUS,
      RECONCILIATION_STATES.PROCESSING
    ]);

    const pendingCount = countRows?.[0]?.count || 0;
    if (pendingCount > 0) {
      console.log(`[order-service] Startup Recovery: Found ${pendingCount} pending/expired payment reconciliation job(s). Resuming...`);
      const summary = await processPendingReconciliations(pool, options);
      console.log(`[order-service] Startup Recovery Complete: ${summary.succeeded} resolved, ${summary.retried} retried, ${summary.failed} failed.`);
    }
  } catch (err) {
    console.warn('[order-service] Notice during startup reconciliation check:', err.message);
  }
}
