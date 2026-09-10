import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import cardsRouter from './routes/cards.js';
import inventoryRouter from './routes/inventory.js';
import ordersRouter from './routes/orders.js';
import paypalRouter from './routes/paypal.js';
import settingsRouter from './routes/settings.js';
import authRouter from './routes/auth.js';
import { isMySQLConfigured, initMySQLDatabase } from './db/mysql.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';

// ─── CORS: Allowed storefront, ALB, and local development origins ─────────
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:80',
  'http://localhost',
  'http://127.0.0.1',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5001',
  process.env.STOREFRONT_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all origins in container/reverse proxy setup
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key']
}));

// Limit JSON body size to prevent payload flooding
app.use(express.json({ limit: '1mb' }));

// ─── Admin Auth Middleware ─────────────────────────────────────────────────
import { requireAdmin } from './middleware/auth.js';
export { requireAdmin };

// ─── API Health Check ──────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'POKÉVAULT LEGENDS Production Express API',
    database: isMySQLConfigured() ? 'mysql-connected' : 'local-in-memory',
    timestamp: new Date().toISOString()
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/api/cards', cardsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/paypal', paypalRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/auth', authRouter);

// Serve static assets from Vite production build in dist/
app.use(express.static(DIST_DIR, { extensions: ['html'] }));
app.use('/public', express.static(PUBLIC_DIR));

// Dynamic client routes fallback
app.get('/product/*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'product.html'));
});

app.get('/category/*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'category.html'));
});

app.get('/blog/*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'blog-post.html'));
});

// Root route and SPA fallback for non-API client navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Start server & initialize database pool
const server = app.listen(PORT, HOST, async () => {
  console.log(`
  ================================================================
  ⚡ POKÉVAULT LEGENDS Production Server Running on http://${HOST}:${PORT}
  DATABASE ENGINE: ${process.env.MYSQL_HOST ? `MySQL (${process.env.MYSQL_HOST})` : 'MySQL Local / Auto-Detect'}
  ADMIN AUTH:      ${process.env.ADMIN_SECRET_KEY ? '✅ Admin Secret Configured' : '⚠️ Using Default Admin Key (pokevaultadmin123)'}
  API BASE URL:    http://${HOST}:${PORT}/api
  ================================================================
  `);

  // Initialize and auto-seed MySQL database
  await initMySQLDatabase();
});

// ─── Graceful Shutdown Handling (for Docker, systemd, AWS ALB draining) ───
const handleShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log('[Server] HTTP server closed cleanly.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[Server] Graceful shutdown timeout exceeded. Forcing exit.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
