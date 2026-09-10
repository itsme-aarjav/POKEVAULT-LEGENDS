/**
 * POKÉVAULT LEGENDS — Vendure Database Layer & Seed Engine
 * Translates PokéVault catalog, categories, and orders into Vendure's core schema:
 * Products, ProductVariants, Collections, Facets, Orders, Customers, and Administrators.
 */

import { ALL_PRODUCTS } from '../../src/data/products.js';
import { CATEGORIES_DATA } from '../../src/data/categories.js';
import { INITIAL_ORDERS } from '../../src/data/orders.js';

class VendureDatabase {
  constructor() {
    this.channels = [
      {
        id: '1',
        code: 'pokevault-default-channel',
        token: 'pv-channel-token-2026',
        defaultLanguageCode: 'en',
        currencyCode: 'USD',
        pricesIncludeTax: false,
      }
    ];

    this.administrators = [
      {
        id: '1',
        firstName: 'Super',
        lastName: 'Admin',
        emailAddress: 'admin@pokevault.com',
        user: {
          id: '1',
          identifier: 'superadmin',
          verified: true,
          roles: [
            {
              id: '1',
              code: 'superadmin',
              description: 'SuperAdmin with full system privileges',
              permissions: ['SuperAdmin', 'Authenticated', 'ReadCatalog', 'UpdateCatalog', 'ReadOrder', 'UpdateOrder', 'ReadCustomer', 'UpdateCustomer']
            }
          ]
        }
      },
      {
        id: '2',
        firstName: 'Vault',
        lastName: 'Curator',
        emailAddress: 'curator@pokevault.com',
        user: {
          id: '2',
          identifier: 'curator',
          verified: true,
          roles: [
            {
              id: '2',
              code: 'curator',
              description: 'Vault Curator with catalog and order permissions',
              permissions: ['ReadCatalog', 'UpdateCatalog', 'ReadOrder', 'UpdateOrder']
            }
          ]
        }
      }
    ];

    this.facets = [
      {
        id: '1',
        name: 'Pokémon Species',
        code: 'pokemon-species',
        values: [
          { id: 'f-1', name: 'Charizard', code: 'charizard' },
          { id: 'f-2', name: 'Pikachu', code: 'pikachu' },
          { id: 'f-3', name: 'Gengar', code: 'gengar' },
          { id: 'f-4', name: 'Rayquaza', code: 'rayquaza' },
          { id: 'f-5', name: 'Mewtwo', code: 'mewtwo' },
          { id: 'f-6', name: 'Snorlax', code: 'snorlax' },
          { id: 'f-7', name: 'Eevee', code: 'eevee' },
          { id: 'f-8', name: 'Lugia', code: 'lugia' },
        ]
      },
      {
        id: '2',
        name: 'Grading Condition',
        code: 'grading-condition',
        values: [
          { id: 'f-10', name: 'PSA 10 GEM MT', code: 'psa-10' },
          { id: 'f-11', name: 'BGS 9.5 Pristine', code: 'bgs-9-5' },
          { id: 'f-12', name: 'Vault Mint', code: 'vault-mint' },
          { id: 'f-13', name: 'Collector Grade', code: 'collector-grade' }
        ]
      }
    ];

    this.collections = CATEGORIES_DATA.map((cat, idx) => ({
      id: String(idx + 1),
      name: cat.name,
      slug: cat.id,
      description: cat.description,
      isPrivate: false,
      featuredAsset: {
        id: `asset-cat-${idx + 1}`,
        preview: cat.image || '/assets/charizard.png',
        source: cat.image || '/assets/charizard.png'
      },
      productCount: 0
    }));

    this.products = [];
    this.productVariants = [];

    this.seedProducts();

    this.orders = INITIAL_ORDERS.map((o, idx) => ({
      id: o.id || `ord_${1001 + idx}`,
      order_id: o.order_id,
      code: o.order_id,
      state: o.status === 'Delivered' ? 'PaymentSettled' : o.status === 'Shipped' ? 'Shipped' : 'ArrangingPayment',
      status: o.status,
      active: false,
      customer_name: o.customer_name,
      customer_email: o.customer_email,
      customer: {
        id: `cust-${idx + 1}`,
        firstName: o.customer_name.split(' ')[0],
        lastName: o.customer_name.split(' ').slice(1).join(' '),
        emailAddress: o.customer_email
      },
      shipping_address: o.shipping_address,
      payment_method: o.payment_method,
      tracking_number: o.tracking_number,
      total_amount: o.total_amount,
      totalWithTax: o.total_amount,
      subtotal: o.subtotal,
      gst_amount: o.gst_amount,
      discount_amount: o.discount_amount,
      shipping_cost: o.shipping_cost,
      currencyCode: 'INR',
      created_at: o.created_at,
      createdAt: o.created_at,
      items: o.items,
      lines: (o.items || []).map((item, lineIdx) => ({
        id: `line-${idx + 1}-${lineIdx + 1}`,
        productVariant: {
          id: `var-${lineIdx + 1}`,
          name: item.card_name,
          sku: `SKU-${idx + 1}`,
          price: item.unit_price
        },
        quantity: item.quantity || 1,
        linePriceWithTax: (item.unit_price) * (item.quantity || 1)
      }))
    }));

    // Dynamically derive Customers CRM from actual Orders dataset
    const indianPhoneNumbers = {
      'aarav.sharma@gmail.com': '+91-98201-44556',
      'priya.patel@ahmedabad.in': '+91-98791-22334',
      'rohan.v@techbengaluru.co': '+91-99800-77889',
      'ananya.iyer@chennai.org': '+91-94440-11223',
      'vikram.m@delhicapital.in': '+91-98110-33445',
      'sneha.k@pune.co.in': '+91-98220-55667',
      'arjun.s@kolkata.net': '+91-98300-88990',
      'kavita.reddy@hyderabad.in': '+91-98490-66778',
      'aditya.roy@jaipur.co': '+91-94140-33221',
      'tanvi.d@nagpur.in': '+91-98230-11445',
      'nikhil.c@chandigarh.org': '+91-98150-77889',
      'meera.nambiar@kochi.in': '+91-94470-22334'
    };

    const customerMap = new Map();
    INITIAL_ORDERS.forEach((o, idx) => {
      const email = o.customer_email;
      const names = o.customer_name.split(' ');
      const city = o.shipping_address.split(',').slice(-2).join(',').trim();
      
      if (!customerMap.has(email)) {
        customerMap.set(email, {
          id: `cust-${customerMap.size + 1}`,
          title: 'Mr./Ms.',
          firstName: names[0],
          lastName: names.slice(1).join(' ') || 'Collector',
          name: o.customer_name,
          emailAddress: email,
          phoneNumber: indianPhoneNumbers[email] || '+91-98201-99887',
          city: city,
          ordersCount: 0,
          totalSpent: 0,
          createdAt: o.created_at.substring(0, 10),
          orders: []
        });
      }
      const cust = customerMap.get(email);
      cust.ordersCount += 1;
      cust.totalSpent += Number(o.total_amount);
      cust.orders.push(o.order_id);
    });

    this.customers = Array.from(customerMap.values());

    this.promotions = [
      {
        id: '1',
        name: 'DIWALI20 Festive Mega Offer',
        couponCode: 'DIWALI20',
        enabled: true,
        startsAt: '2026-01-01',
        endsAt: '2027-12-31',
        discountPercent: 20,
        conditions: 'Minimum order ₹1,999'
      },
      {
        id: '2',
        name: 'Flat ₹500 Off on First UPI Order',
        couponCode: 'UPIFIRST500',
        enabled: true,
        startsAt: '2026-01-01',
        endsAt: '2027-12-31',
        discountPercent: 0,
        conditions: 'Valid on Google Pay & PhonePe'
      },
      {
        id: '3',
        name: 'Free BlueDart Air Express Delivery',
        couponCode: 'FREESHIP999',
        enabled: true,
        startsAt: '2026-01-01',
        endsAt: '2027-12-31',
        discountPercent: 0,
        conditions: 'Pan-India orders above ₹999'
      }
    ];
  }

