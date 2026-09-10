/**
 * POKÉVAULT LEGENDS — Vendure Server Configuration & Router
 * Defines VendureConfig options, GraphQL middleware, and Admin UI routes.
 */

import { executeVendureGraphQL } from './vendure-schema.js';
import { renderVendureAdminHtml } from './vendure-admin-ui.js';
import { vendureDb } from './vendure-db.js';

export const vendureConfig = {
  apiOptions: {
    port: 8080,
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
  },
  authOptions: {
    tokenMethod: 'bearer',
    superadminCredentials: {
      identifier: 'superadmin',
      password: 'pokevault2026',
    },
  },
  dbConnectionOptions: {
    type: 'better-sqlite3',
    synchronize: true,
    logging: false,
    database: 'vendure-data.sqlite',
  },
  customFields: {
    Product: [
      { name: 'subName', type: 'string' },
      { name: 'authenticityGuaranteed', type: 'boolean' },
      { name: 'reviewRating', type: 'float' },
      { name: 'reviewCount', type: 'int' }
    ],
    ProductVariant: [
      { name: 'grade', type: 'string' },
      { name: 'certificationNumber', type: 'string' },
      { name: 'pokemon', type: 'string' },
      { name: 'isVaultExclusive', type: 'boolean' },
      { name: 'rarityScore', type: 'int' }
    ]
  }
};

/**
 * HTTP Middleware Handler for Vendure routes:
 * /admin -> Serves Vendure Admin Dashboard UI
 * /admin-api -> Handles GraphQL Admin API requests
 * /shop-api -> Handles GraphQL Shop API requests
 */
export async function handleVendureRequest(req, res, pathname) {
  // 1. Admin UI Dashboard
  if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin.html') {
    const html = renderVendureAdminHtml();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return true;
  }

  // 2. Admin API (GraphQL)
  if (pathname === '/admin-api' || pathname === '/admin-api/') {
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Channel-Token',
      });
      res.end();
      return true;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = executeVendureGraphQL(payload.query, payload.variables, false);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errors: [{ message: err.message }] }));
      }
    });
    return true;
  }

  // 3. Shop API (GraphQL)
  if (pathname === '/shop-api' || pathname === '/shop-api/') {
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Channel-Token',
      });
      res.end();
      return true;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = executeVendureGraphQL(payload.query, payload.variables, true);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errors: [{ message: err.message }] }));
      }
    });
    return true;
  }

  return false;
}
