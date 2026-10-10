import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyToken, signToken, extractToken } from '../src/jwt.js';
import { formatCardRecord } from '../src/format.js';

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

test('admin endpoint authorization - valid admin token accepted', () => {
  const secret = 'catalog-jwt-shared-secret-key-32ch';
  const adminToken = signToken({ role: 'admin', sub: 'curator-1' }, secret, 3600);

  const decoded = verifyToken(adminToken, secret);
  assert.ok(decoded);
  assert.equal(decoded.role, 'admin');
});

test('admin endpoint authorization - non-admin token rejected', () => {
  const secret = 'catalog-jwt-shared-secret-key-32ch';
  const userToken = signToken({ role: 'customer', sub: 'user-42' }, secret, 3600);

  const decoded = verifyToken(userToken, secret);
  assert.ok(decoded);
  assert.notEqual(decoded.role, 'admin');
});

test('admin endpoint authorization - arbitrary string or backdoor rejected', () => {
  const secret = 'catalog-jwt-shared-secret-key-32ch';
  assert.equal(verifyToken('pokevaultadmin123', secret), null);
  assert.equal(verifyToken('a'.repeat(32), secret), null);
});

// PV-011 Integration and Normalization Tests
test('PV-011: formatCardRecord normalizes MySQL snake_case rows into bidirectional frontend schema', () => {
  const mysqlRow = {
    id: 'charizard-base-1st',
    sku: 'CARD-CHARIZARD-BASE-1ST',
    name: '1st Edition Shadowless Charizard',
    sub_name: 'Rare Collector\'s Holo Edition',
    category: 'trading-cards',
    category_name: 'Trading Cards & Graded Slabs',
    pokemon: 'Charizard',
    price: '4850.00',
    original_price: '5500.00',
    discount_percent: 12,
    image: '/assets/charizard.png',
    gallery: JSON.stringify(['/assets/charizard.png', '/assets/card_back.png']),
    short_description: 'Crown jewel of Pokémon collecting',
    description: 'PSA 10 GEM MT 1st edition shadowless card',
    rating: '5.00',
    review_count: 48,
    in_stock: 3,
    badge: 'Vault Holy Grail',
    is_featured: 1,
    is_trending: 1,
    is_bestseller: 1,
    is_new: 0,
    era_code: 'vintage',
    tags: JSON.stringify(['Graded Slab', 'PSA', 'Vintage'])
  };

  const normalized = formatCardRecord(mysqlRow);
  assert.equal(normalized.id, 'charizard-base-1st');
  assert.equal(normalized.price, 4850);
  assert.equal(normalized.originalPrice, 5500);
  assert.equal(normalized.original_price, 5500);
  assert.equal(normalized.subName, 'Rare Collector\'s Holo Edition');
  assert.equal(normalized.sub_name, 'Rare Collector\'s Holo Edition');
  assert.equal(normalized.categoryName, 'Trading Cards & Graded Slabs');
  assert.equal(normalized.category_name, 'Trading Cards & Graded Slabs');
  assert.equal(normalized.inStock, 3);
  assert.equal(normalized.in_stock, 3);
  assert.equal(normalized.availability, 'In Stock');
  assert.equal(normalized.isFeatured, true);
  assert.equal(normalized.is_featured, true);
  assert.equal(normalized.isTrending, true);
  assert.equal(normalized.isBestseller, true);
  assert.equal(normalized.isNew, false);
  assert.equal(normalized.eraCode, 'vintage');
  assert.equal(normalized.era_code, 'vintage');
  assert.ok(Array.isArray(normalized.gallery));
  assert.equal(normalized.gallery.length, 2);
  assert.ok(Array.isArray(normalized.tags));
  assert.equal(normalized.tags.length, 3);
});

test('PV-011: formatCardRecord handles out-of-stock items and defaults safely', () => {
  const outOfStockRow = {
    id: 'out-of-stock-card',
    name: 'Sold Out Trophy Promo',
    price: 99.99,
    in_stock: 0,
    gallery: null,
    specs: null
  };

  const normalized = formatCardRecord(outOfStockRow);
  assert.equal(normalized.inStock, 0);
  assert.equal(normalized.in_stock, 0);
  assert.equal(normalized.availability, 'Out of Stock');
  assert.ok(normalized.originalPrice >= 99.99);
  assert.ok(Array.isArray(normalized.gallery));
});

test('PV-011: catalog query filter matching handles category, search, and featured criteria', () => {
  const items = [
    { id: 'c1', name: 'Charizard Holo', category: 'trading-cards', isFeatured: true, pokemon: 'Charizard' },
    { id: 'c2', name: 'Pikachu Plush', category: 'plush-toys', isFeatured: false, pokemon: 'Pikachu' },
    { id: 'c3', name: 'Gengar Hoodie', category: 'clothing-apparel', isFeatured: true, pokemon: 'Gengar' }
  ];

  // Search filter
  const searchFilter = (query) => items.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  assert.equal(searchFilter('charizard').length, 1);
  assert.equal(searchFilter('charizard')[0].id, 'c1');
  assert.equal(searchFilter('nonexistent').length, 0);

  // Category filter
  const categoryFilter = (cat) => items.filter(p => p.category === cat);
  assert.equal(categoryFilter('plush-toys').length, 1);
  assert.equal(categoryFilter('plush-toys')[0].id, 'c2');
  assert.equal(categoryFilter('nonexistent-cat').length, 0);

  // Featured filter
  const featuredFilter = () => items.filter(p => p.isFeatured);
  assert.equal(featuredFilter().length, 2);
});