  seedProducts() {
    ALL_PRODUCTS.forEach((p, index) => {
      const prodId = String(index + 1);
      const collectionMatch = this.collections.find(c => c.slug === p.category);
      if (collectionMatch) {
        collectionMatch.productCount++;
      }

      const variant = {
        id: `var-${prodId}`,
        name: p.name,
        sku: p.sku || `PV-${p.id.toUpperCase()}`,
        price: p.price,
        stockOnHand: p.inStock || 10,
        stockAllocated: 0,
        outOfStockThreshold: 0,
        enabled: true,
        productId: prodId,
        customFields: {
          grade: p.specs?.Grade || 'PSA 10 GEM MT',
          certificationNumber: p.specs?.Certification || '47318042',
          pokemon: p.pokemon || 'Charizard',
          isVaultExclusive: true,
          rarityScore: p.price > 1000 ? 99 : p.price > 200 ? 85 : 70
        }
      };

      this.productVariants.push(variant);

      this.products.push({
        id: prodId,
        slug: p.id,
        name: p.name,
        description: p.description,
        enabled: true,
        featuredAsset: {
          id: `asset-${prodId}`,
          preview: p.image,
          source: p.image
        },
        assets: (p.gallery || [p.image]).map((img, imgIdx) => ({
          id: `asset-${prodId}-${imgIdx + 1}`,
          preview: img,
          source: img
        })),
        variants: [variant],
        collections: collectionMatch ? [collectionMatch] : [],
        facetValues: [
          { id: 'f-1', name: p.pokemon || 'Charizard', code: (p.pokemon || 'charizard').toLowerCase() }
        ],
        customFields: {
          subName: p.subName || p.shortDescription,
          authenticityGuaranteed: true,
          reviewRating: p.rating || 5.0,
          reviewCount: p.reviewCount || 24
        },
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: new Date().toISOString()
      });
    });
  }

