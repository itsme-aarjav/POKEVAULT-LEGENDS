import crypto from 'crypto';

const JWT_HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

/**
 * Signs a payload with HMAC-SHA256 (RFC 7519)
 */
export function signToken(payload, secret, expiresInSeconds = 3600) {
  if (!secret || typeof secret !== 'string') {
    throw new Error('JWT signing secret is required');
  }
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const data = `${JWT_HEADER}.${payloadB64}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifies a JWT token with timing-safe HMAC-SHA256 signature check
 */
export function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || !secret || typeof secret !== 'string') {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [headerB64, payloadB64, signature] = parts;

  // Recompute signature
  const data = `${headerB64}.${payloadB64}`;
  const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Extracts bearer token from Authorization header or X-Admin-Key header
 */
export function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    return authHeader.trim();
  }
  const adminKeyHeader = req.headers['x-admin-key'];
  if (adminKeyHeader && typeof adminKeyHeader === 'string') {
    return adminKeyHeader.trim();
  }
  return null;
}
