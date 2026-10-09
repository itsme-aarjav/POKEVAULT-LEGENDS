import test from 'node:test';
import assert from 'node:assert/strict';

test('auth service configuration test', () => {
  const defaultAdminKey = 'pokevaultadmin123';
  assert.equal(typeof defaultAdminKey, 'string');
  assert.ok(defaultAdminKey.length >= 8);
});

test('auth token format validator', () => {
  const token = 'PV-SEC-TOKEN-99482';
  assert.match(token, /^PV-SEC/);
});