  // --- CRUD Query Helpers ---
  getProducts({ take = 50, skip = 0, filter = '' } = {}) {
    let list = this.products;
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return {
      items: list.slice(skip, skip + take),
      totalItems: list.length
    };
  }

  getProductById(id) {
    return this.products.find(p => p.id === String(id) || p.slug === String(id));
  }

  updateProduct(id, input) {
    const p = this.getProductById(id);
    if (!p) return null;
    if (input.name) p.name = input.name;
    if (input.description) p.description = input.description;
    if (input.enabled !== undefined) p.enabled = input.enabled;
    p.updatedAt = new Date().toISOString();
    return p;
  }

  updateProductVariant(id, input) {
    const v = this.productVariants.find(v => v.id === String(id));
    if (!v) return null;
    if (input.price !== undefined) v.price = input.price;
    if (input.stockOnHand !== undefined) v.stockOnHand = input.stockOnHand;
    if (input.sku) v.sku = input.sku;
    return v;
  }

  getOrders({ take = 50, skip = 0 } = {}) {
    return {
      items: this.orders.slice(skip, skip + take),
      totalItems: this.orders.length
    };
  }

  getOrderById(id) {
    return this.orders.find(o => o.id === String(id) || o.code === String(id));
  }

  getCollections() {
    return this.collections;
  }

  getCustomers() {
    return this.customers;
  }

  getPromotions() {
    return this.promotions;
  }

  getMetrics() {
    const totalRevenue = this.orders.reduce((sum, o) => sum + (o.totalWithTax || 0), 0);
    const totalUnits = this.productVariants.reduce((sum, v) => sum + (v.stockOnHand || 0), 0);
    const lowStockCount = this.productVariants.filter(v => v.stockOnHand <= 3).length;
    return {
      totalRevenue,
      totalOrders: this.orders.length,
      totalProducts: this.products.length,
      totalUnits,
      lowStockCount,
      activePromotions: this.promotions.filter(p => p.enabled).length
    };
  }
}

export const vendureDb = new VendureDatabase();
