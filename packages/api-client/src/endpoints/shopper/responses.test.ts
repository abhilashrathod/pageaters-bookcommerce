import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ClientErrorCode, createApiClient, isApiError } from '../../index.ts';
import type { ApiClient } from '../../index.ts';
import { mockFetch, ok } from '../../testing/mock-fetch.ts';
import * as f from '../../testing/shopper-fixtures.ts';

const BASE = 'https://api.example.test/api/v1';
const book = f.id(3);

function validatingClient(data: unknown) {
  const { fetch } = mockFetch(() => ok(data));
  return createApiClient({ baseUrl: BASE, fetch, validate: true });
}

type Row = [label: string, call: (client: ApiClient) => Promise<unknown>, data: unknown];

// One realistic fixture per distinct response schema, parsed with validation on. Fixtures carry no unknown keys,
// so the parsed value must equal the fixture.
const rows: Row[] = [
  ['books.list', (c) => c.books.list(), f.page([f.bookListItem])],
  ['books.detail', (c) => c.books.detail({ id: 'BK-0000000001' }), f.bookDetail],
  ['books.search', (c) => c.books.search({ q: 'a' }), [f.bookSearchResult]],
  ['authors.list', (c) => c.authors.list(), f.page([f.authorListItem])],
  ['authors.detail', (c) => c.authors.detail({ id: 'AU-0000000001' }), f.authorDetail],
  ['authors.search', (c) => c.authors.search({ q: 'a' }), [f.author]],
  ['categories.list', (c) => c.categories.list(), f.page([f.pick(f.category, '_id', 'categoryId', 'title', 'numberOfBooks', 'thumbnail')])],
  ['categories.detail', (c) => c.categories.detail({ id: 'CA-0000000001' }), f.category],
  ['categories.products', (c) => c.categories.products({ id: f.id(2) }), f.page([f.categoryProduct])],
  [
    'categories.overview',
    (c) => c.categories.overview({ id: f.id(2) }),
    { trending: [f.categoryProduct], newArrivals: [], mostDiscounted: [f.categoryProduct] },
  ],
  ['categories.search', (c) => c.categories.search({ q: 'fic' }), [f.pick(f.category, '_id', 'categoryId', 'title', 'numberOfBooks')]],
  ['collections.list', (c) => c.collections.list(), f.page([f.collectionListItem])],
  ['collections.detail', (c) => c.collections.detail({ id: 'CL-0000000001' }), f.collectionDetail],
  ['collections.search', (c) => c.collections.search({ q: 'a' }), [f.collection]],
  ['bundles.list', (c) => c.bundles.list(), f.page([f.bundleListItem])],
  ['bundles.detail', (c) => c.bundles.detail({ id: 'BN-0000000001' }), f.bundleDetail],
  ['bundles.search', (c) => c.bundles.search({ q: 'a' }), [f.bundle]],
  ['productSets.detail', (c) => c.productSets.detail({ id: 'PS-0000000001' }), f.productSetDetail],
  ['deals.list', (c) => c.deals.list(), f.page([f.dealListItem])],
  ['deals.detail', (c) => c.deals.detail({ id: 'DL-0000000001' }), f.deal],
  ['addOns.grouped', (c) => c.addOns.grouped({ productId: book }), [{ _id: 'Bookmarks', addOns: [f.addOn] }]],
  ['mysteryBoxes.list', (c) => c.mysteryBoxes.list(), f.page([f.mysteryBox])],
  ['mysteryBoxes.detail', (c) => c.mysteryBoxes.detail({ id: 'MB-0000000001' }), f.mysteryBox],

  ['auth.register (empty)', (c) => c.auth.register({ email: 'shopper@demo.pageaters.com', password: 'x' }), {}],
  ['auth.me', (c) => c.auth.me(), f.user],
  ['cart.detail', (c) => c.cart.detail(), f.populatedCart],
  ['cart.add (new line)', (c) => c.cart.add({ product: book }), true],
  ['cart.add (raised quantity)', (c) => c.cart.add({ product: book }), f.cartDocument],
  ['cart.remove', (c) => c.cart.remove({ product: book }), true],
  ['favorites.list', (c) => c.favorites.list(), f.favorites],
  ['favorites.list (no document)', (c) => c.favorites.list(), null],
  ['favorites.check', (c) => c.favorites.check({ product: book }), false],
  ['addresses.list', (c) => c.addresses.list(), [f.address]],
  ['addresses.detail', (c) => c.addresses.detail({ id: f.address._id }), f.address],
  ['addresses.update (not found)', (c) => c.addresses.update({ id: f.address._id, ...newAddress() }), null],
  ['addresses.checkPincode', (c) => c.addresses.checkPincode({ pincode: '560001' }), pincode()],
  ['orders.detail', (c) => c.orders.detail({ uniqueId: 'OD-0000000001' }), f.customerOrder],
  ['orders.list', (c) => c.orders.list(), [f.customerOrderListItem]],
  ['orders.checkout', (c) => c.orders.checkout(), f.checkoutOrder],
  [
    'orders.create (online)',
    (c) => c.orders.create({ method: 'online', giftOptions: { isGift: false } }),
    { razorOrderId: 'order_TEST000000001', total: 1577, orderId: 'OD-0000000002' },
  ],
  [
    'orders.create (cod)',
    (c) => c.orders.create({ method: 'cod', giftOptions: { isGift: false } }),
    { total: 1577, orderId: 'OD-0000000002' },
  ],
  ['storeCredit.balance', (c) => c.storeCredit.balance(), f.storeCreditBalance],
  ['storeCredit.history', (c) => c.storeCredit.history(), f.page([f.storeCreditTransaction])],
  ['stockAlerts.subscribe', (c) => c.stockAlerts.subscribe({ product: book }), f.stockAlert],
];

function newAddress() {
  const { fullName, contactNo, email, city, state, pinCode, isDefault, addressLine1 } = f.address;
  return { fullName, contactNo, email, city, state, pinCode, isDefault, addressLine1 };
}

function pincode() {
  return { main: { serviceable: true, isCod: 'Y', isPrepaid: 'Y', district: 'Bengaluru', state: 'KA' } };
}

void describe('shopper endpoints: responses', () => {
  for (const [label, call, data] of rows) {
    void it(`${label} parses a realistic response`, async () => {
      assert.deepEqual(await call(validatingClient(data)), data);
    });
  }

  void it('strips credentials from a profile', async () => {
    const leaky = { ...f.user, password: 'hash', salt: 'salt', contactOtp: '123456', razorPayCustId: 'cust_TEST', role: 'USER' };
    const profile = await validatingClient(leaky).auth.login({ email: f.user.email, password: 'x' });
    assert.deepEqual(profile, { ...f.user, role: 'USER' });
  });

  void it('drops the courier raw record and the recovery token', async () => {
    assert.deepEqual(
      await validatingClient({ ...pincode(), raw: { postal_code: {} } }).addresses.checkPincode({ pincode: '560001' }),
      pincode(),
    );
    assert.deepEqual(await validatingClient({ user: {}, token: 'session' }).auth.recoverAccount(), {});
  });

  void it('rejects the raw Razorpay entity on an order', async () => {
    const raw = { ...f.customerOrder, payment: { method: 'card', email: 'shopper@demo.pageaters.com', contact: '9000000000', card: {} } };
    const error: unknown = await validatingClient(raw)
      .orders.detail({ uniqueId: 'OD-0000000001' })
      .catch((e: unknown) => e);
    assert.ok(isApiError(error));
    assert.equal(error.code, ClientErrorCode.VALIDATION_FAILED);
  });
});
