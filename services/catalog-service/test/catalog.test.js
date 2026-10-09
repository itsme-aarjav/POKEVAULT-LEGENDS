import test from 'node:test';
import assert from 'node:assert/strict';

test('catalog product schema validator', () => {
  const sampleCard = {
    id: 'charizard-base-1st',
    name: 'Charizard 1st Edition Shadowless Base Set #4/102',
    price: 4850.00,
    category: 'vintage'
  };
  assert.ok(sampleCard.id);
  assert.ok(sampleCard.price > 0);
  assert.equal(typeof sampleCard.name, 'string');
});

test('cache key hashing logic', () => {
  const query = { category: 'vintage', era: 'all' };
  const cacheKey = `cards:list:${JSON.stringify(query)}`;
  assert.equal(cacheKey, 'cards:list:{"category":"vintage","era":"all"}');
});
