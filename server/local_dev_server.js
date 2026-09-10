import http from 'http';
import fs from 'fs';
import path from 'path';
import { ALL_PRODUCTS, getProductById, getProductsByCategory } from '../src/data/products.js';
import { CATEGORIES_DATA, getCategoryById } from '../src/data/categories.js';
import { renderProductSSR, renderCategorySSR } from './ssr_renderer.js';
import { handleVendureRequest } from './vendure/vendure-config.js';

const PORT = 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const reqUrl = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // 0. Vendure Backend GraphQL & Admin Dashboard Interception
  const vendureHandled = await handleVendureRequest(req, res, reqUrl);
  if (vendureHandled) return;

  // API Endpoints
  if (reqUrl === '/api/cards' || reqUrl === '/api/products') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ success: true, count: ALL_PRODUCTS.length, data: ALL_PRODUCTS }));
  }

  if (reqUrl.startsWith('/api/cards/')) {
    const id = reqUrl.replace('/api/cards/', '');
    const found = ALL_PRODUCTS.find(p => p.id === id);
    if (found) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ success: true, data: found }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: 'Product not found' }));
    }
  }

  // 1. SSR Interception for Product Pages
  if (reqUrl === '/product' || reqUrl === '/product.html') {
    const productId = searchParams.get('id') || 'charizard-base-1st';
    const product = getProductById(productId) || ALL_PRODUCTS[0];
    const rawHtml = fs.readFileSync(path.join(process.cwd(), 'product.html'), 'utf8');
    const ssrHtml = renderProductSSR(rawHtml, product);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    return res.end(ssrHtml);
  }

  // 2. SSR Interception for Category Pages (Faceted navigation canonicalization)
  if (reqUrl === '/category' || reqUrl === '/category.html') {
    const catSlug = searchParams.get('id') || 'trading-cards';
    const category = getCategoryById(catSlug) || CATEGORIES_DATA[0];
    const products = getProductsByCategory(catSlug);
    const rawHtml = fs.readFileSync(path.join(process.cwd(), 'category.html'), 'utf8');
    const ssrHtml = renderCategorySSR(rawHtml, category, products, parsedUrl.search);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    return res.end(ssrHtml);
  }

  // Static File Serving
  let relativePath = reqUrl === '/' ? 'index.html' : reqUrl;
  let filePath = path.join(process.cwd(), relativePath);

  if (reqUrl.startsWith('/assets/')) {
    filePath = path.join(process.cwd(), 'public', reqUrl);
  }

  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(filePath + '.jsx')) {
      filePath = filePath + '.jsx';
    } else if (fs.existsSync(filePath + '.js')) {
      filePath = filePath + '.js';
    } else if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(path.join(filePath, 'index.jsx'))) {
      filePath = path.join(filePath, 'index.jsx');
    } else if (fs.existsSync(path.join(filePath, 'index.js'))) {
      filePath = path.join(filePath, 'index.js');
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // Fallback to index.html
    const indexPath = path.join(process.cwd(), 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
});

server.listen(PORT, () => {
  console.log(`
  ================================================================
  🚀 POKÉVAULT LOCALHOST SSR & SEO PREVIEW SERVER RUNNING!
  👉 Open in browser: http://localhost:${PORT}
  ================================================================
  `);
});
