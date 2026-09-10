import { NextResponse } from 'next/server';
import { ALL_PRODUCTS } from '../../../../data/products.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { items = [], discountAmount = 0, insuranceCost = 9.99 } = body;

    let subtotal = 0;
    for (const item of items) {
      const prod = ALL_PRODUCTS.find(p => p.id === item.id);
      if (prod) {
        subtotal += prod.price * (item.qty || 1);
      }
    }

    const grandTotal = Math.max(0.01, subtotal - Number(discountAmount) + Number(insuranceCost));
    const orderID = `PAYPAL-ORD-${Date.now()}`;

    return NextResponse.json({
      success: true,
      orderID,
      amount: grandTotal.toFixed(2)
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
