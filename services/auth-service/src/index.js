import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { signToken, verifyToken, timingSafeCompare, extractToken } from './jwt.js';

dotenv.config();

const app = express();
const PORT = process.env.AUTH_PORT || process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;
const JWT_SECRET = process.env.JWT_SIGNING_SECRET || process.env.JWT_SECRET;

if (!ADMIN_KEY) {
  console.warn('[auth-service] WARNING: ADMIN_SECRET_KEY is not configured. Admin authentication will fail-closed.');
}
if (!JWT_SECRET) {
  console.warn('[auth-service] WARNING: JWT_SIGNING_SECRET is not configured. Token signing will fail-closed.');
}

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? '*' : (corsOrigin.includes(',') ? corsOrigin.split(',').map(s => s.trim()) : corsOrigin)
}));
app.use(express.json());

let totalRequests = 0;
const statusCounts = {};

app.use((req, res, next) => {
  totalRequests++;
  const start = Date.now();
  res.on('finish', () => {
    const status = res.statusCode;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    const duration = Date.now() - start;
    if (req.path !== '/health' && req.path !== '/metrics') {
      console.log(`[auth-service] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

const metricsHandler = (req, res) => {
  const mem = process.memoryUsage();
  const uptime = process.uptime();
  const statusLines = Object.entries(statusCounts)
    .map(([status, count]) => `http_requests_total{service="auth-service",status="${status}"} ${count}`)
    .join('\n');

  const output = [
    '# HELP process_uptime_seconds Process uptime in seconds.',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds{service="auth-service"} ${uptime}`,
    '# HELP process_resident_memory_bytes Resident memory size in bytes.',
    '# TYPE process_resident_memory_bytes gauge',
    `process_resident_memory_bytes{service="auth-service"} ${mem.rss}`,
    '# HELP nodejs_heap_size_total_bytes Total size of heap in bytes.',
    '# TYPE nodejs_heap_size_total_bytes gauge',
    `nodejs_heap_size_total_bytes{service="auth-service"} ${mem.heapTotal}`,
    '# HELP nodejs_heap_size_used_bytes Process heap memory used in bytes.',
    '# TYPE nodejs_heap_size_used_bytes gauge',
    `nodejs_heap_size_used_bytes{service="auth-service"} ${mem.heapUsed}`,
    '# HELP http_requests_total Total number of HTTP requests.',
    '# TYPE http_requests_total counter',
    statusLines || `http_requests_total{service="auth-service",status="200"} ${totalRequests}`,
    ''
  ].filter(Boolean).join('\n');

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(output);
};

app.get('/metrics', metricsHandler);
app.get('/api/metrics', metricsHandler);

// Health check
const healthHandler = (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    configured: Boolean(ADMIN_KEY && JWT_SECRET)
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Authentication routes
// POST /api/auth/login — Authenticate admin credentials and issue signed JWT access token
app.post('/api/auth/login', (req, res) => {
  try {
    const { key, password } = req.body;
    const provided = key || password;

    if (!provided || typeof provided !== 'string') {
      return res.status(400).json({ success: false, message: 'Key or password required.' });
    }

    if (!ADMIN_KEY || !JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Authentication service configuration error: Server credentials unconfigured.'
      });
    }

    // Strict constant-time validation of master administrator secret
    if (!timingSafeCompare(provided, ADMIN_KEY)) {
      return res.status(401).json({ success: false, message: 'Invalid Admin Master Key.' });
    }

    // Issue short-lived signed JWT access token (1 hour)
    const token = signToken({ sub: 'admin', role: 'admin' }, JWT_SECRET, 3600);

    return res.json({
      success: true,
      message: 'Admin authenticated successfully',
      role: 'admin',
      token
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/verify — Verify active signed admin access token
app.get('/api/auth/verify', (req, res) => {
  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      authorized: false,
      message: 'Authentication service configuration error.'
    });
  }

  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      authorized: false,
      message: 'Missing authorization token.'
    });
  }

  const payload = verifyToken(token, JWT_SECRET);
  if (payload && payload.role === 'admin') {
    return res.json({ success: true, authorized: true, role: 'admin' });
  }

  return res.status(401).json({
    success: false,
    authorized: false,
    message: 'Invalid or expired access token.'
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`[auth-service] Running on http://${HOST}:${PORT}`);
    console.log(`[auth-service] Health probe: http://${HOST}:${PORT}/health`);
  });
}

export default app;
