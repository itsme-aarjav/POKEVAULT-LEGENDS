/**
 * POKÉVAULT LEGENDS — Vendure GraphQL Engine
 * Implements Vendure Admin API and Shop API GraphQL queries & mutations.
 */

import { vendureDb } from './vendure-db.js';

export function executeVendureGraphQL(queryStr, variables = {}, isShopApi = false) {
  const query = queryStr || '';

  // 1. SuperAdmin / Auth Login
  if (/\blogin\b/i.test(query) && (query.includes('mutation') || query.includes('Login'))) {
    const username = variables.username || 'superadmin';
    const admin = vendureDb.administrators.find(a => a.user.identifier === username) || vendureDb.administrators[0];
    return {
      data: {
        login: {
          __typename: 'CurrentUser',
          id: admin.user.id,
          identifier: admin.user.identifier,
          channels: vendureDb.channels,
          token: 'vendure-auth-token-superadmin-2026'
        }
      }
    };
  }

  const responseData = {};

  // 2. Active Administrator Query
  if (/\bactiveAdministrator\b/i.test(query) || /\bme\s*\{/i.test(query)) {
    responseData.activeAdministrator = vendureDb.administrators[0];
  }

  // 3. Metrics Query
  if (/\bmetrics\b/i.test(query) || /\bDashboardMetrics\b/i.test(query)) {
    responseData.metrics = vendureDb.getMetrics();
  }

  // 4. Update Product Mutation
  if (/\bupdateProduct\b/i.test(query) && query.includes('mutation')) {
    const input = variables.input || {};
    const updated = vendureDb.updateProduct(input.id, input);
    responseData.updateProduct = updated;
  }

  // 5. Update Product Variant Mutation
  if (/\bupdateProductVariant\b/i.test(query) && query.includes('mutation')) {
    const input = variables.input || {};
    const updated = vendureDb.updateProductVariant(input.id, input);
    responseData.updateProductVariant = updated;
  }

  // 6. Single Product Query
  if (/\bproduct\s*\(/i.test(query)) {
    const id = variables.id || variables.slug || '1';
    const prod = vendureDb.getProductById(id);
    responseData.product = prod || null;
  }

  // 7. Products List Query
  if (/\bproducts\b/i.test(query) || /\bGetProducts\b/i.test(query) || /\bGetCatalog\b/i.test(query)) {
    const take = variables.options?.take || (variables.take !== undefined ? variables.take : 50);
    const skip = variables.options?.skip || (variables.skip !== undefined ? variables.skip : 0);
    const filter = variables.options?.filter || '';
    const res = vendureDb.getProducts({ take, skip, filter });
    responseData.products = res;
  }

  // 8. Collections List Query
  if (/\bcollections\b/i.test(query) || /\bGetCollections\b/i.test(query)) {
    responseData.collections = {
      items: vendureDb.getCollections(),
      totalItems: vendureDb.collections.length
    };
  }

  // 9. Orders List Query
  if (/\borders\b/i.test(query) || /\bGetOrders\b/i.test(query)) {
    const take = variables.options?.take || 50;
    const skip = variables.options?.skip || 0;
    const res = vendureDb.getOrders({ take, skip });
    responseData.orders = res;
  }

  // 10. Single Order Query
  if (/\border\s*\(/i.test(query)) {
    const id = variables.id || '1';
    responseData.order = vendureDb.getOrderById(id) || null;
  }

  // 11. Customers List Query
  if (/\bcustomers\b/i.test(query) || /\bGetCustomers\b/i.test(query)) {
    responseData.customers = {
      items: vendureDb.getCustomers(),
      totalItems: vendureDb.customers.length
    };
  }

  // 12. Promotions List Query
  if (/\bpromotions\b/i.test(query) || /\bGetPromotions\b/i.test(query)) {
    responseData.promotions = {
      items: vendureDb.getPromotions(),
      totalItems: vendureDb.promotions.length
    };
  }

  // 13. Introspection fallback
  if (/\b__schema\b/i.test(query) || /\b__typename\b/i.test(query)) {
    responseData.__schema = {
      queryType: { name: 'Query' },
      mutationType: { name: 'Mutation' },
      types: []
    };
  }

  if (Object.keys(responseData).length > 0) {
    return { data: responseData };
  }

  // Default response containing store overview
  return {
    data: {
      products: vendureDb.getProducts({ take: 10 }),
      collections: { items: vendureDb.getCollections() },
      metrics: vendureDb.getMetrics()
    }
  };
}
