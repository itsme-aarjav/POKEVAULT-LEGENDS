import { spawn } from 'child_process';
import assert from 'assert';

console.log('========================================================================');
console.log('TEST 1: Live End-to-End Microservice Runtime & Checkout Flow');
console.log('        Ports 5001 (auth), 5002 (catalog), 5003 (order)');
console.log('========================================================================');

const ENV = {
  ...process.env,
  JWT_SECRET: 'supersecretjwtkey123',
  JWT_SIGNING_SECRET: 'supersecretjwtkey123',
  ADMIN_SECRET_KEY: 'adminpass123',
  DEMO_MODE: 'true',
  CATALOG_SERVICE_URL: 'http://localhost:5002',
  NODE_ENV: 'development'
};

const processes = [];

function startService(name, scriptPath, portEnv) {
  const env = { ...ENV, ...portEnv };
  const proc = spawn('node', [scriptPath], {
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  proc.stdout.on('data', () => {});
  proc.stderr.on('data', (_d) => {
    // console.error(`[${name} stderr]`, _d.toString().trim());
  });

  proc.on('exit', (code, _sig) => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] Exited prematurely with code ${code}`);
    }
  });

  processes.push({ name, proc });
  return proc;
}

async function waitForProbe(url, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function run() {
  try {
    console.log('[1/5] Launching microservices in background...');
    startService('auth-service', './services/auth-service/src/index.js', { PORT: '5001', AUTH_PORT: '5001' });
    startService('catalog-service', './services/catalog-service/src/index.js', { PORT: '5002', CATALOG_PORT: '5002' });
    startService('order-service', './services/order-service/src/index.js', { PORT: '5003', ORDER_PORT: '5003' });

    console.log('[1/5] Waiting for health probes to be ready...');
    await waitForProbe('http://localhost:5001/health');
    await waitForProbe('http://localhost:5002/health');
    await waitForProbe('http://localhost:5003/health');
    console.log('[1/5] All 3 microservices are UP and listening!\n');

    // =========================================================================
    // SUB-TEST 1: Health Probes
    // =========================================================================
    console.log('>>> [SUB-TEST 1] HEALTH PROBES (HTTP 200)');
    for (const port of [5001, 5002, 5003]) {
      const res = await fetch(`http://localhost:${port}/health`);
      const body = await res.json();
      console.log(`HTTP GET http://localhost:${port}/health -> ${res.status} ${res.statusText}`);
      console.log(JSON.stringify(body, null, 2));
      assert.strictEqual(res.status, 200, `Port ${port} /health did not return 200`);
      assert.strictEqual(body.status, 'UP', `Port ${port} status is not UP`);
    }
    console.log('--- SUB-TEST 1 PASSED: All 3 health probes returned HTTP 200 UP ---\n');

    // =========================================================================
    // SUB-TEST 2: Prometheus Metrics
    // =========================================================================
    console.log('>>> [SUB-TEST 2] PROMETHEUS METRICS (HTTP 200 + Prometheus text)');
    for (const port of [5001, 5002, 5003]) {
      const res = await fetch(`http://localhost:${port}/metrics`);
      const text = await res.text();
      console.log(`HTTP GET http://localhost:${port}/metrics -> ${res.status} (${text.split('\n').length} lines)`);
      const sampleLines = text.split('\n').filter(l => l && !l.startsWith('#')).slice(0, 3).join(' | ');
      console.log(`Sample metrics: ${sampleLines}`);
      assert.strictEqual(res.status, 200, `Port ${port} /metrics did not return 200`);
      assert(text.includes('process_uptime_seconds'), `Port ${port} metrics missing process_uptime_seconds`);
      assert(text.includes('http_requests_total'), `Port ${port} metrics missing http_requests_total`);
    }
    console.log('--- SUB-TEST 2 PASSED: All 3 Prometheus metric endpoints valid ---\n');

    // =========================================================================
    // SUB-TEST 3: Admin Auth Flow
    // =========================================================================
    console.log('>>> [SUB-TEST 3] ADMIN AUTH FLOW');
    console.log('POST http://localhost:5001/api/auth/login with {"key":"adminpass123"}');
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'adminpass123' })
    });
    const loginBody = await loginRes.json();
    console.log(`Response [${loginRes.status}]:`, JSON.stringify(loginBody, null, 2));
    assert.strictEqual(loginRes.status, 200);
    assert(loginBody.success, 'Login response not successful');
    assert(loginBody.token, 'Login response missing JWT token');
    const adminToken = loginBody.token;

    console.log(`GET http://localhost:5001/api/auth/verify with Bearer ${adminToken.substring(0, 15)}...`);
    const verifyRes = await fetch('http://localhost:5001/api/auth/verify', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const verifyBody = await verifyRes.json();
    console.log(`Response [${verifyRes.status}]:`, JSON.stringify(verifyBody, null, 2));
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyBody.authorized, true);
    assert.strictEqual(verifyBody.role, 'admin');
    console.log('--- SUB-TEST 3 PASSED: Admin authentication & token verification succeeded ---\n');

    // =========================================================================
    // SUB-TEST 4: Catalog & Search Flow + Admin Mutation Cache Invalidation
    // =========================================================================
    console.log('>>> [SUB-TEST 4] CATALOG, CATEGORIES & CACHE INVALIDATION FLOW');
    console.log('GET http://localhost:5002/api/categories');
    const catRes = await fetch('http://localhost:5002/api/categories');
    const catBody = await catRes.json();
    console.log(`Response [${catRes.status}]: Found ${catBody.count} categories. First category: "${catBody.data[0]?.name}"`);
    assert.strictEqual(catRes.status, 200);
    assert(catBody.count > 0, 'No categories returned');

    console.log('GET http://localhost:5002/api/cards (First query - expect X-Cache: MISS)');
    const cardsRes1 = await fetch('http://localhost:5002/api/cards');
    const xCache1 = cardsRes1.headers.get('x-cache');
    const cardsBody1 = await cardsRes1.json();
    console.log(`Response [${cardsRes1.status}], X-Cache: ${xCache1}, Total items: ${cardsBody1.count}`);
    assert.strictEqual(cardsRes1.status, 200);
    assert(cardsBody1.count > 0, 'No cards returned');
    assert.strictEqual(xCache1, 'MISS');

    const testCard = cardsBody1.data[0];
    console.log(`Extracted test card: ID="${testCard.id}", Name="${testCard.name}", Price=$${testCard.price}`);
    assert(testCard.id, 'Test card has no ID');
    assert(testCard.price !== undefined, 'Test card has no price');

    console.log('GET http://localhost:5002/api/cards (Second query - expect X-Cache: HIT)');
    const cardsRes2 = await fetch('http://localhost:5002/api/cards');
    const xCache2 = cardsRes2.headers.get('x-cache');
    console.log(`Response [${cardsRes2.status}], X-Cache: ${xCache2}`);
    assert.strictEqual(xCache2, 'HIT', 'Second query did not hit memory cache');

    console.log(`PUT http://localhost:5002/api/cards/${testCard.id} (Admin mutation with JWT)`);
    const newPrice = +(Number(testCard.price) + 5).toFixed(2);
    const updateRes = await fetch(`http://localhost:5002/api/cards/${encodeURIComponent(testCard.id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        id: testCard.id,
        name: testCard.name,
        price: newPrice
      })
    });
    const updateBody = await updateRes.json();
    console.log(`Mutation Response [${updateRes.status}]:`, JSON.stringify(updateBody));
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateBody.success, true);

    console.log('GET http://localhost:5002/api/cards (Third query after mutation - expect X-Cache: MISS due to cache invalidation)');
    const cardsRes3 = await fetch('http://localhost:5002/api/cards');
    const xCache3 = cardsRes3.headers.get('x-cache');
    const cardsBody3 = await cardsRes3.json();
    console.log(`Response [${cardsRes3.status}], X-Cache: ${xCache3}`);
    assert.strictEqual(xCache3, 'MISS', 'Admin mutation failed to invalidate the catalog cache');
    const updatedCardInList = cardsBody3.data.find(c => c.id === testCard.id);
    console.log(`Verified updated card in catalog: ID="${updatedCardInList.id}", New Price=$${updatedCardInList.price}`);
    assert.strictEqual(Number(updatedCardInList.price), newPrice);
    console.log('--- SUB-TEST 4 PASSED: Catalog queries, categories & cache invalidation verified ---\n');

    // =========================================================================
    // SUB-TEST 5: Inter-Service Order & Token Flow
    // =========================================================================
    console.log('>>> [SUB-TEST 5] INTER-SERVICE ORDER & ACCESS TOKEN FLOW');
    console.log(`POST http://localhost:5003/api/orders with Card ID "${testCard.id}" & Promo "POKEVAULT10"`);
    const orderPayload = {
      customerName: 'Ash Ketchum',
      customerEmail: 'ash@pallettown.org',
      shippingAddress: '123 Pallet Town Way, Kanto',
      items: [{ id: testCard.id, quantity: 1 }],
      promoCode: 'POKEVAULT10',
      insuranceIncluded: true
    };
    const orderRes = await fetch('http://localhost:5003/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    const orderBody = await orderRes.json();
    console.log(`Response [${orderRes.status}]:`, JSON.stringify(orderBody, null, 2));

    assert(orderRes.status === 200 || orderRes.status === 201, `Order submission failed with status ${orderRes.status}`);
    assert.strictEqual(orderBody.success, true);

    const orderData = orderBody.data;
    assert(orderData.id, 'Order response missing ID');
    const orderId = orderData.id;
    const orderToken = orderData.accessToken || orderData.order_token || orderData.orderToken;
    console.log(`\nCreated Order ID: "${orderId}"`);
    console.log(`Issued Order Access Token: "${orderToken}"`);

    assert(orderToken, 'Order response missing access token');
    assert(orderToken.startsWith('otk_'), `Order access token does not start with "otk_": ${orderToken}`);

    // Verify minor unit pricing mathematics
    console.log('\n--- Verifying Inter-Service Pricing Mathematics ---');
    console.log(`Line item unit price from catalog: $${orderData.items[0]?.unitPrice}`);
    console.log(`Subtotal: $${orderData.subtotal}`);
    console.log(`Applied Promo: "${orderData.promo_code}" (Discount: -$${orderData.discount_amount})`);
    console.log(`Insurance Cost: $${orderData.insurance_cost}`);
    console.log(`Final Total: $${orderData.total_amount}`);

    const expectedDiscount = +(orderData.subtotal * 0.10).toFixed(2);
    assert.strictEqual(Number(orderData.discount_amount), expectedDiscount, '10% discount mismatch');
    const expectedTotal = +(orderData.subtotal - expectedDiscount + Number(orderData.insurance_cost)).toFixed(2);
    assert.strictEqual(Number(orderData.total_amount), expectedTotal, 'Total amount mathematical mismatch');

    // Fetch order receipt using X-Order-Token
    console.log(`\nGET http://localhost:5003/api/orders/${orderId} using Header "X-Order-Token: ${orderToken}"`);
    const receiptRes = await fetch(`http://localhost:5003/api/orders/${encodeURIComponent(orderId)}`, {
      headers: { 'X-Order-Token': orderToken }
    });
    const receiptBody = await receiptRes.json();
    console.log(`Receipt Response [${receiptRes.status}]:`, JSON.stringify(receiptBody, null, 2));

    assert.strictEqual(receiptRes.status, 200, 'Receipt retrieval did not return HTTP 200');
    assert.strictEqual(receiptBody.success, true);
    assert.strictEqual(receiptBody.data.id, orderId);
    assert.strictEqual(receiptBody.data.customer_name, 'Ash Ketchum');
    assert.strictEqual(receiptBody.data.customer_email, 'ash@pallettown.org');
    assert.strictEqual(receiptBody.data.items[0].cardId, testCard.id);

    // Verify negative test: wrong order token is rejected with 403
    console.log('\nNegative Test: Verify request with invalid order token is rejected with HTTP 403 Forbidden');
    const badReceiptRes = await fetch(`http://localhost:5003/api/orders/${encodeURIComponent(orderId)}`, {
      headers: { 'X-Order-Token': 'otk_invalidtoken12345678901234567890123456789012345678901234567890' }
    });
    console.log(`Negative Test Response: [${badReceiptRes.status} ${badReceiptRes.statusText}]`);
    assert.strictEqual(badReceiptRes.status, 403, 'Invalid order token was not rejected with 403');

    console.log('\n--- SUB-TEST 5 PASSED: Inter-service order creation, token generation & receipt lookup verified ---\n');

    console.log('========================================================================');
    console.log('ALL 5 SUB-TESTS IN TEST 1 COMPLETED AND VERIFIED 100% SUCCESSFULLY');
    console.log('========================================================================');
  } finally {
    console.log('\n[CLEANUP] Terminating background microservice processes...');
    for (const { name, proc } of processes) {
      try {
        proc.kill('SIGTERM');
        console.log(`[CLEANUP] Killed ${name} (PID: ${proc.pid})`);
      } catch (e) {
        console.warn(`[CLEANUP] Error killing ${name}:`, e.message);
      }
    }
  }
}

run().catch((err) => {
  console.error('\n[FATAL ERROR IN TEST 1]:', err);
  process.exit(1);
});
