import test from 'node:test';
import assert from 'node:assert/strict';

test('order price calculation logic', () => {
  const items = [
    { cardId: 'c1', unitPrice: 100, quantity: 2 },
    { cardId: 'c2', unitPrice: 50, quantity: 1 }
  ];
  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const insuranceCost = 9.99;
  const discount = 10.00;
  const total = +(subtotal + insuranceCost - discount).toFixed(2);

  assert.equal(subtotal, 250);
  assert.equal(total, 249.99);
});

test('order id generation format', () => {
  const orderId = `ORD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  assert.match(orderId, /^ORD-\d{13}-\d{3}$/);
});
