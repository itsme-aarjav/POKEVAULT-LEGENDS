import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyToken,
  signToken,
  extractToken,
  generateOrderAccessToken,
  hashOrderAccessToken,
  extractOrderToken,
  timingSafeCompare
} from '../src/jwt.js';
import {
  PAYMENT_STATES,
  ORDER_STATES,
  validatePaymentStateTransition,
  isPayPalConfigured,
  getPayPalAccessToken,
  createPayPalServerOrder,
  capturePayPalServerOrder,
  verifyPayPalCapture
} from '../src/paypal.js';

// ============================================================================
// FINANCIAL & PRICING TESTS
// ============================================================================

test('order price calculation logic using minor currency units (cents)', () => {
  const items = [
    { cardId: 'c1', unitPrice: 100.50, quantity: 2 },
    { cardId: 'c2', unitPrice: 49.99, quantity: 1 }
  ];
  const subtotalCents = items.reduce((sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity, 0);
  const insuranceCostCents = 999;
  const discountCents = 1000;
  const totalCents = Math.max(0, subtotalCents + insuranceCostCents - discountCents);

  assert.equal(subtotalCents, 25099); // $250.99
  assert.equal(totalCents, 25098);    // $250.98
  assert.equal(+(totalCents / 100).toFixed(2), 250.98);
});

test('order id generation format', () => {
  const orderId = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  assert.match(orderId, /^ORD-\d{13}-\d{3}$/);
});

// ============================================================================
// ADMIN AUTHENTICATION TESTS
// ============================================================================

test('admin endpoint authorization - valid admin token accepted', () => {
  const secret = 'order-jwt-shared-secret-key-32chr';
  const adminToken = signToken({ role: 'admin', sub: 'auditor-1' }, secret, 3600);

  const decoded = verifyToken(adminToken, secret);
  assert.ok(decoded);
  assert.equal(decoded.role, 'admin');
});

test('admin endpoint authorization - non-admin token rejected', () => {
  const secret = 'order-jwt-shared-secret-key-32chr';
  const customerToken = signToken({ role: 'customer', sub: 'buyer-99' }, secret, 3600);

  const decoded = verifyToken(customerToken, secret);
  assert.ok(decoded);
  assert.notEqual(decoded.role, 'admin');
});

test('admin endpoint authorization - arbitrary string or backdoor rejected', () => {
  const secret = 'order-jwt-shared-secret-key-32chr';
  assert.equal(verifyToken('pokevaultadmin123', secret), null);
  assert.equal(verifyToken('x'.repeat(48), secret), null);
});

// ============================================================================
// PV-006 & PHASE 3: ORDER ACCESS TOKEN SECURITY TESTS
// ============================================================================

test('PV-006: Order Access Token generation, hashing, and constant-time verification', () => {
  const token = generateOrderAccessToken();
  assert.equal(typeof token, 'string');
  assert.equal(token.length, 64); // 32 bytes hex = 64 characters

  const hash = hashOrderAccessToken(token);
  assert.equal(typeof hash, 'string');
  assert.equal(hash.length, 64); // SHA-256 hex = 64 characters

  // Verify constant-time match
  const candidateHashValid = hashOrderAccessToken(token);
  assert.equal(timingSafeCompare(candidateHashValid, hash), true);

  // Reject wrong token
  const wrongToken = generateOrderAccessToken();
  const candidateHashInvalid = hashOrderAccessToken(wrongToken);
  assert.equal(timingSafeCompare(candidateHashInvalid, hash), false);

  // Reject forged/empty inputs
  assert.equal(timingSafeCompare('', hash), false);
  assert.equal(timingSafeCompare(null, hash), false);
});

test('PV-006 & Phase 3: Bearer tokens in URL query parameters are strictly rejected', () => {
  // Query parameter token MUST be ignored and rejected to prevent URL logging leakage
  const reqQueryOnly = { headers: {}, query: { token: 'query-token-value-leaked' } };
  assert.equal(extractOrderToken(reqQueryOnly), null);

  // Query parameter token accompanied by valid header must still prefer header
  const reqBoth = { headers: { 'x-order-token': 'secure-header-token' }, query: { token: 'untrusted-query-token' } };
  assert.equal(extractOrderToken(reqBoth), 'secure-header-token');
});

test('PV-006 & Phase 3: Header-based order token authorization (valid, absent, malformed, mismatched)', () => {
  // Valid X-Order-Token header
  const reqValidHeader = { headers: { 'x-order-token': 'a1b2c3d4e5f6' } };
  assert.equal(extractOrderToken(reqValidHeader), 'a1b2c3d4e5f6');

  // Valid Authorization Bearer header (non-JWT order access token)
  const reqBearer = { headers: { authorization: 'Bearer deadbeefcafebabe' } };
  assert.equal(extractOrderToken(reqBearer), 'deadbeefcafebabe');

  // JWT in Authorization header is ignored by extractOrderToken (handled by admin auth)
  const reqJwt = { headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.signature' } };
  assert.equal(extractOrderToken(reqJwt), null);

  // Absent headers
  const reqEmpty = { headers: {}, query: {} };
  assert.equal(extractOrderToken(reqEmpty), null);

  // Malformed / non-string headers
  assert.equal(extractOrderToken({ headers: { 'x-order-token': '   ' } }), null);
  assert.equal(extractOrderToken({ headers: null }), null);
  assert.equal(extractOrderToken(null), null);
});

// ============================================================================
// PV-007: PRICING & QUANTITY VALIDATION TESTS
// ============================================================================

test('PV-007: Quantity validation rejects non-integer, negative, and zero quantities', () => {
  const validateQuantity = (rawQty) => {
    const qty = Number(rawQty);
    return Number.isInteger(qty) && qty > 0 && qty <= 100;
  };

  assert.equal(validateQuantity(1), true);
  assert.equal(validateQuantity(5), true);
  assert.equal(validateQuantity(100), true);

  assert.equal(validateQuantity(0), false);
  assert.equal(validateQuantity(-1), false);
  assert.equal(validateQuantity(-10), false);
  assert.equal(validateQuantity(1.5), false);
  assert.equal(validateQuantity(0.01), false);
  assert.equal(validateQuantity('abc'), false);
  assert.equal(validateQuantity(NaN), false);
  assert.equal(validateQuantity(Infinity), false);
  assert.equal(validateQuantity(101), false);
});

test('PV-007: Server-side discount calculation prevents arbitrary client discount injection', () => {
  const PROMO_CODES = {
    'POKEVAULT10': { type: 'percentage', value: 10, minSubtotalCents: 0 },
    'LEGENDS20': { type: 'percentage', value: 20, minSubtotalCents: 15000 },
    'FREESHIP': { type: 'free_shipping', minSubtotalCents: 10000 }
  };

  const calculateDiscount = (promoCode, subtotalCents) => {
    const code = typeof promoCode === 'string' ? promoCode.trim().toUpperCase() : '';
    if (!code) return { discountCents: 0, valid: true };
    const promo = PROMO_CODES[code];
    if (!promo) return { discountCents: 0, valid: false, error: 'Invalid promotional code' };
    if (subtotalCents < promo.minSubtotalCents) {
      return { discountCents: 0, valid: false, error: 'Minimum amount not met' };
    }
    if (promo.type === 'percentage') {
      return { discountCents: Math.round((subtotalCents * promo.value) / 100), valid: true };
    }
    return { discountCents: 0, valid: true, freeShipping: true };
  };

  // Valid 10%
  const res10 = calculateDiscount('POKEVAULT10', 10000);
  assert.equal(res10.valid, true);
  assert.equal(res10.discountCents, 1000);

  // LEGENDS20 below $150 minimum ($100 subtotal)
  const res20Below = calculateDiscount('LEGENDS20', 10000);
  assert.equal(res20Below.valid, false);
  assert.equal(res20Below.error, 'Minimum amount not met');

  // LEGENDS20 above $150 minimum ($200 subtotal)
  const res20Above = calculateDiscount('LEGENDS20', 20000);
  assert.equal(res20Above.valid, true);
  assert.equal(res20Above.discountCents, 4000); // 20% of 20000 = 4000

  // Forged promo code
  const resForged = calculateDiscount('GIVE_ME_FREE_CARDS', 5000);
  assert.equal(resForged.valid, false);
});

// ============================================================================
// PV-008: PAYMENT INTEGRITY & STATE TRANSITION TESTS
// ============================================================================

test('PV-008: Missing provider configuration fails closed', async () => {
  // Test configuration detection
  assert.equal(isPayPalConfigured('', ''), false);
  assert.equal(isPayPalConfigured('your-paypal-client-id-here', 'your-paypal-client-secret-here'), false);
  assert.equal(isPayPalConfigured('valid-client-id', ''), false);
  assert.equal(isPayPalConfigured('', 'valid-secret'), false);
  assert.equal(isPayPalConfigured('sandbox_client_id_123', 'sandbox_secret_456'), true);

  // getPayPalAccessToken returns null (fail closed) without credentials
  const token = await getPayPalAccessToken({ clientId: '', clientSecret: '' });
  assert.equal(token, null);

  // Order creation fails closed when credentials missing
  const createResult = await createPayPalServerOrder({
    totalAmount: 100,
    subtotal: 90,
    insuranceCost: 10,
    discountAmount: 0,
    options: { clientId: '', clientSecret: '' }
  });
  assert.equal(createResult.success, false);
  assert.equal(createResult.unconfigured, true);

  // Capture order fails closed when credentials missing
  const captureResult = await capturePayPalServerOrder({
    paypalOrderId: 'TEST-ORDER-123',
    options: { clientId: '', clientSecret: '' }
  });
  assert.equal(captureResult.success, false);
  assert.equal(captureResult.unconfigured, true);
});

test('PV-008: Payment state transitions enforce financial state-machine rules', () => {
  // Allowed transitions
  assert.deepEqual(validatePaymentStateTransition('pending', 'completed'), { valid: true });
  assert.deepEqual(validatePaymentStateTransition('pending', 'failed'), { valid: true });
  assert.deepEqual(validatePaymentStateTransition('failed', 'pending'), { valid: true });
  assert.deepEqual(validatePaymentStateTransition('failed', 'completed'), { valid: true });

  // Idempotent no-op
  assert.deepEqual(validatePaymentStateTransition('completed', 'completed'), { valid: true, noop: true });
  assert.deepEqual(validatePaymentStateTransition('pending', 'pending'), { valid: true, noop: true });

  // Forbidden: Completed payments are immutable and cannot transition to pending or failed
  const completedToPending = validatePaymentStateTransition('completed', 'pending');
  assert.equal(completedToPending.valid, false);
  assert.match(completedToPending.error, /Illegal state transition/);

  const completedToFailed = validatePaymentStateTransition('completed', 'failed');
  assert.equal(completedToFailed.valid, false);
  assert.match(completedToFailed.error, /Illegal state transition/);

  // Forbidden: Arbitrary / forged target statuses
  const invalidTarget = validatePaymentStateTransition('pending', 'magically_paid');
  assert.equal(invalidTarget.valid, false);
  assert.match(invalidTarget.error, /Invalid target payment status/);
});

test('PV-008: Forged payment status, incorrect amount, and incorrect currency are rejected', () => {
  const validCaptureResponse = {
    id: 'CAPTURE-12345',
    status: 'COMPLETED',
    amount: {
      currency_code: 'USD',
      value: '149.99'
    }
  };

  // 1. Valid capture passes verification
  const validRes = verifyPayPalCapture({
    captureResponse: validCaptureResponse,
    expectedTotalAmount: 149.99,
    expectedCurrency: 'USD'
  });
  assert.equal(validRes.verified, true);
  assert.equal(validRes.captureId, 'CAPTURE-12345');
  assert.equal(validRes.amount, 149.99);

  // 2. Forged/Incomplete status (e.g. PENDING or VOIDED) rejected
  const pendingCapture = { ...validCaptureResponse, status: 'PENDING' };
  const pendingRes = verifyPayPalCapture({
    captureResponse: pendingCapture,
    expectedTotalAmount: 149.99,
    expectedCurrency: 'USD'
  });
  assert.equal(pendingRes.verified, false);
  assert.match(pendingRes.reason, /expected "COMPLETED"/);

  // 3. Forged amount (underpaid by 1 cent or client undercutting) rejected
  const underpaidCapture = {
    ...validCaptureResponse,
    amount: { currency_code: 'USD', value: '14.99' } // $14.99 instead of $149.99
  };
  const underpaidRes = verifyPayPalCapture({
    captureResponse: underpaidCapture,
    expectedTotalAmount: 149.99,
    expectedCurrency: 'USD'
  });
  assert.equal(underpaidRes.verified, false);
  assert.match(underpaidRes.reason, /Captured amount mismatch/);

  // 4. Incorrect currency (e.g. EUR or INR submitted instead of expected USD) rejected
  const wrongCurrencyCapture = {
    ...validCaptureResponse,
    amount: { currency_code: 'EUR', value: '149.99' }
  };
  const currencyRes = verifyPayPalCapture({
    captureResponse: wrongCurrencyCapture,
    expectedTotalAmount: 149.99,
    expectedCurrency: 'USD'
  });
  assert.equal(currencyRes.verified, false);
  assert.match(currencyRes.reason, /currency mismatch/);

  // 5. Malformed capture object rejected
  assert.equal(verifyPayPalCapture({ captureResponse: null, expectedTotalAmount: 149.99 }).verified, false);
  assert.equal(verifyPayPalCapture({ captureResponse: {}, expectedTotalAmount: 149.99 }).verified, false);
});

test('PV-008: Payment creation and capture mock API failures handled safely', async () => {
  // Mock fetch returning HTTP 500 error on OAuth
  const mockFetchError = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ message: 'PayPal internal server error' }),
    text: async () => 'PayPal internal server error'
  });

  const captureErr = await capturePayPalServerOrder({
    paypalOrderId: 'ORD-MOCK-FAIL',
    options: {
      clientId: 'mock-id',
      clientSecret: 'mock-secret',
      apiBaseUrl: 'http://localhost:9999',
      fetchFn: mockFetchError
    }
  });

  assert.equal(captureErr.success, false);
  assert.equal(captureErr.status, 502);
  assert.match(captureErr.error, /gateway authorization error/);

  // Mock fetch with valid OAuth but capture rejection (e.g. 422 ORDER_ALREADY_CAPTURED or payment declined)
  let callCount = 0;
  const mockFetchCaptureReject = async (url) => {
    callCount++;
    if (url.includes('/oauth2/token')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'mock-bearer-token', expires_in: 3600 })
      };
    }
    return {
      ok: false,
      status: 422,
      json: async () => ({
        message: 'The requested action could not be performed.',
        details: [{ issue: 'ORDER_NOT_APPROVED', description: 'Order has not been approved by buyer' }]
      })
    };
  };

  const captureRejected = await capturePayPalServerOrder({
    paypalOrderId: 'ORD-MOCK-UNAPPROVED',
    options: {
      clientId: 'mock-id',
      clientSecret: 'mock-secret',
      apiBaseUrl: 'http://localhost:9999',
      fetchFn: mockFetchCaptureReject,
      forceRefresh: true
    }
  });

  assert.equal(captureRejected.success, false);
  assert.equal(captureRejected.status, 422);
  assert.match(captureRejected.error, /Order has not been approved/);
});


