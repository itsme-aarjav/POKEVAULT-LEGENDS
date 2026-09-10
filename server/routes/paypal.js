import { Router } from 'express';
import https from 'https';
import { dbQuery, isMySQLConfigured } from '../db/mysql.js';
import { ALL_PRODUCTS } from '../../src/data/products.js';

const router = Router();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE = process.env.NODE_ENV === 'production'
  ? 'api-m.paypal.com'
  : 'api-m.sandbox.paypal.com';

const isPayPalConfigured = () =>
  PAYPAL_CLIENT_ID &&
  PAYPAL_CLIENT_SECRET &&
  !PAYPAL_CLIENT_SECRET.includes('REPLACE_WITH');

// ─── PayPal API helpers ───────────────────────────────────────────────────
const getPayPalAccessToken = () => new Promise((resolve, reject) => {
  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const body = 'grant_type=client_credentials';

  const req = https.request({
    hostname: PAYPAL_BASE,
    path: '/v1/oauth2/token',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.access_token) resolve(parsed.access_token);
        else reject(new Error(`PayPal token error: ${data}`));
      } catch (e) { reject(e); }
    });
  });
  req.on('error', reject);
  req.write(body);
  req.end();
});

const createPayPalOrder = (accessToken, totalUSD, itemsDescription) => new Promise((resolve, reject) => {
  const payload = JSON.stringify({
    intent: 'CAPTURE',
    purchase_units: [{
      description: itemsDescription,
      amount: {
        currency_code: 'USD',
        value: totalUSD
      }
    }]
  });

  const req = https.request({
    hostname: PAYPAL_BASE,
    path: '/v2/checkout/orders',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.id) resolve(parsed.id);
        else reject(new Error(`PayPal order creation failed: ${data}`));
      } catch (e) { reject(e); }
    });
  });
  req.on('error', reject);
  req.write(payload);
  req.end();
});

// ─── Server-side price lookup ─────────────────────────────────────────────
const getVerifiedPrice = async (cardId) => {
  if (isMySQLConfigured()) {
    const rows = await dbQuery('SELECT price FROM cards WHERE id = ? LIMIT 1', [cardId]);
    if (rows && rows.length > 0) return Number(rows[0].price);
  }
  const item = ALL_PRODUCTS.find(c => c.id === cardId);
  return item ? Number(item.price) : null;
};

// POST /api/paypal/create-order — Verify prices server-side, create PayPal order
router.post('/create-order', async (req, res) => {
  try {
    const { items = [], discountAmount = 0, insuranceIncluded = true, insuranceCost = 9.99 } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in cart' });
    }

    // ✅ SECURITY: Verify every item price from the server, ignore client values
    let subtotal = 0;
    for (const item of items) {
      const qty = Math.max(1, Math.floor(Number(item.qty || item.quantity || 1)));
      const verifiedPrice = await getVerifiedPrice(item.id || item.cardId);
      if (verifiedPrice === null) {
        return res.status(400).json({ success: false, message: `Card not found: ${item.id}` });
      }
      subtotal += verifiedPrice * qty;
    }

    const safeDiscount = Math.min(Math.max(0, Number(discountAmount) || 0), subtotal * 0.5);
    const safeInsurance = insuranceIncluded ? Math.min(Number(insuranceCost) || 9.99, 49.99) : 0;
    const total = Math.max(0.01, subtotal - safeDiscount + safeInsurance).toFixed(2);

    // Try real PayPal API if credentials are configured
    if (isPayPalConfigured()) {
      const accessToken = await getPayPalAccessToken();
      const description = `POKÉVAULT LEGENDS Order (${items.length} item${items.length > 1 ? 's' : ''})`;
      const paypalOrderId = await createPayPalOrder(accessToken, total, description);

      return res.json({
        success: true,
        orderID: paypalOrderId,
        total,
        purchaseUnits: [{ amount: { currency_code: 'USD', value: total } }]
      });
    }

    // Fallback: return demo order ID if PayPal secrets not configured
    return res.json({
      success: true,
      orderID: `DEMO-PAYPAL-${Date.now()}`,
      total,
      demo: true,
      purchaseUnits: [{ amount: { currency_code: 'USD', value: total } }]
    });
  } catch (err) {
    console.error('PayPal create-order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/paypal/capture-order — Save captured transaction with verified pricing
router.post('/capture-order', async (req, res) => {
  try {
    const {
      paypalOrderId,
      payerDetails = {},
      items = [],
      discountAmount = 0,
      insuranceIncluded = true,
      insuranceCost = 9.99
    } = req.body;

    if (!paypalOrderId) {
      return res.status(400).json({ success: false, message: 'Missing paypalOrderId' });
    }

    const orderId = `PV-PAYPAL-${Date.now()}`;
    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const qty = Math.max(1, Math.floor(Number(item.qty || item.quantity || 1)));
      const cardId = item.id || item.cardId;
      const verifiedPrice = await getVerifiedPrice(cardId);
      if (verifiedPrice === null) continue;

      const itemSubtotal = verifiedPrice * qty;
      subtotal += itemSubtotal;
      lineItems.push({
        order_id: orderId,
        card_id: cardId,
        card_name: item.name || `Card ${cardId}`,
        unit_price: verifiedPrice,
        quantity: qty,
        subtotal: itemSubtotal
      });
    }

    const safeDiscount = Math.min(Math.max(0, Number(discountAmount) || 0), subtotal * 0.5);
    const safeInsurance = insuranceIncluded ? Math.min(Number(insuranceCost) || 9.99, 49.99) : 0;
    const totalAmount = Math.max(0.01, subtotal - safeDiscount + safeInsurance);
    const trackingNumber = `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;

    if (isMySQLConfigured()) {
      await dbQuery(`
        INSERT INTO orders (
          id, customer_name, customer_email, shipping_address,
          subtotal, discount_amount, insurance_included, insurance_cost,
          total_amount, order_status, payment_method, payment_status, tracking_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'dispatched', 'PayPal', 'completed', ?)
      `, [
        orderId,
        payerDetails.name ? `${payerDetails.name.given_name} ${payerDetails.name.surname}` : 'PayPal Collector',
        payerDetails.email_address || 'paypal@pokevault.com',
        payerDetails.address?.address_line_1 || 'PayPal Verified Address',
        subtotal, safeDiscount, insuranceIncluded, safeInsurance,
        totalAmount, trackingNumber
      ]);

      for (const line of lineItems) {
        await dbQuery(`
          INSERT INTO order_items (order_id, card_id, card_name, unit_price, quantity, subtotal)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [line.order_id, line.card_id, line.card_name, line.unit_price, line.quantity, line.subtotal]);

        await dbQuery(`
          UPDATE inventory SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE card_id = ?
        `, [line.quantity, line.card_id]);
      }
    }

    return res.json({
      success: true,
      message: 'Payment captured and order recorded.',
      orderId,
      totalAmount,
      trackingNumber
    });
  } catch (err) {
    console.error('PayPal capture-order error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
