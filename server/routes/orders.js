import { Router } from 'express';
import { dbQuery, isMySQLConfigured, pool } from '../db/mysql.js';
import { ALL_PRODUCTS } from '../../src/data/products.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// In-memory store for orders when running in offline/demo mode
const memoryOrders = [];

// ─── Server-side verified price lookup ─────────────────────────────────────
// SECURITY: Never trust client-sent prices. Always look up the real price
// from the authoritative source (MySQL database or master ALL_PRODUCTS catalog).
const getVerifiedPrice = async (cardId) => {
  if (isMySQLConfigured()) {
    const rows = await dbQuery('SELECT price FROM cards WHERE id = ? LIMIT 1', [cardId]);
    if (rows && rows.length > 0) return Number(rows[0].price);
  }
  const item = ALL_PRODUCTS.find(c => c.id === cardId);
  return item ? Number(item.price) : null;
};

// POST /api/orders — Create a new customer order with verified pricing
router.post('/', async (req, res) => {
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

    // Cap insurance cost to expected value to prevent manipulation
    const safeInsuranceCost = Math.min(Number(insuranceCost) || 9.99, 49.99);
    const safeDiscountAmount = Math.max(0, Number(discountAmount) || 0);
    const orderId = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const qty = Math.max(1, Math.floor(Number(item.qty || item.quantity || 1)));
      const cardId = item.id || item.cardId;

      // ✅ SECURITY: Look up real price server-side, ignore client-sent price
      const verifiedPrice = await getVerifiedPrice(cardId);
      if (verifiedPrice === null) {
        return res.status(400).json({ success: false, message: `Card not found: ${cardId}` });
      }
      if (verifiedPrice <= 0) {
        return res.status(400).json({ success: false, message: `Invalid price for card: ${cardId}` });
      }

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

    // Cap discount to at most 50% of subtotal (fraud prevention)
    const cappedDiscount = Math.min(safeDiscountAmount, subtotal * 0.5);
    const totalAmount = Math.max(0.01, subtotal - cappedDiscount + (insuranceIncluded ? safeInsuranceCost : 0));
    const trackingNumber = `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;

    if (isMySQLConfigured() && pool) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // 1. Insert order header
        await conn.query(`
          INSERT INTO orders (
            id, customer_name, customer_email, shipping_address,
            subtotal, discount_amount, promo_code, insurance_included,
            insurance_cost, total_amount, order_status, payment_method,
            payment_status, tracking_number
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dispatched', 'PayPal', 'completed', ?)
        `, [
          orderId, customerName, customerEmail, shippingAddress,
          subtotal, cappedDiscount, promoCode, insuranceIncluded,
          safeInsuranceCost, totalAmount, trackingNumber
        ]);

        // 2. Insert order items & decrement stock
        for (const line of lineItems) {
          await conn.query(`
            INSERT INTO order_items (order_id, card_id, card_name, unit_price, quantity, subtotal)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [line.order_id, line.card_id, line.card_name, line.unit_price, line.quantity, line.subtotal]);

          await conn.query(`
            UPDATE inventory
            SET stock_quantity = GREATEST(0, stock_quantity - ?),
                updated_at = CURRENT_TIMESTAMP
            WHERE card_id = ?
          `, [line.quantity, line.card_id]);

          await conn.query(`
            UPDATE cards
            SET in_stock = GREATEST(0, in_stock - ?)
            WHERE id = ?
          `, [line.quantity, line.card_id]);
        }

        await conn.commit();
        conn.release();

        const [savedOrder] = await dbQuery('SELECT * FROM orders WHERE id = ?', [orderId]);

        return res.status(201).json({
          success: true,
          message: '★ ORDER DISPATCHED! Saved to MySQL database & inventory updated.',
          orderId,
          totalAmount,
          data: savedOrder,
          source: 'mysql'
        });
      } catch (txnError) {
        await conn.rollback();
        conn.release();
        throw txnError;
      }
    }

    // Local In-Memory Fallback
    const orderRecord = {
      id: orderId,
      customerName,
      customerEmail,
      shippingAddress,
      subtotal,
      discountAmount: cappedDiscount,
      promoCode,
      insuranceIncluded,
      insuranceCost: safeInsuranceCost,
      totalAmount,
      orderStatus: 'dispatched',
      paymentMethod: 'PayPal',
      paymentStatus: 'completed',
      trackingNumber,
      items: lineItems,
      createdAt: new Date().toISOString()
    };

    memoryOrders.unshift(orderRecord);
    return res.status(201).json({
      success: true,
      message: '★ ORDER DISPATCHED!',
      orderId,
      totalAmount,
      data: orderRecord,
      source: 'local'
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orders — Get all customer orders [ADMIN PROTECTED]
router.get('/', requireAdmin, async (req, res) => {
  try {
    if (isMySQLConfigured()) {
      const orders = await dbQuery('SELECT * FROM orders ORDER BY created_at DESC');
      if (orders && orders.length > 0) {
        for (const o of orders) {
          o.order_items = await dbQuery('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
        }
        return res.json({ success: true, count: orders.length, data: orders, source: 'mysql' });
      }
    }
    return res.json({ success: true, count: memoryOrders.length, data: memoryOrders, source: 'local' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orders/:id — Get order details by ID [ADMIN PROTECTED]
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (isMySQLConfigured()) {
      const orders = await dbQuery('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);
      if (orders && orders.length > 0) {
        const order = orders[0];
        order.order_items = await dbQuery('SELECT * FROM order_items WHERE order_id = ?', [id]);
        return res.json({ success: true, data: order, source: 'mysql' });
      }
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const order = memoryOrders.find(o => o.id === id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: order, source: 'local' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
