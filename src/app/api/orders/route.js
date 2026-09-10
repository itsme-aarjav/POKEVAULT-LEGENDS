import { dbQuery, isMySQLConfigured } from '../../../../server/db/mysql.js';
import { ALL_PRODUCTS } from '../../../data/products.js';

const memoryOrders = [];

const getVerifiedPrice = async (id) => {
  if (isMySQLConfigured()) {
    const rows = await dbQuery('SELECT price FROM cards WHERE id = ? LIMIT 1', [id]);
    if (rows && rows.length > 0) return Number(rows[0].price);
  }
  const item = ALL_PRODUCTS.find(c => c.id === id);
  return item ? Number(item.price) : null;
};

export async function GET() {
  if (isMySQLConfigured()) {
    try {
      const rows = await dbQuery('SELECT * FROM orders ORDER BY created_at DESC');
      return Response.json({ success: true, count: rows.length, data: rows, source: 'mysql' });
    } catch (e) {
      return Response.json({ success: false, error: e.message }, { status: 500 });
    }
  }
  return Response.json({ success: true, count: memoryOrders.length, data: memoryOrders, source: 'local' });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { items = [], customerName = 'Customer', customerEmail = 'customer@example.com', shippingAddress = '' } = body;

    if (!items.length) {
      return Response.json({ success: false, message: 'Cart items required' }, { status: 400 });
    }

    let subtotal = 0;
    for (const item of items) {
      const price = await getVerifiedPrice(item.id || item.cardId);
      if (price === null) return Response.json({ success: false, message: `Invalid item: ${item.id}` }, { status: 400 });
      subtotal += price * (item.qty || 1);
    }

    const orderId = `ORD-${Date.now()}`;
    const order = { id: orderId, customerName, customerEmail, shippingAddress, subtotal, createdAt: new Date().toISOString() };
    memoryOrders.unshift(order);

    return Response.json({ success: true, orderId, data: order });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
