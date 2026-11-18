import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accountExpiresAt, isAccountReadOnly } from '../src/accountAccess.js';
test('accounts become read-only exactly two calendar years after signup', () => {
  const created = new Date('2026-11-18T12:00:00.000Z');
  assert.equal(accountExpiresAt(created).toISOString(), '2028-11-18T12:00:00.000Z');
  assert.equal(isAccountReadOnly(created, new Date('2028-11-18T11:59:59.999Z')), false);
  assert.equal(isAccountReadOnly(created, new Date('2028-11-18T12:00:00.000Z')), true);
  assert.equal(created.toISOString(), '2026-11-18T12:00:00.000Z');
});
test('leap-day accounts expire February 28 and invalid dates fail closed', () => {
  assert.equal(accountExpiresAt(new Date('2024-02-29T08:30:00Z')).toISOString(), '2026-02-28T08:30:00.000Z');
  assert.equal(isAccountReadOnly(new Date('invalid')), true);
});
