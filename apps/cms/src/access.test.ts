import assert from 'node:assert/strict';
import { test } from 'node:test';

import { adminOnly, adminOrSelf, isAdminUser } from './access.ts';

// The access rules on their own (the collection configs import Payload, which these tests don't load).
const asUser = (user: object | null) => ({ req: { user } }) as unknown as Parameters<typeof adminOnly>[0];

void test('only an admin may write', () => {
  assert.equal(adminOnly(asUser({ id: 1, role: 'admin' })), true);
  assert.equal(adminOnly(asUser({ id: 2, role: 'demo-readonly' })), false);
  assert.equal(adminOnly(asUser({ id: 3 })), false);
  assert.equal(adminOnly(asUser(null)), false);
  assert.equal(isAdminUser(undefined), false);
});

void test('accounts: an admin sees all, anyone else only their own, a visitor none', () => {
  assert.equal(adminOrSelf(asUser({ id: 'a', role: 'admin' })), true);
  assert.deepEqual(adminOrSelf(asUser({ id: 'd', role: 'demo-readonly' })), { id: { equals: 'd' } });
  assert.equal(adminOrSelf(asUser(null)), false);
});