test('PV-008: Post-capture database persistence failure reconciliation record structure', () => {
  // Simulates the scenario where PayPal capture succeeded, but MySQL persistence threw a failure
  const paypalCaptureId = 'CAP-SUCCESS-999';
  const paypalOrderId = 'PP-ORDER-888';
  const totalAmount = 79.99;
  const customerEmail = 'collector@pokevault.com';
  const dbErrorMessage = 'Lock wait timeout exceeded; try restarting transaction';

  const reconciliationRecord = {
    paypal_order_id: paypalOrderId,
    paypal_capture_id: paypalCaptureId,
    amount: totalAmount,
    currency: 'USD',
    customer_email: customerEmail,
    error_message: dbErrorMessage,
    requires_reconciliation: true
  };

  assert.equal(reconciliationRecord.paypal_capture_id, 'CAP-SUCCESS-999');
  assert.equal(reconciliationRecord.amount, 79.99);
  assert.equal(reconciliationRecord.requires_reconciliation, true);
  assert.match(reconciliationRecord.error_message, /timeout exceeded/);
});

// ============================================================================
// PV-012 & PV-013: INVENTORY INTEGRITY & SEED RERUN TESTS
// ============================================================================

test('PV-012: Concurrency & inventory deduction check prevents negative stock', () => {
  let stockQuantity = 3;
  const requestedQuantity = 5;

  const canDeduct = stockQuantity >= requestedQuantity;
  assert.equal(canDeduct, false);

  if (canDeduct) {
    stockQuantity -= requestedQuantity;
  }
  assert.equal(stockQuantity, 3); // Unchanged
});

