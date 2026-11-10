import assert from 'node:assert/strict';
import test from 'node:test';
import { sessionVerdict } from '../src/context/sessionVerdict.ts';

for (const status of [429, 500, 502, 503, undefined]) {
  test(`auth failure ${status ?? 'network'} remains recoverable with an empty client session`, () => {
    assert.deepEqual(sessionVerdict({ data: null, error: { status, message: 'Unavailable' } }), { kind: 'unavailable' });
  });
  test(`auth failure ${status ?? 'network'} cannot invalidate a previously known account`, () => {
    assert.deepEqual(sessionVerdict({ data: { user: { id: 'existing-account' } }, error: { status } }), { kind: 'unavailable' });
  });
}

test('explicit 401 and successful empty session are unauthenticated', () => {
  assert.deepEqual(sessionVerdict({ data: null, error: { status: 401 } }), { kind: 'unauthenticated' });
  assert.deepEqual(sessionVerdict({ data: null, error: null }), { kind: 'unauthenticated' });
});

test('successful account identity can bind the state response', () => {
  assert.deepEqual(sessionVerdict({ data: { user: { id: 'verified-account' } }, error: null }), { kind: 'authenticated', userId: 'verified-account' });
});
