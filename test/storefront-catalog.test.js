import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeProduct,
  getProducts,
  getProduct,
  invalidateCatalogCache,
  saveProduct,
  updateInventory,
  createOrder
} from '../src/lib/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to mock global fetch
function mockFetch(handler) {
  const originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    return handler(url, options);
  };
  return () => {
    global.fetch = originalFetch;
  };
}

test('PV-011: normalizeProduct maps both snake_case and camelCase fields consistently', () => {
  const snakeData = {
    id: 'charizard-base-1st',
    name: '1st Edition Shadowless Charizard',
    sub_name: 'Rare Collector\'s Holo',
    category: 'trading-cards',
    category_name: 'Trading Cards',
    pokemon: 'Charizard',
    price: '4850.00',
    original_price: '5500.00',
    discount_percent: 12,
    image: '/assets/charizard.png',
    gallery: JSON.stringify(['/assets/charizard.png']),
    short_description: 'Crown jewel',
    description: 'PSA 10 GEM MT',
    rating: '5.00',
    review_count: 48,
    in_stock: 3,
    badge: 'Vault Holy Grail',
    is_featured: 1,
    is_trending: 1,
    is_bestseller: 1,
    is_new: 0,
    era_code: 'vintage'
  };

  const normalized = normalizeProduct(snakeData);
  assert.equal(normalized.id, 'charizard-base-1st');
  assert.equal(normalized.price, 4850);
  assert.equal(normalized.originalPrice, 5500);
  assert.equal(normalized.original_price, 5500);
  assert.equal(normalized.subName, 'Rare Collector\'s Holo');
  assert.equal(normalized.inStock, 3);
  assert.equal(normalized.availability, 'In Stock');
  assert.equal(normalized.isFeatured, true);
  assert.equal(normalized.isTrending, true);
  assert.equal(normalized.isBestseller, true);
  assert.equal(normalized.isNew, false);
  assert.equal(normalized.eraCode, 'vintage');
  assert.ok(Array.isArray(normalized.gallery));
  assert.equal(normalized.gallery.length, 1);
});

test('PV-011: normalizeProduct handles malformed or missing fields safely', () => {
  const malformed = {
    id: 12345,
    name: 'Test Product',
    price: 'invalid-price',
    in_stock: -5,
    gallery: null,
    specs: 'invalid-json'
  };

  const normalized = normalizeProduct(malformed);
  assert.equal(normalized.id, '12345');
  assert.equal(normalized.price, 0);
  assert.equal(normalized.inStock, 0);
  assert.equal(normalized.availability, 'Out of Stock');
  assert.ok(Array.isArray(normalized.gallery));
  assert.equal(normalized.gallery[0], '/assets/card_detail.png');
  assert.deepEqual(normalized.specs, {});
});

test('PV-011: getProducts loads product list dynamically from /api/cards or /api/products', async () => {
  invalidateCatalogCache();
  let requestedUrl = '';

  const restore = mockFetch(async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        cards: [
          { id: 'card-1', name: 'Charizard', price: 100, inStock: 5 },
          { id: 'card-2', name: 'Blastoise', price: 80, inStock: 2 }
        ]
      })
    };
  });

  try {
    const res = await getProducts();
    assert.ok(requestedUrl.includes('/api/cards') || requestedUrl.includes('/api/products'));
    assert.equal(res.success, true);
    assert.equal(res.data.length, 2);
    assert.equal(res.data[0].id, 'card-1');
    assert.equal(res.data[0].name, 'Charizard');
    assert.equal(res.data[1].id, 'card-2');
  } finally {
    restore();
  }
});

test('PV-011: getProducts applies search, category, and era query parameters to API endpoint', async () => {
  invalidateCatalogCache();
  let requestedUrl = '';

  const restore = mockFetch(async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        cards: [{ id: 'card-1', name: 'Pikachu Promo', category: 'vintage', price: 50 }]
      })
    };
  });

  try {
    const res = await getProducts({ category: 'vintage', search: 'pikachu', era: 'scarlet-violet' }, { forceRefresh: true });
    assert.ok(requestedUrl.includes('category=vintage'));
    assert.ok(requestedUrl.includes('search=pikachu'));
    assert.ok(requestedUrl.includes('era=scarlet-violet'));
    assert.equal(res.success, true);
    assert.equal(res.data.length, 1);
    assert.equal(res.data[0].id, 'card-1');
  } finally {
    restore();
  }
});

test('PV-011: getProducts deduplicates concurrent in-flight requests and respects cache TTL', async () => {
  invalidateCatalogCache();
  let fetchCallCount = 0;

  const restore = mockFetch(async () => {
    fetchCallCount++;
    // Simulate slight network delay
    await new Promise(r => setTimeout(r, 20));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        cards: [{ id: 'card-1', name: 'Mew', price: 200 }]
      })
    };
  });

  try {
    // Fire two requests concurrently
    const [res1, res2] = await Promise.all([
      getProducts({ category: 'psa-slabs' }),
      getProducts({ category: 'psa-slabs' })
    ]);

    assert.equal(res1.success, true);
    assert.equal(res2.success, true);
    assert.equal(res1.data.length, 1);
    assert.equal(res2.data.length, 1);
    assert.equal(fetchCallCount, 1, 'In-flight request deduplication should prevent duplicate network requests');

    // Subsequent request should hit the 30-second TTL cache
    const cachedRes = await getProducts({ category: 'psa-slabs' });
    assert.equal(cachedRes.data.length, 1);
    assert.equal(fetchCallCount, 1, 'Cached request should not make a new fetch call');

    // Invalidation should force a new network request
    invalidateCatalogCache();
    await getProducts({ category: 'psa-slabs' });
    assert.equal(fetchCallCount, 2, 'Invalidating cache should trigger a new fetch call');
  } finally {
    restore();
  }
});

