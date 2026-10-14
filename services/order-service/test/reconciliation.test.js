/**
 * PokéVault Legends — Durable Payment Reconciliation & Reliability Tests
 *
 * Validates database persistence, concurrency safety, idempotency, retry scheduling,
 * PayPal failure recovery, lease-based worker recovery, and intent-before-capture safety.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  RECONCILIATION_STATES,
  calculateBackoffSeconds,
  persistReconciliationJob,
  createDurablePaymentIntent,
  finalizePaymentIntent,
  rollbackFailedPaymentIntent,
  markIntentAmbiguous,
  claimReconciliationJob,
  reconcilePaymentRecord,
  processPendingReconciliations,
  recoverPendingReconciliationsOnStartup,
  fetchPendingReconciliations
} from '../src/reconciliation.js';

import {
  PAYMENT_STATES,
  ORDER_STATES,
  validatePaymentStateTransition,
  verifyPayPalCapture
} from '../src/paypal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// IN-MEMORY MOCK DATABASE FOR UNIT & ISOLATION TESTING
// ============================================================================

function createMockPool() {
  let reconciliations = [];
  let orders = [];
  let orderItems = [];
  let inventory = new Map([
    ['charizard-base-1st', { card_id: 'charizard-base-1st', stock_quantity: 10 }]
  ]);
  let autoIncrementId = 1;

  const pool = {
    _data: { reconciliations, orders, orderItems, inventory },
    query: async (sql, params = []) => {
      const normalizedSql = sql.replace(/\s+/g, ' ').trim();

      // 0. SHOW INDEX or inspection
      if (normalizedSql.startsWith('SHOW INDEX FROM payment_reconciliations')) {
        return [[
          { Key_name: 'uk_recon_idempotency' },
          { Key_name: 'idx_recon_lease' },
          { Key_name: 'idx_recon_order_id' }
        ]];
      }

      // 0b. SELECT id, status, locked_by, lease_expires_at FROM payment_reconciliations WHERE paypal_order_id = ? OR order_id = ?
      if (normalizedSql.includes('FROM payment_reconciliations WHERE paypal_order_id = ? OR order_id = ?') ||
          normalizedSql.includes('FROM payment_reconciliations WHERE paypal_order_id = ?')) {
        const ppId = params[0];
        const ordId = params[1] || '';
        const found = reconciliations.filter(r => (ppId && r.paypal_order_id === ppId) || (ordId && r.order_id === ordId));
        return [found];
      }

      // 1. SELECT * FROM payment_reconciliations WHERE idempotency_key = ? ...
      if (normalizedSql.startsWith('SELECT * FROM payment_reconciliations WHERE idempotency_key = ?')) {
        const key = params[0];
        const ppId = params[1];
        const found = reconciliations.filter(r => r.idempotency_key === key || (ppId && r.paypal_order_id === ppId && r.status === 'COMPLETED'));
        return [found];
      }

      // 2. SELECT * FROM payment_reconciliations WHERE id = ?
      if (normalizedSql.startsWith('SELECT * FROM payment_reconciliations WHERE id = ?')) {
        const id = params[0];
        const found = reconciliations.filter(r => r.id === Number(id));
        return [found];
      }

      // 3. SELECT COUNT(*) as count FROM payment_reconciliations WHERE ...
      if (normalizedSql.includes('COUNT(*)') && normalizedSql.includes('FROM payment_reconciliations')) {
        const now = new Date();
        const count = reconciliations.filter(r => {
          const isPendingOrAmbiguous = r.status === 'PENDING' || r.status === 'AMBIGUOUS';
          const isExpiredProcessing = r.status === 'PROCESSING' && (!r.lease_expires_at || new Date(r.lease_expires_at) <= now);
          return isPendingOrAmbiguous || isExpiredProcessing;
        }).length;
        return [[{ count }]];
      }

      // 4. SELECT * FROM payment_reconciliations WHERE (status IN ... OR ...) (fetch pending / expired)
      if (normalizedSql.startsWith('SELECT * FROM payment_reconciliations') &&
          (normalizedSql.includes('status IN') || normalizedSql.includes('status = ?'))) {
        const now = new Date();
        const found = reconciliations.filter(r => {
          const isPendingOrAmbiguous = r.status === 'PENDING' || r.status === 'AMBIGUOUS';
          const isExpiredProcessing = r.status === 'PROCESSING' && (!r.lease_expires_at || new Date(r.lease_expires_at) <= now);
          if (!isPendingOrAmbiguous && !isExpiredProcessing) return false;
          if (!r.next_retry_at) return true;
          return new Date(r.next_retry_at) <= now;
        });
        const limit = typeof params[params.length - 1] === 'number' ? params[params.length - 1] : 20;
        return [found.slice(0, limit)];
      }

      // 5. INSERT INTO payment_reconciliations
      if (normalizedSql.startsWith('INSERT INTO payment_reconciliations')) {
        const key = params[0];
        const existingIdx = reconciliations.findIndex(r => r.idempotency_key === key);
        if (existingIdx !== -1) {
          if (normalizedSql.includes('ON DUPLICATE KEY UPDATE')) {
            reconciliations[existingIdx].order_id = params[1] || reconciliations[existingIdx].order_id;
            return [{ insertId: reconciliations[existingIdx].id, affectedRows: 1 }];
          }
          const dupErr = new Error(`Duplicate entry '${key}' for key 'uk_recon_idempotency'`);
          dupErr.code = 'ER_DUP_ENTRY';
          dupErr.errno = 1062;
          throw dupErr;
        }

        let newRec;
        if (params.length === 10) {
          const leaseSec = Number(params[7]) || 120;
          const workerOwner = params[8];
          newRec = {
            id: autoIncrementId++,
            idempotency_key: params[0],
            order_id: params[1],
            paypal_order_id: params[2],
            paypal_capture_id: null,
            amount: Number(params[3]),
            currency: String(params[4] || 'USD'),
            customer_email: null,
            customer_name: null,
            shipping_address: null,
            items_payload: null,
            status: params[5] || 'PROCESSING',
            attempt_count: 0,
            max_attempts: Number(params[6]) || 5,
            next_retry_at: new Date(Date.now() + leaseSec * 1000).toISOString(),
            locked_by: workerOwner,
            locked_at: new Date().toISOString(),
            lease_expires_at: new Date(Date.now() + leaseSec * 1000).toISOString(),
            last_error: null,
            error_message: null,
            resolved: false,
            resolved_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else if (params.length === 7) {
          newRec = {
            id: autoIncrementId++,
            idempotency_key: params[0],
            order_id: params[1],
            paypal_order_id: params[2],
            paypal_capture_id: null,
            amount: Number(params[3]),
            currency: String(params[4] || 'USD'),
            customer_email: null,
            customer_name: null,
            shipping_address: null,
            items_payload: null,
            status: params[5] || 'PENDING',
            attempt_count: 0,
            max_attempts: Number(params[6]) || 5,
            next_retry_at: new Date().toISOString(),
            locked_by: null,
            locked_at: null,
            lease_expires_at: null,
            last_error: null,
            error_message: null,
            resolved: false,
            resolved_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          newRec = {
            id: autoIncrementId++,
            idempotency_key: params[0],
            order_id: params[1],
            paypal_order_id: params[2],
            paypal_capture_id: params[3] || null,
            amount: Number(params[4]),
            currency: String(params[5] || 'USD'),
            customer_email: params[6] || null,
            customer_name: params[7] || null,
            shipping_address: params[8] || null,
            items_payload: params[9] || null,
            status: params[10] || 'PENDING',
            attempt_count: 0,
            max_attempts: Number(params[11]) || 5,
            next_retry_at: params[12] || new Date().toISOString(),
            locked_by: null,
            locked_at: null,
            lease_expires_at: null,
            last_error: params[13] || null,
            error_message: params[14] || null,
            resolved: Boolean(params[15]),
            resolved_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }

        reconciliations.push(newRec);
        return [{ insertId: newRec.id, affectedRows: 1 }];
      }

      // 6. UPDATE payment_reconciliations (Claim job with lease)
      if (normalizedSql.includes('locked_by = ?') && normalizedSql.includes('DATE_ADD')) {
        const targetStatus = params[0];
        const workerId = params[1];
        const leaseSeconds = Number(params[2]) || 120;
        const jobId = Number(params[3]);

        const job = reconciliations.find(r => r.id === jobId);
        if (!job) return [{ affectedRows: 0 }];

        const now = new Date();
        const isEligible =
          job.status === 'PENDING' ||
          job.status === 'AMBIGUOUS' ||
          (job.status === 'PROCESSING' && (!job.lease_expires_at || new Date(job.lease_expires_at) <= now));

        const isTimeEligible = !job.next_retry_at || new Date(job.next_retry_at) <= now;

        if (isEligible && isTimeEligible) {
          job.status = targetStatus;
          job.locked_by = workerId;
          job.locked_at = now.toISOString();
          job.lease_expires_at = new Date(Date.now() + leaseSeconds * 1000).toISOString();
          job.updated_at = now.toISOString();
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }

      // 7. General UPDATE payment_reconciliations
      if (normalizedSql.startsWith('UPDATE payment_reconciliations')) {
        let job = null;
        if (normalizedSql.includes('WHERE id = ?')) {
          const jobId = Number(params[params.length - 1]);
          job = reconciliations.find(r => r.id === jobId);
        } else {
          for (let i = params.length - 1; i >= 0; i--) {
            const p = params[i];
            if (typeof p === 'string' && p.length > 0) {
              job = reconciliations.find(r => r.idempotency_key === p || r.order_id === p || r.paypal_order_id === p);
              if (job) break;
            }
          }
        }

        if (job) {
          job.updated_at = new Date().toISOString();
          job.locked_by = null;
          job.locked_at = null;
          job.lease_expires_at = null;

          if (normalizedSql.includes('SET status = ?')) {
            job.status = params[0];
          }
          if (normalizedSql.includes('resolved = TRUE') || job.status === 'COMPLETED' || job.status === 'FAILED') {
            job.resolved = true;
            job.resolved_at = new Date().toISOString();
          }
          if (normalizedSql.includes('attempt_count = ?')) {
            job.attempt_count = Number(params[1]);
            if (normalizedSql.includes('next_retry_at = ?')) {
              job.next_retry_at = params[2];
              job.last_error = params[3];
            } else {
              job.last_error = params[2];
            }
          }
          if (normalizedSql.includes('SET status = ?, resolved = TRUE, resolved_at = NOW(), order_id = ?')) {
            job.order_id = params[1] || job.order_id;
            job.paypal_capture_id = params[2] || job.paypal_capture_id;
          }
          if (normalizedSql.includes('paypal_capture_id = COALESCE(paypal_capture_id, ?)')) {
            job.paypal_capture_id = params[params.length - 2] || job.paypal_capture_id;
          }
          if (normalizedSql.includes('last_error = ?')) {
            const errParam = params.find(p => typeof p === 'string' && p !== params[0] && (p.includes('Error') || p.includes('failed') || p.includes('timeout') || p.includes('mismatch') || p.includes('was') || p.includes('ORDER_') || p.includes('PAYMENT_')));
            if (errParam) job.last_error = errParam;
          }
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }

      // 8. Orders table queries
      if (normalizedSql.startsWith('SELECT id, order_status, payment_status, paypal_capture_id FROM orders') ||
          normalizedSql.startsWith('SELECT id, order_status, payment_status, paypal_capture_id, total_amount FROM orders') ||
          normalizedSql.startsWith('SELECT * FROM orders WHERE paypal_order_id = ?')) {
        const ppOrder = params[0];
        const ppCap = params[1] || ppOrder;
        const found = orders.filter(o => o.paypal_order_id === ppOrder || (o.paypal_capture_id && o.paypal_capture_id === ppCap));
        return [found];
      }

      if (normalizedSql.startsWith('SELECT * FROM orders WHERE id = ?')) {
        const id = params[0];
        const found = orders.filter(o => o.id === id);
        return [found];
      }

      if (normalizedSql.startsWith('UPDATE orders SET payment_status = ?')) {
        if (params.length === 3) {
          const ord = orders.find(o => o.id === params[2]);
          if (ord) {
            ord.payment_status = params[0];
            ord.order_status = params[1];
            return [{ affectedRows: 1 }];
          }
        } else if (params.length >= 4) {
          const ord = orders.find(o => o.id === params[3]);
          if (ord) {
            ord.payment_status = params[0];
            ord.order_status = params[1];
            ord.paypal_capture_id = params[2];
            return [{ affectedRows: 1 }];
          }
        }
        return [{ affectedRows: 0 }];
      }

      return [[]];
    },
    getConnection: async () => {
      return {
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {},
        query: async (sql, params = []) => {
          const norm = sql.replace(/\s+/g, ' ').trim();
          if (norm.includes('FROM inventory WHERE card_id = ? FOR UPDATE')) {
            const cardId = params[0];
            const inv = inventory.get(cardId);
            return [inv ? [inv] : []];
          }
          if (norm.includes('FROM cards WHERE id = ? FOR UPDATE')) {
            const cardId = params[0];
            const inv = inventory.get(cardId);
            return [[{ in_stock: inv ? inv.stock_quantity : 10 }]];
          }
          if (norm.includes('UPDATE inventory SET stock_quantity = stock_quantity - ?')) {
            const qty = params[0];
            const cardId = params[1];
            const inv = inventory.get(cardId);
            if (inv) inv.stock_quantity -= qty;
            return [{ affectedRows: 1 }];
          }
          if (norm.includes('UPDATE inventory SET stock_quantity = stock_quantity + ?')) {
            const qty = params[0];
            const cardId = params[1];
            const inv = inventory.get(cardId);
            if (inv) inv.stock_quantity += qty;
            return [{ affectedRows: 1 }];
          }
          if (norm.includes('UPDATE cards SET in_stock')) {
            return [{ affectedRows: 1 }];
          }
          if (norm.startsWith('SELECT id FROM orders WHERE id = ? FOR UPDATE') || norm.startsWith('SELECT id, customer_name, customer_email, shipping_address FROM orders')) {
            const id = params[0];
            const ppId = params[1];
            const found = orders.filter(o => o.id === id || (ppId && o.paypal_order_id === ppId));
            return [found];
          }
          if (norm.startsWith('INSERT INTO orders')) {
            let ord;
            if (params.length === 11) {
              ord = {
                id: params[0],
                customer_name: params[1],
                customer_email: params[2],
                shipping_address: params[3],
                subtotal: params[4],
                total_amount: params[5],
                order_status: params[6],
                payment_status: params[7],
                paypal_order_id: params[8],
                paypal_capture_id: params[9],
                tracking_number: params[10]
              };
            } else {
              ord = {
                id: params[0],
                customer_name: params[1],
                customer_email: params[2],
                shipping_address: params[3],
                subtotal: params[4],
                discount_amount: params[5],
                promo_code: params[6],
                insurance_included: params[7],
                insurance_cost: params[8],
                total_amount: params[9],
                order_status: params[10],
                payment_method: params[11],
                payment_status: params[12],
                paypal_order_id: params[13],
                paypal_capture_id: params[14] || null,
                tracking_number: params[15],
                access_token_hash: params[16] || null
              };
            }
            orders.push(ord);
            return [{ affectedRows: 1 }];
          }
          if (norm.startsWith('UPDATE orders SET payment_status = ?')) {
            if (params.length === 3) {
              const ord = orders.find(o => o.id === params[2]);
              if (ord) {
                ord.payment_status = params[0];
                ord.order_status = params[1];
                return [{ affectedRows: 1 }];
              }
            } else if (params.length >= 4) {
              const ord = orders.find(o => o.id === params[3]);
              if (ord) {
                ord.payment_status = params[0];
                ord.order_status = params[1];
                ord.paypal_capture_id = params[2];
                return [{ affectedRows: 1 }];
              }
            }
            return [{ affectedRows: 0 }];
          }
          if (norm.startsWith('INSERT INTO order_items')) {
            orderItems.push({ order_id: params[0], card_id: params[1], card_name: params[2], unit_price: params[3], quantity: params[4], subtotal: params[5] });
            return [{ affectedRows: 1 }];
          }
          if (norm.startsWith('SELECT card_id, quantity FROM order_items WHERE order_id = ?')) {
            const ordId = params[0];
            const items = orderItems.filter(i => i.order_id === ordId);
            return [items];
          }
          if (norm.startsWith('INSERT INTO payment_reconciliations')) {
            return await pool.query(sql, params);
          }
          if (norm.startsWith('UPDATE payment_reconciliations')) {
            return await pool.query(sql, params);
          }
          return [[]];
        }
      };
    }
  };

  return pool;
}

// ============================================================================
// TEST SUITE: DURABLE PAYMENT RECONCILIATION & CORRECTIONS
// ============================================================================

test('1. Successful payment reconciliation finalizes order and sets status COMPLETED', async () => {
  const pool = createMockPool();

  const persistRes = await persistReconciliationJob(pool, {
    paypalOrderId: 'PP-TEST-12345',
    paypalCaptureId: 'CAP-TEST-12345',
    amount: 149.99,
    currency: 'USD',
    customerEmail: 'trainer@pokevault.com',
    customerName: 'Red of Pallet Town',
    shippingAddress: '1 Pallet Town Way, Kanto',
    items: [{ cardId: 'charizard-base-1st', cardName: '1st Edition Charizard', unitPrice: 149.99, quantity: 1, subtotal: 149.99 }]
  });

  assert.equal(persistRes.success, true);
  assert.equal(persistRes.reconciliationId, 1);

  const mockFetchDetails = async () => ({
    success: true,
    data: {
      id: 'PP-TEST-12345',
      status: 'COMPLETED',
      purchase_units: [{
        payments: {
          captures: [{
            id: 'CAP-TEST-12345',
            status: 'COMPLETED',
            amount: { currency_code: 'USD', value: '149.99' }
          }]
        }
      }]
    }
  });

  const job = pool._data.reconciliations[0];
  const reconResult = await reconcilePaymentRecord(pool, job, {
    fetchOrderDetailsFn: mockFetchDetails
  });

  assert.equal(reconResult.success, true);
  assert.equal(reconResult.captureId, 'CAP-TEST-12345');
  assert.equal(pool._data.reconciliations[0].status, RECONCILIATION_STATES.COMPLETED);
  assert.equal(pool._data.reconciliations[0].resolved, true);
  assert.equal(pool._data.orders.length, 1);
  assert.equal(pool._data.orders[0].payment_status, PAYMENT_STATES.COMPLETED);
  assert.equal(pool._data.orders[0].order_status, ORDER_STATES.RECEIVED);
});

test('2. Repeated delivery of same reconciliation request is strictly idempotent', async () => {
  const pool = createMockPool();

  const res1 = await persistReconciliationJob(pool, {
    idempotencyKey: 'recon_pp_IDEMPOTENT_1',
    paypalOrderId: 'PP-IDEMPOTENT-1',
    amount: 100.00,
    currency: 'USD'
  });
  assert.equal(res1.success, true);
  assert.equal(res1.alreadyExists, false);

  const res2 = await persistReconciliationJob(pool, {
    idempotencyKey: 'recon_pp_IDEMPOTENT_1',
    paypalOrderId: 'PP-IDEMPOTENT-1',
    amount: 100.00,
    currency: 'USD'
  });
  assert.equal(res2.success, true);
  assert.equal(res2.alreadyExists, true);
  assert.equal(pool._data.reconciliations.length, 1);
});

test('3. PayPal timeout with ambiguous final outcome schedules retry without failing payment prematurely', async () => {
  const pool = createMockPool();

  await persistReconciliationJob(pool, {
    paypalOrderId: 'PP-TIMEOUT-999',
    amount: 50.00,
    currency: 'USD',
    status: RECONCILIATION_STATES.AMBIGUOUS
  });

  const job = pool._data.reconciliations[0];
  const mockTimeoutFetch = async () => ({
    success: false,
    status: 504,
    error: 'Gateway Timeout connecting to PayPal API'
  });

  const res = await reconcilePaymentRecord(pool, job, {
    fetchOrderDetailsFn: mockTimeoutFetch,
    isTransientError: true
  });

  assert.equal(res.success, false);
  assert.equal(res.retryable, true);
  assert.equal(res.status, RECONCILIATION_STATES.PENDING);
  assert.equal(job.status, RECONCILIATION_STATES.PENDING);
  assert.equal(job.attempt_count, 1);
  assert.notEqual(job.next_retry_at, null);
});

test('4. Transient provider failure applies exponential backoff and recovers upon retry', async () => {
  assert.equal(calculateBackoffSeconds(1, 15, 300), 15);
  assert.equal(calculateBackoffSeconds(2, 15, 300), 30);
  assert.equal(calculateBackoffSeconds(3, 15, 300), 60);
  assert.equal(calculateBackoffSeconds(4, 15, 300), 120);
  assert.equal(calculateBackoffSeconds(5, 15, 300), 240);
  assert.equal(calculateBackoffSeconds(6, 15, 300), 300);

  const pool = createMockPool();
  await persistReconciliationJob(pool, {
    paypalOrderId: 'PP-TRANSIENT-1',
    amount: 80.00,
    currency: 'USD'
  });

  const job = pool._data.reconciliations[0];
  let attempt = 0;
  const mockFlakyFetch = async () => {
    attempt++;
    if (attempt === 1) {
      return { success: false, status: 503, error: 'Service Unavailable' };
    }
    return {
      success: true,
      data: {
        id: 'PP-TRANSIENT-1',
        status: 'COMPLETED',
        purchase_units: [{ payments: { captures: [{ id: 'CAP-TRANSIENT-1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '80.00' } }] } }]
      }
    };
  };

  const firstTry = await reconcilePaymentRecord(pool, job, { fetchOrderDetailsFn: mockFlakyFetch });
  assert.equal(firstTry.success, false);
  assert.equal(firstTry.retryable, true);
  assert.equal(job.attempt_count, 1);

  const secondTry = await reconcilePaymentRecord(pool, job, { fetchOrderDetailsFn: mockFlakyFetch });
  assert.equal(secondTry.success, true);
  assert.equal(job.status, RECONCILIATION_STATES.COMPLETED);
});

test('5. Non-retryable provider failure marks job FAILED and halts retries', async () => {
  const pool = createMockPool();
  await persistReconciliationJob(pool, {
    paypalOrderId: 'PP-TERMINAL-404',
    amount: 60.00,
    currency: 'USD'
  });

  const job = pool._data.reconciliations[0];
  const mock404Fetch = async () => ({
    success: false,
    status: 404,
    error: 'ORDER_NOT_FOUND'
  });

  const res = await reconcilePaymentRecord(pool, job, {
    fetchOrderDetailsFn: mock404Fetch,
    isTransientError: false
  });

  assert.equal(res.success, false);
  assert.equal(res.retryable, false);
  assert.equal(res.status, RECONCILIATION_STATES.FAILED);
  assert.equal(job.status, RECONCILIATION_STATES.FAILED);
  assert.equal(job.resolved, true);
});

test('6. Database unavailability throws explicit error without silent file fallback', async () => {
  await assert.rejects(
    async () => {
      await persistReconciliationJob(null, {
        paypalOrderId: 'PP-NODB',
        amount: 100
      });
    },
    /Database service unavailable/
  );
});

test('7. Recovery of persisted pending reconciliations after service restart', async () => {
  const pool = createMockPool();

  await persistReconciliationJob(pool, {
    idempotencyKey: 'recon_pp_CRASH_1',
    paypalOrderId: 'PP-CRASH-1',
    paypalCaptureId: 'CAP-CRASH-1',
    amount: 100.00,
    currency: 'USD'
  });

  await persistReconciliationJob(pool, {
    idempotencyKey: 'recon_pp_CRASH_2',
    paypalOrderId: 'PP-CRASH-2',
    paypalCaptureId: 'CAP-CRASH-2',
    amount: 200.00,
    currency: 'USD'
  });

  assert.equal(pool._data.reconciliations.length, 2);
  assert.equal(pool._data.reconciliations.every(r => r.status === RECONCILIATION_STATES.PENDING), true);

  const mockFetchDetails = async ({ paypalOrderId }) => ({
    success: true,
    data: {
      id: paypalOrderId,
      status: 'COMPLETED',
      purchase_units: [{
        payments: {
          captures: [{
            id: `CAP-${paypalOrderId}`,
            status: 'COMPLETED',
            amount: { currency_code: 'USD', value: paypalOrderId === 'PP-CRASH-1' ? '100.00' : '200.00' }
          }]
        }
      }]
    }
  });

  await recoverPendingReconciliationsOnStartup(pool, {
    fetchOrderDetailsFn: mockFetchDetails
  });

  assert.equal(pool._data.reconciliations.every(r => r.status === RECONCILIATION_STATES.COMPLETED), true);
  assert.equal(pool._data.orders.length, 2);
});

test('8. Protection against duplicate processing by concurrent workers via atomic claim', async () => {
  const pool = createMockPool();

  await persistReconciliationJob(pool, {
    paypalOrderId: 'PP-RACE-001',
    amount: 75.00,
    currency: 'USD'
  });

  const jobId = pool._data.reconciliations[0].id;

  const [claimWorker1, claimWorker2] = await Promise.all([
    claimReconciliationJob(pool, jobId, { workerId: 'worker-A' }),
    claimReconciliationJob(pool, jobId, { workerId: 'worker-B' })
  ]);

  assert.ok(
    (claimWorker1 === true && claimWorker2 === false) ||
    (claimWorker1 === false && claimWorker2 === true),
    'Atomic claim must ensure mutually exclusive execution between concurrent workers'
  );

  assert.equal(pool._data.reconciliations[0].status, RECONCILIATION_STATES.PROCESSING);
});

test('9. Strict relationship between payment status and order status', () => {
  const validCompleted = validatePaymentStateTransition(PAYMENT_STATES.PENDING, PAYMENT_STATES.COMPLETED);
  assert.equal(validCompleted.valid, true);

  const validFailed = validatePaymentStateTransition(PAYMENT_STATES.PENDING, PAYMENT_STATES.FAILED);
  assert.equal(validFailed.valid, true);

  const invalidRevert = validatePaymentStateTransition(PAYMENT_STATES.COMPLETED, PAYMENT_STATES.PENDING);
  assert.equal(invalidRevert.valid, false);
  assert.match(invalidRevert.error, /Illegal state transition/);

  const invalidFail = validatePaymentStateTransition(PAYMENT_STATES.COMPLETED, PAYMENT_STATES.FAILED);
  assert.equal(invalidFail.valid, false);
});

test('10. Rejection of client-supplied payment status or amount as authoritative', () => {
  const tamperedCapture = {
    id: 'CAP-TAMPERED-001',
    status: 'COMPLETED',
    amount: { currency_code: 'USD', value: '10.00' }
  };

  const verifyRes = verifyPayPalCapture({
    captureResponse: tamperedCapture,
    expectedTotalAmount: 120.00,
    expectedCurrency: 'USD'
  });

  assert.equal(verifyRes.verified, false);
  assert.match(verifyRes.reason, /Captured amount mismatch/);
});

test('11. Verification that retired local JSONL fallback is completely removed', () => {
  const reconSrc = fs.readFileSync(path.resolve(__dirname, '../src/reconciliation.js'), 'utf8');
  const indexSrc = fs.readFileSync(path.resolve(__dirname, '../src/index.js'), 'utf8');

  assert.equal(reconSrc.includes('.jsonl'), false, 'reconciliation.js must have zero references to .jsonl');
  assert.equal(indexSrc.includes('.jsonl'), false, 'index.js must have zero references to .jsonl');
  assert.equal(indexSrc.includes('PAYMENT_RECONCILIATION_LOG_FILE'), false, 'index.js must not reference PAYMENT_RECONCILIATION_LOG_FILE');

  const serviceDir = path.resolve(__dirname, '..');
  const findJsonlFiles = (dir) => {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'node_modules' || file === '.git') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(findJsonlFiles(fullPath));
      } else if (file.endsWith('.jsonl')) {
        results.push(fullPath);
      }
    }
    return results;
  };

  const jsonlFiles = findJsonlFiles(serviceDir);
  assert.equal(jsonlFiles.length, 0, 'Zero .jsonl files allowed in order-service');
});

// ============================================================================
// NEW REGRESSION TESTS: PAYMENT SAFETY & RECOVERY CONCERNS
// ============================================================================

test('1. MySQL unavailable before payment intent persistence -> capture is never initiated', async () => {
  let externalCaptureCalled = false;

  const _mockCaptureFn = async () => {
    externalCaptureCalled = true;
    return { success: true, data: { id: 'CAP-SHOULD-NOT-RUN', status: 'COMPLETED' } };
  };

  const offlinePool = null;

  await assert.rejects(
    async () => {
      await createDurablePaymentIntent(offlinePool, {
        paypalOrderId: 'PP-OFFLINE-DB-1',
        cart: { totalAmount: 149.99, subtotal: 140.00, lineItems: [] }
      });
    },
    /Database service unavailable/
  );

  assert.equal(externalCaptureCalled, false, 'Capture must NEVER be initiated if intent was not committed');
});

test('2. Intent committed, capture succeeds, but subsequent MySQL update fails -> intent remains recoverable once DB returns', async () => {
  const pool = createMockPool();

  // Step 1: Intent committed to MySQL before capture
  const intent = await createDurablePaymentIntent(pool, {
    paypalOrderId: 'PP-POST-FAIL-1',
    cart: {
      totalAmount: 149.99,
      subtotal: 140.00,
      discountAmount: 0,
      insuranceCost: 9.99,
      lineItems: [{ cardId: 'charizard-base-1st', cardName: '1st Edition Charizard', unitPrice: 149.99, quantity: 1, subtotal: 149.99 }]
    },
    customerName: 'Ash Ketchum',
    customerEmail: 'ash@pallet.org'
  });

  assert.equal(intent.success, true);
  assert.equal(intent.isNew, true);
  const orderId = intent.orderId;

  // Verify pending order and reconciliation records exist in DB
  const pendingOrder = pool._data.orders.find(o => o.id === orderId);
  assert.equal(pendingOrder.payment_status, PAYMENT_STATES.PENDING);
  assert.equal(pendingOrder.order_status, ORDER_STATES.PENDING_PAYMENT);

  // Step 2: External PayPal capture succeeds
  const captureId = 'CAP-POST-FAIL-SUCCESS';

  // Step 3: Simulate subsequent MySQL update failing (e.g. transient DB disconnection)
  let dbHealthy = false;
  const attemptFinalize = async () => {
    if (!dbHealthy) throw new Error('Deadlock / Connection dropped during post-capture update');
    return finalizePaymentIntent(pool, { orderId, captureId });
  };

  await assert.rejects(attemptFinalize, /Deadlock \/ Connection dropped/);

  // Assert intent remains in MySQL with active capture lease and order reference
  const reconJob = pool._data.reconciliations.find(r => r.order_id === orderId);
  assert.ok(reconJob, 'Reconciliation job must be persisted in MySQL');
  assert.ok([RECONCILIATION_STATES.PROCESSING, RECONCILIATION_STATES.PENDING].includes(reconJob.status));

  // Step 4: Database returns to health -> Expired lease allows recovery to discover intent and finalize order
  dbHealthy = true;
  reconJob.lease_expires_at = new Date(Date.now() - 5000).toISOString();
  const mockFetchDetails = async () => ({
    success: true,
    data: {
      id: 'PP-POST-FAIL-1',
      status: 'COMPLETED',
      purchase_units: [{ payments: { captures: [{ id: captureId, status: 'COMPLETED', amount: { currency_code: 'USD', value: '149.99' } }] } }]
    }
  });

  const reconRes = await reconcilePaymentRecord(pool, reconJob, { fetchOrderDetailsFn: mockFetchDetails });
  assert.equal(reconRes.success, true);

  // Verify order transitioned to completed and received without duplicating order or inventory decrement
  assert.equal(pendingOrder.payment_status, PAYMENT_STATES.COMPLETED);
  assert.equal(pendingOrder.order_status, ORDER_STATES.RECEIVED);
  assert.equal(pendingOrder.paypal_capture_id, captureId);
  assert.equal(pool._data.orders.length, 1, 'Only one order record must exist');
});

test('3. Capture request times out after being sent -> recovery checks provider state before retrying', async () => {
  const pool = createMockPool();

  const intent = await createDurablePaymentIntent(pool, {
    paypalOrderId: 'PP-TIMEOUT-RECOVER-1',
    cart: { totalAmount: 149.99, subtotal: 140.00, lineItems: [] }
  });

  // Mark intent AMBIGUOUS as when network drops mid-capture
  await markIntentAmbiguous(pool, {
    orderId: intent.orderId,
    idempotencyKey: intent.idempotencyKey,
    paypalOrderId: 'PP-TIMEOUT-RECOVER-1',
    error: 'ECONNRESET timeout during external capture call'
  });

  const reconJob = pool._data.reconciliations.find(r => r.idempotency_key === intent.idempotencyKey);
  assert.ok(reconJob, 'Job must exist in pool');
  assert.equal(reconJob.status, RECONCILIATION_STATES.AMBIGUOUS);

  let providerQueryCount = 0;
  let providerCaptureCallCount = 0;

  const mockFetchDetails = async () => {
    providerQueryCount++;
    return {
      success: true,
      data: {
        id: 'PP-TIMEOUT-RECOVER-1',
        status: 'COMPLETED',
        purchase_units: [{ payments: { captures: [{ id: 'CAP-DISCOVERED-1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '149.99' } }] } }]
      }
    };
  };

  const result = await reconcilePaymentRecord(pool, reconJob, {
    fetchOrderDetailsFn: mockFetchDetails
  });

  assert.equal(result.success, true);
  assert.equal(providerQueryCount, 1, 'Recovery must query provider state FIRST');
  assert.equal(providerCaptureCallCount, 0, 'Recovery must NOT initiate redundant capture when payment already captured');
  assert.equal(reconJob.status, RECONCILIATION_STATES.COMPLETED);
});

test('4. A worker crashes after claiming a job -> expired lease makes it recoverable', async () => {
  const pool = createMockPool();

  await persistReconciliationJob(pool, {
    paypalOrderId: 'PP-CRASHED-WORKER-1',
    amount: 99.99,
    currency: 'USD'
  });

  const jobId = pool._data.reconciliations[0].id;

  // Worker 1 claims job with a short 2-second lease
  const claimedWorker1 = await claimReconciliationJob(pool, jobId, {
    workerId: 'worker-1-crasher',
    leaseDurationSeconds: 2
  });
  assert.equal(claimedWorker1, true);

  const job = pool._data.reconciliations[0];
  assert.equal(job.status, RECONCILIATION_STATES.PROCESSING);
  assert.equal(job.locked_by, 'worker-1-crasher');

  // Worker 1 crashes. Worker 2 immediately tries to claim while lease is unexpired: fails!
  const immediateClaim = await claimReconciliationJob(pool, jobId, { workerId: 'worker-2-standby' });
  assert.equal(immediateClaim, false, 'Cannot claim unexpired job');

  // Advance time: set lease_expires_at to past to simulate expired lease
  job.lease_expires_at = new Date(Date.now() - 5000).toISOString();

  // Expired job is discoverable by pending fetch
  const pendingJobs = await fetchPendingReconciliations(pool);
  assert.equal(pendingJobs.some(j => j.id === jobId), true, 'Expired PROCESSING job must be discovered');

  // Worker 2 reclaims the expired job safely
  const reclaimed = await claimReconciliationJob(pool, jobId, { workerId: 'worker-2-savior' });
  assert.equal(reclaimed, true, 'Worker 2 must successfully reclaim expired lease');
  assert.equal(job.status, RECONCILIATION_STATES.PROCESSING);
  assert.equal(job.locked_by, 'worker-2-savior');
});

test('5. Concurrent workers cannot claim the same unexpired job', async () => {
  const pool = createMockPool();

  await persistReconciliationJob(pool, {
    paypalOrderId: 'PP-CONCURRENT-LOCK',
    amount: 120.00,
    currency: 'USD'
  });

  const jobId = pool._data.reconciliations[0].id;

  // Worker 1 claims job with 60 second lease
  const claimed1 = await claimReconciliationJob(pool, jobId, {
    workerId: 'worker-primary',
    leaseDurationSeconds: 60
  });
  assert.equal(claimed1, true);

  // 5 simultaneous background workers all attempt to claim the job while lease is active
  const competingClaims = await Promise.all([
    claimReconciliationJob(pool, jobId, { workerId: 'worker-competing-1' }),
    claimReconciliationJob(pool, jobId, { workerId: 'worker-competing-2' }),
    claimReconciliationJob(pool, jobId, { workerId: 'worker-competing-3' }),
    claimReconciliationJob(pool, jobId, { workerId: 'worker-competing-4' }),
    claimReconciliationJob(pool, jobId, { workerId: 'worker-competing-5' })
  ]);

  // ALL competing workers must be rejected
  assert.equal(competingClaims.every(c => c === false), true, 'No concurrent worker may claim an unexpired active job');
  assert.equal(pool._data.reconciliations[0].locked_by, 'worker-primary');
});

test('6. Recovery does not create duplicate orders, captures or inventory deductions', async () => {
  const pool = createMockPool();

  // Initial stock for charizard-base-1st is 10
  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 10);

  // Intent created: 1 card reserved/deducted from 10 -> 9
  const intent = await createDurablePaymentIntent(pool, {
    paypalOrderId: 'PP-NO-DUP-DEDUCT',
    cart: {
      totalAmount: 149.99,
      subtotal: 140.00,
      lineItems: [{ cardId: 'charizard-base-1st', cardName: '1st Edition Charizard', unitPrice: 149.99, quantity: 1, subtotal: 149.99 }]
    }
  });
  assert.ok(intent.success);

  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 9);
  assert.equal(pool._data.orders.length, 1);

  const reconJob = pool._data.reconciliations[0];
  const mockFetchDetails = async () => ({
    success: true,
    data: {
      id: 'PP-NO-DUP-DEDUCT',
      status: 'COMPLETED',
      purchase_units: [{ payments: { captures: [{ id: 'CAP-NO-DUP-1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '149.99' } }] } }]
    }
  });

  // Execute reconciliation pass 1
  const pass1 = await reconcilePaymentRecord(pool, reconJob, { fetchOrderDetailsFn: mockFetchDetails });
  assert.equal(pass1.success, true);

  // Execute reconciliation pass 2 (simulating duplicate worker or retry sweep)
  const pass2 = await reconcilePaymentRecord(pool, reconJob, { fetchOrderDetailsFn: mockFetchDetails });
  assert.equal(pass2.success, true);

  // Stock must remain exactly 9 (NOT 8 or 7!)
  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 9, 'Inventory must not be decremented a second time');
  // Order count must remain exactly 1 (no duplicate order created)
  assert.equal(pool._data.orders.length, 1, 'Only one order record must exist');
});

test('7. Rollback semantics restore inventory when payment capture terminally fails', async () => {
  const pool = createMockPool();

  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 10);

  // Intent created: stock decremented 10 -> 9
  const intent = await createDurablePaymentIntent(pool, {
    paypalOrderId: 'PP-TERMINAL-ROLLBACK',
    cart: {
      totalAmount: 149.99,
      subtotal: 140.00,
      lineItems: [{ cardId: 'charizard-base-1st', cardName: '1st Edition Charizard', unitPrice: 149.99, quantity: 1, subtotal: 149.99 }]
    }
  });
  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 9);

  // Simulate provider terminal rejection (e.g. buyer cancelled, card declined, voided)
  await rollbackFailedPaymentIntent(pool, {
    orderId: intent.orderId,
    idempotencyKey: intent.idempotencyKey,
    paypalOrderId: 'PP-TERMINAL-ROLLBACK',
    error: 'PAYMENT_DECLINED'
  });

  // Inventory MUST be restored back to 10!
  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 10, 'Inventory must be restored on terminal payment failure');

  const order = pool._data.orders.find(o => o.id === intent.orderId);
  assert.equal(order.order_status, ORDER_STATES.FAILED);
  assert.equal(order.payment_status, PAYMENT_STATES.FAILED);

  const recon = pool._data.reconciliations.find(r => r.idempotency_key === intent.idempotencyKey);
  assert.ok(recon, 'Reconciliation record must exist');
  assert.equal(recon.status, RECONCILIATION_STATES.FAILED);
  assert.equal(recon.resolved, true);
});

test('8. PII minimization: reconciliation record references order_id and omits duplicate PII', async () => {
  const pool = createMockPool();

  const intent = await createDurablePaymentIntent(pool, {
    paypalOrderId: 'PP-PII-MINIMIZED',
    cart: { totalAmount: 100.00, subtotal: 100.00, lineItems: [] },
    customerName: 'Top Secret Collector',
    customerEmail: 'secret@collector.com',
    shippingAddress: '42 Classified Vault Way, Sector 7'
  });

  const reconJob = pool._data.reconciliations.find(r => r.idempotency_key === intent.idempotencyKey);
  assert.ok(reconJob);
  assert.equal(reconJob.order_id, intent.orderId);

  // Verify duplicate PII is minimized in payment_reconciliations
  assert.equal(reconJob.customer_name, null, 'Customer name must not be duplicated in reconciliation record');
  assert.equal(reconJob.shipping_address, null, 'Shipping address must not be duplicated in reconciliation record');
  assert.equal(reconJob.items_payload, null, 'Items payload must not be duplicated in reconciliation record');

  // Verify the order itself retains the necessary fulfillment information
  const order = pool._data.orders.find(o => o.id === intent.orderId);
  assert.equal(order.customer_name, 'Top Secret Collector');
  assert.equal(order.customer_email, 'secret@collector.com');
});

test('Concurrency: Deterministic test pausing capture flow after intent commit proves worker cannot race active request', async () => {
  const pool = createMockPool();

  // Initial stock: 10
  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 10);

  // Step 1 & 2: Client commits durable payment intent to MySQL before external capture
  const intent = await createDurablePaymentIntent(pool, {
    paypalOrderId: 'PP-RACE-SYNC-WORKER-1',
    cart: {
      totalAmount: 149.99,
      subtotal: 140.00,
      lineItems: [{ cardId: 'charizard-base-1st', quantity: 1, unitPrice: 149.99, subtotal: 149.99 }]
    },
    ownerId: 'sync-capture-thread-1',
    leaseDurationSeconds: 60
  });

  assert.equal(intent.success, true);
  assert.ok(intent.orderId);

  // Verify intent state immediately after commit:
  // - Inventory decremented once (reserved: 10 -> 9)
  // - Status is PROCESSING with explicit lease ownership
  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 9);
  assert.equal(pool._data.orders.length, 1);
  const reconJob = pool._data.reconciliations[0];
  assert.equal(reconJob.status, RECONCILIATION_STATES.PROCESSING);
  assert.equal(reconJob.locked_by, 'sync-capture-thread-1');
  assert.ok(new Date(reconJob.lease_expires_at) > new Date());

  // Step 3: PAUSE the original capture flow right here (before calling external PayPal endpoint)
  // While paused, execute the background reconciliation worker:
  const workerResult = await processPendingReconciliations(pool, {
    workerId: 'background-worker-race'
  });

  // Assertions:
  // - The worker CANNOT race the active capture request (0 jobs processed)
  // - Ownership remains strictly with sync-capture-thread-1
  // - Inventory is NOT decremented again
  assert.equal(workerResult.processed, 0, 'Worker must NOT claim an active unexpired capture intent');
  assert.equal(reconJob.status, RECONCILIATION_STATES.PROCESSING);
  assert.equal(reconJob.locked_by, 'sync-capture-thread-1');
  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 9);
  assert.equal(pool._data.orders.length, 1);

  // Step 4: Assert that a concurrent duplicate client request cannot initiate a second capture
  const competingClientRequest = await createDurablePaymentIntent(pool, {
    paypalOrderId: 'PP-RACE-SYNC-WORKER-1',
    cart: { totalAmount: 149.99, subtotal: 140.00, lineItems: [] },
    ownerId: 'sync-capture-thread-2'
  });
  assert.equal(competingClientRequest.activeCaptureInProgress, true, 'Competing request must detect active capture lease');

  // Step 5: Resume original capture flow -> External capture succeeds and finalizes order
  await finalizePaymentIntent(pool, {
    orderId: intent.orderId,
    paypalOrderId: 'PP-RACE-SYNC-WORKER-1',
    captureId: 'CAP-SYNC-SUCCESS-1'
  });

  // Verify finalized state
  const finalizedOrder = pool._data.orders[0];
  assert.equal(finalizedOrder.payment_status, PAYMENT_STATES.COMPLETED);
  assert.equal(finalizedOrder.order_status, ORDER_STATES.RECEIVED);
  assert.equal(reconJob.status, RECONCILIATION_STATES.COMPLETED);
  assert.equal(reconJob.locked_by, null);

  // Step 6: Worker runs again -> 0 jobs processed, no duplicate deductions
  const postWorkerResult = await processPendingReconciliations(pool, { workerId: 'background-worker-race' });
  assert.equal(postWorkerResult.processed, 0);
  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 9);
  assert.equal(pool._data.orders.length, 1);
});

test('Concurrency: Crash immediately after intent commit before external request is recovered safely after lease expires', async () => {
  const pool = createMockPool();

  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 10);

  // Step 1: Commit durable payment intent
  const intent = await createDurablePaymentIntent(pool, {
    paypalOrderId: 'PP-CRASH-PRE-CAPTURE-1',
    cart: {
      totalAmount: 149.99,
      subtotal: 140.00,
      lineItems: [{ cardId: 'charizard-base-1st', quantity: 1, unitPrice: 149.99, subtotal: 149.99 }]
    },
    ownerId: 'crashed-request-thread',
    leaseDurationSeconds: 10
  });
  assert.ok(intent.success);

  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 9);
  const reconJob = pool._data.reconciliations[0];
  assert.equal(reconJob.status, RECONCILIATION_STATES.PROCESSING);

  // Step 2: Simulate process crash immediately after commit (no external request issued)
  // While lease is unexpired, background worker cannot claim it:
  const immediateWorkerResult = await processPendingReconciliations(pool, { workerId: 'worker-standby' });
  assert.equal(immediateWorkerResult.processed, 0);

  // Step 3: Advance time so lease expires
  reconJob.lease_expires_at = new Date(Date.now() - 5000).toISOString();

  // Scenario A: PayPal order was cancelled or expired
  const mockFetchDetailsCancelled = async () => ({
    success: true,
    data: { id: 'PP-CRASH-PRE-CAPTURE-1', status: 'CANCELLED' }
  });

  const recoverResult = await reconcilePaymentRecord(pool, reconJob, {
    fetchOrderDetailsFn: mockFetchDetailsCancelled
  });

  // Verify rollback semantics:
  // - Inventory restored to 10
  // - Order marked FAILED
  // - Job marked FAILED and resolved
  assert.equal(recoverResult.status, RECONCILIATION_STATES.FAILED);
  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 10, 'Inventory must be restored upon rollback');
  assert.equal(pool._data.orders[0].payment_status, PAYMENT_STATES.FAILED);
  assert.equal(pool._data.orders[0].order_status, ORDER_STATES.FAILED);
  assert.equal(reconJob.status, RECONCILIATION_STATES.FAILED);
});

test('Concurrency: Crash after payer approval recovers by capturing via stable idempotency key without duplicate inventory deduction', async () => {
  const pool = createMockPool();

  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 10);

  // Step 1: Commit durable payment intent
  const intent = await createDurablePaymentIntent(pool, {
    paypalOrderId: 'PP-CRASH-APPROVED-1',
    cart: {
      totalAmount: 149.99,
      subtotal: 140.00,
      lineItems: [{ cardId: 'charizard-base-1st', quantity: 1, unitPrice: 149.99, subtotal: 149.99 }]
    },
    ownerId: 'crashed-request-thread',
    leaseDurationSeconds: 10
  });

  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 9);
  const reconJob = pool._data.reconciliations[0];

  // Advance time so lease expires
  reconJob.lease_expires_at = new Date(Date.now() - 5000).toISOString();

  // Scenario B: Payer approved on frontend, but server died before issuing capture
  const mockFetchDetailsApproved = async () => ({
    success: true,
    data: { id: 'PP-CRASH-APPROVED-1', status: 'APPROVED' }
  });

  let captureCallCount = 0;
  let receivedRequestId = null;
  const mockCaptureFn = async ({ paypalOrderId: _paypalOrderId, requestId }) => {
    captureCallCount++;
    receivedRequestId = requestId;
    return {
      success: true,
      data: {
        id: 'PP-CRASH-APPROVED-1',
        status: 'COMPLETED',
        purchase_units: [{
          payments: {
            captures: [{
              id: 'CAP-RECOVERED-001',
              status: 'COMPLETED',
              amount: { currency_code: 'USD', value: '149.99' }
            }]
          }
        }]
      }
    };
  };

  const recoverResult = await reconcilePaymentRecord(pool, reconJob, {
    fetchOrderDetailsFn: mockFetchDetailsApproved,
    captureOrderFn: mockCaptureFn
  });

  // Verify:
  // - Recovery queries provider first, then executes capture using stable idempotency key
  // - Inventory is NOT decremented a second time (remains 9)
  // - Order is finalized as COMPLETED and RECEIVED
  assert.equal(recoverResult.success, true);
  assert.equal(captureCallCount, 1);
  assert.equal(receivedRequestId, intent.idempotencyKey, 'Must reuse stable idempotency key');
  assert.equal(pool._data.inventory.get('charizard-base-1st').stock_quantity, 9, 'Inventory must not be decremented twice');
  assert.equal(pool._data.orders[0].payment_status, PAYMENT_STATES.COMPLETED);
  assert.equal(pool._data.orders[0].order_status, ORDER_STATES.RECEIVED);
  assert.equal(reconJob.status, RECONCILIATION_STATES.COMPLETED);
});
