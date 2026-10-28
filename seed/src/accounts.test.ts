import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';

import { ACCOUNT_IDS, buildAccounts, DEMO_ADMIN_EMAIL, DEMO_SHOPPER_EMAIL, hashPassword, superAdminFrom } from './accounts.ts';

// node:test's describe/it return promises the runner tracks itself.

const env = { SUPER_ADMIN_EMAIL: ' Owner@Example.com ', SUPER_ADMIN_PASSWORD: 'correct horse battery staple' };

void describe('accounts', () => {
  void it('hashes passwords exactly like the API (HMAC-SHA512 keyed by the salt)', () => {
    assert.equal(hashPassword('secret', 'abcd'), createHmac('sha512', 'abcd').update('secret').digest('hex'));
  });

  void it('builds the demo shopper, demo admin and super-admin with fixed IDs', () => {
    const { users } = buildAccounts(env);
    assert.deepEqual(
      users.map((u) => [(u._id as { $oid: string }).$oid, u.email, u.role]),
      [
        [ACCOUNT_IDS.shopper, DEMO_SHOPPER_EMAIL, 'USER'],
        [ACCOUNT_IDS.demoAdmin, DEMO_ADMIN_EMAIL, 'ADMIN'],
        [ACCOUNT_IDS.superAdmin, 'owner@example.com', 'ADMIN'],
      ],
    );
    for (const u of users) {
      assert.equal(u.status, 'ACTIVE');
      assert.match(String(u.salt), /^[0-9a-f]{16}$/);
      assert.ok((u.createdAt as { $date?: string }).$date);
    }
  });

  void it('stores only a salted hash of the super-admin password', () => {
    const owner = buildAccounts(env).users[2];
    assert.ok(owner);
    assert.equal(owner.password, hashPassword(env.SUPER_ADMIN_PASSWORD, String(owner.salt)));
    assert.equal(JSON.stringify(owner).includes(env.SUPER_ADMIN_PASSWORD), false);
  });

  void it('gives demo accounts random passwords that differ every build', () => {
    const [a, b] = [buildAccounts(env).users[0], buildAccounts(env).users[0]];
    assert.notEqual(a?.password, b?.password);
  });

  void it('gives the demo shopper a default address', () => {
    const [address] = buildAccounts(env).addresses;
    assert.deepEqual(address?.userId, { $oid: ACCOUNT_IDS.shopper });
    assert.equal(address?.isDefault, true);
    assert.equal(address?.contactNo, '9000000000');
  });

  void it('gives the demo shopper an empty cart and favourites, as signup does', () => {
    const { carts, favorites } = buildAccounts(env);
    assert.deepEqual(carts[0]?.user, { $oid: ACCOUNT_IDS.shopper });
    assert.deepEqual(carts[0]?.products, []);
    assert.deepEqual(favorites[0]?.userId, { $oid: ACCOUNT_IDS.shopper });
  });

  void it('keeps owner settings within the API login limits', () => {
    assert.throws(() => superAdminFrom({ SUPER_ADMIN_EMAIL: 'owner@example.com', SUPER_ADMIN_PASSWORD: 'x'.repeat(51) }), /12–50/);
    assert.throws(
      () => superAdminFrom({ SUPER_ADMIN_EMAIL: `${'o'.repeat(45)}@example.com`, SUPER_ADMIN_PASSWORD: 'long enough pw' }),
      /at most 50/,
    );
  });

  void it('rejects missing or weak owner settings without echoing them', () => {
    assert.throws(() => superAdminFrom({}), /SUPER_ADMIN_EMAIL is missing/);
    assert.throws(
      () => superAdminFrom({ SUPER_ADMIN_EMAIL: 'x@demo.pageaters.com', SUPER_ADMIN_PASSWORD: 'long enough pw' }),
      /not a demo one/,
    );
    assert.throws(
      () => superAdminFrom({ SUPER_ADMIN_EMAIL: 'owner@example.com', SUPER_ADMIN_PASSWORD: 'short-pw' }),
      (error: Error) => /12–50/.test(error.message) && !error.message.includes('short-pw'),
    );
  });
});