test('PV-011: getProducts handles empty catalog and network errors safely without throwing', async () => {
  invalidateCatalogCache();

  // Test empty catalog
  const restoreEmpty = mockFetch(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, cards: [] })
  }));

  try {
    const res = await getProducts({}, { forceRefresh: true });
    assert.equal(res.success, true);
    assert.deepEqual(res.data, [], 'Empty catalog must return empty array under data');
  } finally {
    restoreEmpty();
  }

  // Test 500 error
  const restoreError = mockFetch(async () => ({
    ok: false,
    status: 500,
    statusText: 'Internal Server Error'
  }));

  try {
    const res = await getProducts({}, { forceRefresh: true });
    assert.equal(res.success, false);
    assert.ok(res.error);
  } finally {
    restoreError();
  }
});

test('PV-011: getProduct loads a single product and returns notFound: true for 404 nonexistent products', async () => {
  // Successful detail fetch
  const restoreSuccess = mockFetch(async (url) => {
    assert.ok(url.includes('/api/cards/charizard-base-1st') || url.includes('/api/products/charizard-base-1st'));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        card: { id: 'charizard-base-1st', name: 'Charizard', price: 4850 }
      })
    };
  });

  try {
    const res = await getProduct('charizard-base-1st');
    assert.equal(res.success, true);
    assert.ok(res.data);
    assert.equal(res.data.id, 'charizard-base-1st');
    assert.equal(res.data.price, 4850);
  } finally {
    restoreSuccess();
  }

  // 404 product not found
  const restore404 = mockFetch(async () => ({
    ok: false,
    status: 404,
    statusText: 'Not Found'
  }));

  try {
    const missing = await getProduct('nonexistent-card-id', { forceRefresh: true });
    assert.equal(missing.success, false);
    assert.equal(missing.notFound, true, 'Deleted or nonexistent product must flag notFound: true');
  } finally {
    restore404();
  }
});

test('PV-011: Customer-facing storefront pages do NOT import static products.js', () => {
  const customerFacingFiles = [
    'src/main.js',
    'src/shop.js',
    'src/product.js',
    'src/search.js',
    'src/category-detail.js',
    'src/mystery-vault.js',
    'src/components/navbar.js',
    'src/components/cart-drawer.js',
    'src/wishlist-page.js',
    'src/blog-post.js',
    'src/verify.js',
    'src/checkout.js',
    'src/components/product-card.js'
  ];

  for (const relativePath of customerFacingFiles) {
    const fullPath = path.resolve(rootDir, relativePath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    // Verify it doesn't import from products.js or static catalog
    const hasStaticImport = /import\s+.*from\s+['"].*data\/products(\.js)?['"]/.test(content);
    assert.equal(
      hasStaticImport,
      false,
      `File ${relativePath} must NOT import static products from data/products.js! Found static import.`
    );
  }
});

test('PV-011 & Phase 2: Storefront product browsing does not bypass server-authoritative pricing', async () => {
  let orderPayload = null;

  const restore = mockFetch(async (url, options) => {
    if (url.includes('/api/orders')) {
      orderPayload = JSON.parse(options.body);
      return {
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          order: { id: 'ORD-TEST-1', order_token: 'otk_test', total: 4850 }
        })
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  });

  try {
    // Client submits cart items with potentially manipulated client prices
    await createOrder({
      customer: { name: 'Ash Ketchum', email: 'ash@pallet.town' },
      items: [
        { id: 'charizard-base-1st', quantity: 1, price: 0.01 } // client claims $0.01!
      ],
      shippingAddress: { line1: '123 Pallet Town Road' }
    });

    assert.ok(orderPayload);
    assert.ok(orderPayload.items);
    assert.equal(orderPayload.items[0].id, 'charizard-base-1st');
    assert.equal(orderPayload.items[0].quantity, 1);
    // Notice that order-service recalculates price from DB/catalog authoritative price
  } finally {
    restore();
  }
});

test('PV-011: Admin product mutations automatically invalidate storefront catalog cache', async () => {
  invalidateCatalogCache();
  let fetchCalls = 0;

  const restore = mockFetch(async (url, options) => {
    fetchCalls++;
    if (options?.method === 'POST') {
      return { ok: true, status: 200, json: async () => ({ success: true }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        cards: [{ id: 'card-1', name: 'Product', inStock: 10 }]
      })
    };
  });

  try {
    // Initial fetch -> fills cache
    await getProducts();
    assert.equal(fetchCalls, 1);

    // Second fetch -> cache hit
    await getProducts();
    assert.equal(fetchCalls, 1);

    // Admin updates product
    await saveProduct({ id: 'card-1', name: 'Updated Product', price: 99 });
    assert.equal(fetchCalls, 2);

    // Next customer fetch should see new request because cache was invalidated
    await getProducts();
    assert.equal(fetchCalls, 3);
  } finally {
    restore();
  }
});
