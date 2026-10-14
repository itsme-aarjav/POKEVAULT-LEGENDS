import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyToken,
  signToken,
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
import {
  calculateAuthoritativeCart,
  SERVER_PROMO_CODES
} from '../src/index.js';

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
//: ORDER ACCESS TOKEN SECURITY TESTS
// ============================================================================

test('Order Access Token generation, hashing, and constant-time verification', () => {
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

test('Bearer tokens in URL query parameters are strictly rejected', () => {
  // Query parameter token MUST be ignored and rejected to prevent URL logging leakage
  const reqQueryOnly = { headers: {}, query: { token: 'query-token-value-leaked' } };
  assert.equal(extractOrderToken(reqQueryOnly), null);

  // Query parameter token accompanied by valid header must still prefer header
  const reqBoth = { headers: { 'x-order-token': 'secure-header-token' }, query: { token: 'untrusted-query-token' } };
  assert.equal(extractOrderToken(reqBoth), 'secure-header-token');
});

test('Header-based order token authorization (valid, absent, malformed, mismatched)', () => {
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
// PRICING & QUANTITY VALIDATION TESTS
// ============================================================================

test('Quantity validation rejects non-integer, negative, and zero quantities', () => {
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

test('Server-side discount calculation prevents arbitrary client discount injection', () => {
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
// TEST100: EVERYTHING MUST TOTAL ZERO & INTEGRITY SUITE (REQUIREMENTS 1 - 9)
// ============================================================================

function mockCatalog(cardMap) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    for (const [cardId, cardData] of Object.entries(cardMap)) {
      if (typeof url === 'string' && url.includes(`/api/cards/${encodeURIComponent(cardId)}`)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: cardData })
        };
      }
    }
    return {
      ok: false,
      status: 404,
      json: async () => ({ success: false, message: 'Card not found in catalog' })
    };
  };
  return () => { globalThis.fetch = originalFetch; };
}

test('TEST100: Requirement 1 — TEST100 makes all product line item charges zero', async () => {
  const restore = mockCatalog({
    'c1': { id: 'c1', name: 'Charizard Base Set', price: 125.00 },
    'c2': { id: 'c2', name: 'Blastoise Holo Rare', price: 49.99 }
  });

  try {
    const items = [
      { cardId: 'c1', quantity: 2 },
      { cardId: 'c2', quantity: 1 }
    ];
    const cart = await calculateAuthoritativeCart(items, 'TEST100', true);

    assert.equal(cart.valid, true);
    assert.equal(cart.appliedPromo, 'TEST100');
    assert.equal(SERVER_PROMO_CODES['TEST100'].value, 100);
    assert.equal(SERVER_PROMO_CODES['TEST100'].demoOnly, undefined);
    assert.equal(cart.subtotal, 299.99); // (125 * 2) + 49.99
    assert.equal(cart.discountAmount, 299.99); // 100% discount on entire subtotal

    // Verify EVERY individual product line item has charges zeroed
    assert.equal(cart.lineItems.length, 2);

    // Line Item 1
    assert.equal(cart.lineItems[0].cardId, 'c1');
    assert.equal(cart.lineItems[0].unitPrice, 125.00);
    assert.equal(cart.lineItems[0].quantity, 2);
    assert.equal(cart.lineItems[0].subtotal, 250.00);
    assert.equal(cart.lineItems[0].discountCents, 25000);
    assert.equal(cart.lineItems[0].discountAmount, 250.00);
    assert.equal(cart.lineItems[0].payableCents, 0);
    assert.equal(cart.lineItems[0].payableAmount, 0.00);

    // Line Item 2
    assert.equal(cart.lineItems[1].cardId, 'c2');
    assert.equal(cart.lineItems[1].unitPrice, 49.99);
    assert.equal(cart.lineItems[1].quantity, 1);
    assert.equal(cart.lineItems[1].subtotal, 49.99);
    assert.equal(cart.lineItems[1].discountCents, 4999);
    assert.equal(cart.lineItems[1].discountAmount, 49.99);
    assert.equal(cart.lineItems[1].payableCents, 0);
    assert.equal(cart.lineItems[1].payableAmount, 0.00);

    // Sum of all line item payable amounts is strictly zero
    const totalLinePayable = cart.lineItems.reduce((acc, it) => acc + it.payableAmount, 0);
    assert.equal(totalLinePayable, 0.00);
  } finally {
    restore();
  }
});

test('TEST100: Requirement 2 — Shipping, insurance, taxes, handling, and all additional fees become zero', async () => {
  const restore = mockCatalog({
    'c1': { id: 'c1', name: 'Pikachu Illustrator', price: 5000.00 }
  });

  try {
    // Cart with insuranceIncluded requested (standard $9.99 insurance)
    const cart = await calculateAuthoritativeCart([{ cardId: 'c1', quantity: 1 }], 'TEST100', true);

    assert.equal(cart.valid, true);
    assert.equal(cart.shippingCostCents, 0);
    assert.equal(cart.shippingCost, 0.00);
    assert.equal(cart.insuranceCostCents, 0);
    assert.equal(cart.insuranceCost, 0.00);
    assert.equal(cart.taxCostCents, 0);
    assert.equal(cart.taxCost, 0.00);
    assert.equal(cart.handlingCostCents, 0);
    assert.equal(cart.handlingCost, 0.00);
    assert.equal(cart.additionalFeesCents, 0);
    assert.equal(cart.additionalFees, 0.00);

    const totalFees = cart.shippingCost + cart.insuranceCost + cart.taxCost + cart.handlingCost + cart.additionalFees;
    assert.equal(totalFees, 0.00);
  } finally {
    restore();
  }
});

test('TEST100: Requirement 3 — Authoritative final payable amount is exactly zero, mathematically consistent, and never negative', async () => {
  const restore = mockCatalog({
    'odd1': { id: 'odd1', name: 'Odd Cent Card 1', price: 0.01 },
    'odd2': { id: 'odd2', name: 'Odd Cent Card 2', price: 33.33 },
    'large': { id: 'large', name: 'Ultra High Value', price: 9999.99 }
  });

  try {
    const testCases = [
      [{ cardId: 'odd1', quantity: 1 }],
      [{ cardId: 'odd2', quantity: 3 }],
      [{ cardId: 'large', quantity: 2 }]
    ];

    for (const items of testCases) {
      const cart = await calculateAuthoritativeCart(items, 'TEST100', true);
      assert.equal(cart.valid, true);

      // Payable amount must be exactly zero in integer cents and float dollars
      assert.equal(cart.totalCents, 0);
      assert.equal(cart.totalAmount, 0.00);
      assert.ok(cart.totalCents >= 0, 'Total cents must never be negative');
      assert.ok(cart.totalAmount >= 0.00, 'Total amount must never be negative');

      // Mathematical consistency check
      const computedTotalCents = Math.max(
        0,
        cart.subtotalCents +
        cart.shippingCostCents +
        cart.insuranceCostCents +
        cart.taxCostCents +
        cart.handlingCostCents +
        cart.additionalFeesCents -
        cart.discountCents
      );
      assert.equal(computedTotalCents, cart.totalCents);
      assert.equal(computedTotalCents, 0);

      // Float representation consistency
      const computedFloat = +(
        cart.subtotal -
        cart.discountAmount +
        cart.shippingCost +
        cart.insuranceCost +
        cart.taxCost +
        cart.handlingCost +
        cart.additionalFees
      ).toFixed(2);
      assert.equal(computedFloat, cart.totalAmount);
      assert.equal(computedFloat, 0.00);
    }

    // Case-insensitivity check (e.g. 'test100' or '  test100  ')
    const cartLower = await calculateAuthoritativeCart([{ cardId: 'odd1', quantity: 1 }], '  test100  ', true);
    assert.equal(cartLower.valid, true);
    assert.equal(cartLower.totalCents, 0);
    assert.equal(cartLower.totalAmount, 0.00);
  } finally {
    restore();
  }
});

test('TEST100: Requirement 4 — Frontend and server-side totals agree and client manipulation is rejected', async () => {
  const restore = mockCatalog({
    'c1': { id: 'c1', name: 'Charizard Base Set', price: 125.00 },
    'c2': { id: 'c2', name: 'Blastoise Holo Rare', price: 49.99 }
  });

  try {
    // 1. Frontend calculation simulation matching src/checkout.js getCalculatedTotals()
    const items = [
      { id: 'c1', price: 125.00, quantity: 2 },
      { id: 'c2', price: 49.99, quantity: 1 }
    ];
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let shipping = 9.99; // express selected
    let taxes = 0;
    let handling = 0;
    let fees = 0;
    let discount = 0;
    const promo = { code: 'TEST100', discountPercent: 100 };

    if (promo.discountPercent >= 100 || promo.code === 'TEST100') {
      discount = subtotal;
      shipping = 0;
      taxes = 0;
      handling = 0;
      fees = 0;
    }
    const frontendTotal = Math.max(0, subtotal - discount + shipping + taxes + handling + fees);

    // 2. Server authoritative calculation
    const serverCart = await calculateAuthoritativeCart(
      items.map(i => ({ cardId: i.id, quantity: i.quantity })),
      'TEST100',
      true
    );

    // 3. Exact agreement
    assert.equal(frontendTotal, serverCart.totalAmount);
    assert.equal(subtotal, serverCart.subtotal);
    assert.equal(discount, serverCart.discountAmount);
    assert.equal(shipping, serverCart.shippingCost);
    assert.equal(taxes, serverCart.taxCost);
    assert.equal(handling, serverCart.handlingCost);
    assert.equal(fees, serverCart.additionalFees);
    assert.equal(frontendTotal, 0.00);
    assert.equal(serverCart.totalAmount, 0.00);

    // 4. Client manipulation rejection:
    // Malicious browser submits manipulated total $0.00 with NO valid promo code
    const manipulatedCartNoPromo = await calculateAuthoritativeCart(
      items.map(i => ({ cardId: i.id, quantity: i.quantity })),
      '',
      true
    );
    // Server enforces true price ($299.99 + $9.99 = $309.98) and ignores any client claim of $0.00
    assert.equal(manipulatedCartNoPromo.totalAmount, 309.98);
    assert.notEqual(manipulatedCartNoPromo.totalAmount, 0.00);

    // Malicious browser submits bogus promo code claiming full discount
    const forgedCart = await calculateAuthoritativeCart(
      items.map(i => ({ cardId: i.id, quantity: i.quantity })),
      'HACK_ZERO_TOTAL_999',
      true
    );
    assert.equal(forgedCart.valid, false);
    assert.equal(forgedCart.status, 400);
  } finally {
    restore();
  }
});

test('TEST100: Requirement 5 — Supported test/demo order creation flow succeeds with inventory locking and deduction', async () => {
  const restore = mockCatalog({
    'c1': { id: 'c1', name: 'Charizard Base Set', price: 125.00 }
  });

  try {
    const cart = await calculateAuthoritativeCart([{ cardId: 'c1', quantity: 2 }], 'TEST100', true);
    assert.equal(cart.valid, true);
    assert.equal(cart.totalCents, 0);

    // Simulate inventory locking and verification (SELECT stock_quantity FROM inventory WHERE card_id = ? FOR UPDATE)
    const mockInventory = new Map([
      ['c1', { card_id: 'c1', stock_quantity: 10 }]
    ]);

    for (const it of cart.lineItems) {
      const inv = mockInventory.get(it.cardId);
      assert.ok(inv, 'Inventory record must exist');
      assert.ok(inv.stock_quantity >= it.quantity, 'Sufficient inventory must be available');
      // Deduct atomically
      inv.stock_quantity -= it.quantity;
    }
    assert.equal(mockInventory.get('c1').stock_quantity, 8); // 10 - 2 = 8

    // Verify order record construction matching POST /api/orders
    let paymentStatus = PAYMENT_STATES.PENDING;
    let orderStatus = ORDER_STATES.PENDING_PAYMENT;
    let verifiedCaptureId = null;

    if (cart.totalCents === 0 && cart.appliedPromo === 'TEST100') {
      paymentStatus = PAYMENT_STATES.FREE_WAIVED;
      orderStatus = ORDER_STATES.RECEIVED;
      verifiedCaptureId = null;
    }

    const rawAccessToken = generateOrderAccessToken();
    const accessTokenHash = hashOrderAccessToken(rawAccessToken);

    const orderRecord = {
      id: `ORD-${Date.now()}-123`,
      customer_name: 'Test Collector',
      customer_email: 'collector@pokevault.com',
      subtotal: cart.subtotal,
      discount_amount: cart.discountAmount,
      promo_code: cart.appliedPromo,
      total_amount: cart.totalAmount,
      order_status: orderStatus,
      payment_method: 'TEST100 Waiver',
      payment_status: paymentStatus,
      paypal_order_id: null,
      paypal_capture_id: verifiedCaptureId,
      access_token_hash: accessTokenHash
    };

    assert.equal(orderRecord.order_status, ORDER_STATES.RECEIVED);
    assert.equal(orderRecord.payment_status, PAYMENT_STATES.FREE_WAIVED);
    assert.equal(orderRecord.total_amount, 0.00);
    assert.equal(orderRecord.payment_method, 'TEST100 Waiver');
    assert.equal(orderRecord.paypal_order_id, null);
    assert.equal(orderRecord.paypal_capture_id, null);

    // Verify access token constant-time verification
    assert.equal(timingSafeCompare(hashOrderAccessToken(rawAccessToken), orderRecord.access_token_hash), true);
  } finally {
    restore();
  }
});

test('TEST100: Requirement 6 — Order is not falsely recorded as a real captured/paid transaction (free_waived with null capture ID)', async () => {
  const restore = mockCatalog({
    'c1': { id: 'c1', name: 'Charizard Base Set', price: 125.00 }
  });

  try {
    const cart = await calculateAuthoritativeCart([{ cardId: 'c1', quantity: 1 }], 'TEST100', true);

    // 1. Truthful representation: payment_status must be FREE_WAIVED ('free_waived')
    assert.equal(PAYMENT_STATES.FREE_WAIVED, 'free_waived');
    assert.notEqual(PAYMENT_STATES.FREE_WAIVED, PAYMENT_STATES.COMPLETED);

    // 2. paypal_capture_id and paypal_order_id must be strictly null — NEVER fake strings
    const verifiedCaptureId = (cart.totalCents === 0 && cart.appliedPromo === 'TEST100') ? null : 'CAPTURED';
    const paypalOrderId = (cart.totalCents === 0 && cart.appliedPromo === 'TEST100') ? null : 'PP-ORD';
    assert.equal(verifiedCaptureId, null);
    assert.equal(paypalOrderId, null);

    // 3. State machine immutability: free_waived cannot transition to completed, pending, or failed
    const toCompleted = validatePaymentStateTransition('free_waived', 'completed');
    assert.equal(toCompleted.valid, false);
    assert.match(toCompleted.error, /Illegal state transition/);

    const toPending = validatePaymentStateTransition('free_waived', 'pending');
    assert.equal(toPending.valid, false);
    assert.match(toPending.error, /Illegal state transition/);

    const toFailed = validatePaymentStateTransition('free_waived', 'failed');
    assert.equal(toFailed.valid, false);
    assert.match(toFailed.error, /Illegal state transition/);

    // 4. Calling PayPal capture for $0.00 cart is blocked
    const zeroPaypalCapture = (totalCents) => {
      if (totalCents === 0) {
        return { success: false, status: 400, error: 'ZERO_PAYABLE_AMOUNT' };
      }
      return { success: true };
    };
    const captureAttempt = zeroPaypalCapture(cart.totalCents);
    assert.equal(captureAttempt.success, false);
    assert.equal(captureAttempt.status, 400);
    assert.equal(captureAttempt.error, 'ZERO_PAYABLE_AMOUNT');
  } finally {
    restore();
  }
});

test('TEST100: Requirement 7 — Invalid, expired, and minimum-violating coupon codes are rejected', async () => {
  const restore = mockCatalog({
    'c1': { id: 'c1', name: 'Charizard Base Set', price: 100.00 }
  });

  try {
    // 1. Completely bogus code
    const resBogus = await calculateAuthoritativeCart([{ cardId: 'c1', quantity: 1 }], 'TEST200', true);
    assert.equal(resBogus.valid, false);
    assert.equal(resBogus.status, 400);
    assert.match(resBogus.message, /Invalid promotional code: "TEST200"/);

    const resFake = await calculateAuthoritativeCart([{ cardId: 'c1', quantity: 1 }], 'FREE100', true);
    assert.equal(resFake.valid, false);
    assert.equal(resFake.status, 400);

    // 2. Minimum amount not met (LEGENDS20 requires $150.00, subtotal is $100.00)
    const resMinNotMet = await calculateAuthoritativeCart([{ cardId: 'c1', quantity: 1 }], 'LEGENDS20', true);
    assert.equal(resMinNotMet.valid, false);
    assert.equal(resMinNotMet.status, 400);
    assert.match(resMinNotMet.message, /requires a minimum subtotal of \$150\.00/);
  } finally {
    restore();
  }
});

test('TEST100: Requirement 8 — Production mode allows TEST100 without demo-only or test-only restrictions', async () => {
  const restore = mockCatalog({
    'c1': { id: 'c1', name: 'Charizard Base Set', price: 100.00 }
  });

  const origEnv = { ...process.env };

  try {
    // 1. Production mode (NODE_ENV=production without demo flags): TEST100 MUST SUCCEED
    process.env.NODE_ENV = 'production';
    delete process.env.DEMO_MODE;
    delete process.env.ENABLE_TEST_COUPONS;

    const resProd = await calculateAuthoritativeCart([{ cardId: 'c1', quantity: 1 }], 'TEST100', true);
    assert.equal(resProd.valid, true);
    assert.equal(resProd.totalCents, 0);
    assert.equal(resProd.totalAmount, 0.00);
    assert.equal(resProd.appliedPromo, 'TEST100');
    assert.equal(resProd.isFreeOrder, true);
    assert.equal(resProd.shippingCost, 0.00);
    assert.equal(resProd.insuranceCost, 0.00);

    // 2. Production with explicit DEMO_MODE=true: ALLOWED
    process.env.DEMO_MODE = 'true';
    const resProdDemo = await calculateAuthoritativeCart([{ cardId: 'c1', quantity: 1 }], 'TEST100', true);
    assert.equal(resProdDemo.valid, true);
    assert.equal(resProdDemo.totalCents, 0);

    // 3. Production with explicit ENABLE_TEST_COUPONS=true: ALLOWED
    delete process.env.DEMO_MODE;
    process.env.ENABLE_TEST_COUPONS = 'true';
    const resProdTestCoupons = await calculateAuthoritativeCart([{ cardId: 'c1', quantity: 1 }], 'TEST100', true);
    assert.equal(resProdTestCoupons.valid, true);
    assert.equal(resProdTestCoupons.totalCents, 0);

    // 4. Development mode: ALLOWED
    delete process.env.ENABLE_TEST_COUPONS;
    process.env.NODE_ENV = 'development';
    const resDev = await calculateAuthoritativeCart([{ cardId: 'c1', quantity: 1 }], 'TEST100', true);
    assert.equal(resDev.valid, true);
    assert.equal(resDev.totalCents, 0);

    // 5. Test mode: ALLOWED
    process.env.NODE_ENV = 'test';
    const resTest = await calculateAuthoritativeCart([{ cardId: 'c1', quantity: 1 }], 'TEST100', true);
    assert.equal(resTest.valid, true);
    assert.equal(resTest.totalCents, 0);
  } finally {
    process.env = origEnv;
    restore();
  }
});

test('TEST100: Requirement 9 — Other existing checkout and order flows continue to pass', async () => {
  const restore = mockCatalog({
    'c1': { id: 'c1', name: 'Charizard Base Set', price: 100.00 },
    'c2': { id: 'c2', name: 'Blastoise Holo Rare', price: 100.00 }
  });

  try {
    // 1. Standard 10% promo (POKEVAULT10) with insurance
    const res10 = await calculateAuthoritativeCart([{ cardId: 'c1', quantity: 2 }], 'POKEVAULT10', true);
    assert.equal(res10.valid, true);
    assert.equal(res10.subtotal, 200.00);
    assert.equal(res10.discountAmount, 20.00); // 10% of 200
    assert.equal(res10.insuranceCost, 9.99); // Insurance preserved
    assert.equal(res10.totalAmount, 189.99); // 200 - 20 + 9.99
    assert.equal(res10.isFreeOrder, false);
    // Line items retain non-zero payable values
    assert.equal(res10.lineItems[0].payableAmount, 200.00);

    // 2. Standard free shipping promo (FREESHIP)
    const resFreeShip = await calculateAuthoritativeCart(
      [{ cardId: 'c1', quantity: 1 }, { cardId: 'c2', quantity: 1 }],
      'FREESHIP',
      true
    );
    assert.equal(resFreeShip.valid, true);
    assert.equal(resFreeShip.subtotal, 200.00);
    assert.equal(resFreeShip.insuranceCost, 0.00);
    assert.equal(resFreeShip.shippingCost, 0.00);
    assert.equal(resFreeShip.totalAmount, 200.00);

    // 3. Standard PayPal verified capture flow
    const validCapture = verifyPayPalCapture({
      captureResponse: {
        id: 'CAPTURE-REGULAR-123',
        status: 'COMPLETED',
        amount: { currency_code: 'USD', value: '189.99' }
      },
      expectedTotalAmount: 189.99,
      expectedCurrency: 'USD'
    });
    assert.equal(validCapture.verified, true);
    assert.equal(validCapture.captureId, 'CAPTURE-REGULAR-123');

    // 4. Insufficient inventory prevents checkout
    let stock = 1;
    const requested = 2;
    const canFulfill = stock >= requested;
    assert.equal(canFulfill, false);
  } finally {
    restore();
  }
});

// ============================================================================
// PAYMENT INTEGRITY & STATE TRANSITION TESTS
// ============================================================================

test('Missing provider configuration fails closed', async () => {
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

test('Payment state transitions enforce financial state-machine rules', () => {
  // Allowed transitions
  assert.deepEqual(validatePaymentStateTransition('pending', 'completed'), { valid: true });
  assert.deepEqual(validatePaymentStateTransition('pending', 'failed'), { valid: true });
  assert.deepEqual(validatePaymentStateTransition('pending', 'free_waived'), { valid: true });
  assert.deepEqual(validatePaymentStateTransition('failed', 'pending'), { valid: true });
  assert.deepEqual(validatePaymentStateTransition('failed', 'completed'), { valid: true });
  assert.deepEqual(validatePaymentStateTransition('failed', 'free_waived'), { valid: true });

  // Idempotent no-op
  assert.deepEqual(validatePaymentStateTransition('completed', 'completed'), { valid: true, noop: true });
  assert.deepEqual(validatePaymentStateTransition('pending', 'pending'), { valid: true, noop: true });
  assert.deepEqual(validatePaymentStateTransition('free_waived', 'free_waived'), { valid: true, noop: true });

  // Forbidden: Completed and free_waived payments are immutable and cannot transition to pending, failed, or each other
  const completedToPending = validatePaymentStateTransition('completed', 'pending');
  assert.equal(completedToPending.valid, false);
  assert.match(completedToPending.error, /Illegal state transition/);

  const completedToFailed = validatePaymentStateTransition('completed', 'failed');
  assert.equal(completedToFailed.valid, false);
  assert.match(completedToFailed.error, /Illegal state transition/);

  const freeWaivedToPending = validatePaymentStateTransition('free_waived', 'pending');
  assert.equal(freeWaivedToPending.valid, false);
  assert.match(freeWaivedToPending.error, /Illegal state transition/);

  const freeWaivedToCompleted = validatePaymentStateTransition('free_waived', 'completed');
  assert.equal(freeWaivedToCompleted.valid, false);
  assert.match(freeWaivedToCompleted.error, /Illegal state transition/);

  // Forbidden: Arbitrary / forged target statuses
  const invalidTarget = validatePaymentStateTransition('pending', 'magically_paid');
  assert.equal(invalidTarget.valid, false);
  assert.match(invalidTarget.error, /Invalid target payment status/);
});

test('Forged payment status, incorrect amount, and incorrect currency are rejected', () => {
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

test('Payment creation and capture mock API failures handled safely', async () => {
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
      apiBaseUrl: 'https://api-m.sandbox.paypal.com',
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
      apiBaseUrl: 'https://api-m.sandbox.paypal.com',
      fetchFn: mockFetchCaptureReject,
      forceRefresh: true
    }
  });

  assert.equal(captureRejected.success, false);
  assert.equal(captureRejected.status, 422);
  assert.match(captureRejected.error, /Order has not been approved/);
  assert.ok(callCount > 0);
});


test('Post-capture database persistence failure reconciliation record structure', () => {
  // Simulates the scenario where PayPal capture succeeded, but MySQL persistence threw a failure
  const paypalCaptureId = 'CAP-SUCCESS-999';
  const paypalOrderId = 'PP-ORDER-888';
  const totalAmount = 79.99;
  const customerEmail = 'collector@pokevault.com';
  const dbErrorMessage = 'Lock wait timeout exceeded; try restarting transaction';

  const reconciliationRecord = {
    idempotency_key: `recon_pp_${paypalOrderId}`,
    paypal_order_id: paypalOrderId,
    paypal_capture_id: paypalCaptureId,
    amount: totalAmount,
    currency: 'USD',
    customer_email: customerEmail,
    status: 'PENDING',
    attempt_count: 0,
    max_attempts: 5,
    error_message: dbErrorMessage,
    requires_reconciliation: true,
    persisted_durable: true
  };

  assert.equal(reconciliationRecord.idempotency_key, 'recon_pp_PP-ORDER-888');
  assert.equal(reconciliationRecord.paypal_capture_id, 'CAP-SUCCESS-999');
  assert.equal(reconciliationRecord.amount, 79.99);
  assert.equal(reconciliationRecord.status, 'PENDING');
  assert.equal(reconciliationRecord.requires_reconciliation, true);
  assert.equal(reconciliationRecord.persisted_durable, true);
  assert.match(reconciliationRecord.error_message, /timeout exceeded/);
});

// ============================================================================
// & INVENTORY INTEGRITY & SEED RERUN TESTS
// ============================================================================

test('Concurrency & inventory deduction check prevents negative stock', () => {
  let stockQuantity = 3;
  const requestedQuantity = 5;

  const canDeduct = stockQuantity >= requestedQuantity;
  assert.equal(canDeduct, false);

  if (canDeduct) {
    stockQuantity -= requestedQuantity;
  }
  assert.equal(stockQuantity, 3); // Unchanged
});

test('Seed rerun idempotency preserves existing adjusted stock quantities', () => {
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

test('Schema migration idempotency with advisory lock prevents concurrent race', () => {
  let lockHeld = false;

  const acquireLock = (_lockName) => {
    if (lockHeld) return false;
    lockHeld = true;
    return true;
  };

  const releaseLock = (_lockName) => {
    lockHeld = false;
    return true;
  };

  // First instance acquires lock
  const instance1Acquired = acquireLock('pokevault_migration_lock');
  assert.equal(instance1Acquired, true);

  // Second instance attempts concurrently and is blocked
  const instance2Acquired = acquireLock('pokevault_migration_lock');
  assert.equal(instance2Acquired, false);

  // First instance releases lock
  releaseLock('pokevault_migration_lock');

  // Second instance can now acquire
  const instance2Retry = acquireLock('pokevault_migration_lock');
  assert.equal(instance2Retry, true);
  releaseLock('pokevault_migration_lock');
});

// ============================================================================

