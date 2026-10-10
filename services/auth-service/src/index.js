import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import client from 'prom-client';
import { traceMiddleware } from './tracer.js';
import { signToken, verifyToken, timingSafeCompare, extractToken } from './jwt.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;
const JWT_SECRET = process.env.JWT_SIGNING_SECRET;

if (!ADMIN_KEY) {
  console.warn('[auth-service] WARNING: ADMIN_SECRET_KEY is not configured. Admin authentication will fail-closed.');
}
if (!JWT_SECRET) {
  console.warn('[auth-service] WARNING: JWT_SIGNING_SECRET is not configured. Token signing will fail-closed.');
}

// Prometheus metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register, prefix: 'auth_' });

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code']
});

app.use(traceMiddleware('auth-service'));

// Middleware to track Prometheus metrics
app.use((req, res, next) => {
  const start = process.hrtime();
  const isInternal = req.path === '/health' || req.path === '/metrics';
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    const route = req.route ? req.route.path : req.path;
    // Exclude internal probe endpoints from latency histogram to prevent scrape spikes from skewing P95
    if (!isInternal) {
      httpRequestDurationMicroseconds.labels(req.method, route, res.statusCode).observe(durationInSeconds);
    }
    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
    if (!isInternal) {
      console.log(`[auth-service] [trace_id=${req.traceId}] ${req.method} ${req.url} ${res.statusCode} - ${(durationInSeconds * 1000).toFixed(1)}ms`);
    }
  });
  next();
});

// Standard middlewares
app.use(cors());
app.use(express.json());

// Health probes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    configured: Boolean(ADMIN_KEY && JWT_SECRET)
  });
});

// Prometheus metrics scraping endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

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

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`[auth-service] Running on http://${HOST}:${PORT}`);
  console.log(`[auth-service] Health probe: http://${HOST}:${PORT}/health`);
  console.log(`[auth-service] Prometheus metrics: http://${HOST}:${PORT}/metrics`);
});
