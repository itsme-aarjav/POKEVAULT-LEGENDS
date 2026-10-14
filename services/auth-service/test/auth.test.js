import test from 'node:test';
import assert from 'node:assert/strict';
import { timingSafeCompare, signToken, verifyToken, extractToken } from '../src/jwt.js';

test('timingSafeCompare - validates exact string match and rejects mismatches', () => {
  const masterKey = 'SuperSecretAdminKey123!@#';
  assert.equal(timingSafeCompare(masterKey, masterKey), true);
  assert.equal(timingSafeCompare('wrong-key', masterKey), false);
  assert.equal(timingSafeCompare('', masterKey), false);
  assert.equal(timingSafeCompare(null, masterKey), false);
  assert.equal(timingSafeCompare(undefined, masterKey), false);
});

test('timingSafeCompare - rejects arbitrary long strings (bypass prevention)', () => {
  const masterKey = 'SuperSecretAdminKey123!@#';
  const longBypassAttempt = 'a'.repeat(1024);
  const mediumBypassAttempt = 'b'.repeat(24);
  assert.equal(timingSafeCompare(longBypassAttempt, masterKey), false);
  assert.equal(timingSafeCompare(mediumBypassAttempt, masterKey), false);
});

test('timingSafeCompare - rejects former backdoor credentials', () => {
  const masterKey = 'ProperSecureMasterSecret999';
  const backdoorKey = 'pokevaultadmin123';
  assert.equal(timingSafeCompare(backdoorKey, masterKey), false);
});

test('signToken and verifyToken - generates and verifies valid admin JWT', () => {
  const secret = 'super-secure-jwt-signing-key-for-test-32char';
  const token = signToken({ role: 'admin', sub: 'admin-user' }, secret, 3600);

  assert.equal(typeof token, 'string');
  assert.equal(token.split('.').length, 3);

  const verified = verifyToken(token, secret);
  assert.ok(verified);
  assert.equal(verified.role, 'admin');
  assert.equal(verified.sub, 'admin-user');
  assert.ok(verified.exp > Math.floor(Date.now() / 1000));
});

test('verifyToken - rejects tokens signed with wrong secret', () => {
  const secretA = 'secret-key-alpha-32-chars-minimum-len';
  const secretB = 'secret-key-bravo-32-chars-minimum-len';
  const token = signToken({ role: 'admin' }, secretA, 3600);

  const verified = verifyToken(token, secretB);
  assert.equal(verified, null);
});

test('verifyToken - rejects expired tokens', () => {
  const secret = 'super-secure-jwt-signing-key-for-test-32char';
  // Expired 60 seconds ago
  const token = signToken({ role: 'admin' }, secret, -60);

  const verified = verifyToken(token, secret);
  assert.equal(verified, null);
});

test('verifyToken - rejects tampered token payloads', () => {
  const secret = 'super-secure-jwt-signing-key-for-test-32char';
  const token = signToken({ role: 'user' }, secret, 3600);
  const parts = token.split('.');

  // Tamper payload to elevate role
  const tamperedPayload = Buffer.from(JSON.stringify({ role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

  const verified = verifyToken(tamperedToken, secret);
  assert.equal(verified, null);
});

test('verifyToken - rejects arbitrary strings or malformed tokens', () => {
  const secret = 'super-secure-jwt-signing-key-for-test-32char';
  assert.equal(verifyToken('arbitrary-string-that-is-very-long'.repeat(5), secret), null);
  assert.equal(verifyToken('', secret), null);
  assert.equal(verifyToken(null, secret), null);
  assert.equal(verifyToken('a.b', secret), null);
});

test('extractToken - correctly extracts bearer token and custom header', () => {
  const mockReqBearer = {
    headers: {
      authorization: 'Bearer my-test-jwt-token'
    }
  };
  assert.equal(extractToken(mockReqBearer), 'my-test-jwt-token');

  const mockReqHeader = {
    headers: {
      'x-admin-key': 'my-custom-header-jwt-token'
    }
  };
  assert.equal(extractToken(mockReqHeader), 'my-custom-header-jwt-token');

  const mockReqEmpty = { headers: {} };
  assert.equal(extractToken(mockReqEmpty), null);
});