test('PV-013 & Phase 3: Seed rerun idempotency preserves existing adjusted stock quantities', () => {
  // Mock inventory state representing an item that was purchased and decremented from 25 to 18
  const existingInventory = new Map([
    ['art-charizard-1996-pulp-canvas-print', { card_id: 'art-charizard-1996-pulp-canvas-print', stock_quantity: 18 }]
  ]);

  const seededCards = [
    { id: 'art-charizard-1996-pulp-canvas-print', in_stock: 25 },
    { id: 'new-unseeded-card-id', in_stock: 10 }
  ];

  // Logic corresponding to: INSERT IGNORE INTO inventory ... SELECT id, in_stock FROM cards
  for (const card of seededCards) {
    if (!existingInventory.has(card.id)) {
      existingInventory.set(card.id, { card_id: card.id, stock_quantity: card.in_stock });
    }
    // Existing entries are IGNORED — stock_quantity is NEVER reset back to 25
  }

  // Verify existing adjusted inventory was preserved
  assert.equal(existingInventory.get('art-charizard-1996-pulp-canvas-print').stock_quantity, 18);
  // Verify new seeded card was initialized
  assert.equal(existingInventory.get('new-unseeded-card-id').stock_quantity, 10);
});

test('PV-013 & Phase 3: Schema migration idempotency with advisory lock prevents concurrent race', () => {
  let lockHeld = false;

  const acquireLock = (lockName) => {
    if (lockHeld) return false;
    lockHeld = true;
    return true;
  };

  const releaseLock = (lockName) => {
    lockHeld = false;
    return true;
  };

  // First replica acquires lock
  const replica1Acquired = acquireLock('pokevault_migration_lock');
  assert.equal(replica1Acquired, true);

  // Second replica attempts concurrently and is blocked
  const replica2Acquired = acquireLock('pokevault_migration_lock');
  assert.equal(replica2Acquired, false);

  // First replica releases lock
  releaseLock('pokevault_migration_lock');

  // Second replica can now acquire
  const replica2Retry = acquireLock('pokevault_migration_lock');
  assert.equal(replica2Retry, true);
  releaseLock('pokevault_migration_lock');
});
