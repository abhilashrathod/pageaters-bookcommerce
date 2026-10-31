import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PopulatedCart, PopulatedCustomerOrder, User } from '@pageaters/shared';

import { createApiClient } from '../../index.ts';
import type { ApiClient } from '../../index.ts';
import { mockFetch } from '../../testing/mock-fetch.ts';
import { shopperEndpoints } from './index.ts';
import { id } from '../../testing/shopper-fixtures.ts';

const BASE = 'https://api.example.test/api/v1';

// Compile-time only: `typecheck` fails if the inferred client types drift.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Result<F extends (...args: never[]) => Promise<unknown>> = Awaited<ReturnType<F>>;
const _orderDetail: Same<Result<ApiClient['orders']['detail']>, PopulatedCustomerOrder> = true;
const _cartDetail: Same<Result<ApiClient['cart']['detail']>, PopulatedCart> = true;
const _cartAdd: Same<Result<ApiClient['cart']['add']>, true> = true;
const _cartAddOn: Same<Result<ApiClient['cart']['addAddOn']>, true> = true;
const _me: Same<Result<ApiClient['auth']['me']>, User> = true;
const _check: Same<Result<ApiClient['favorites']['check']>, boolean> = true;
const _cartAddInput: Same<Parameters<ApiClient['cart']['add']>[0], { product: string; quantity?: number }> = true;

function typeErrors(client: ApiClient) {
  // @ts-expect-error a cart quantity is a number
  void client.cart.add({ product: id(3), quantity: 'lots' });
  // @ts-expect-error the product is required to add to the cart
  void client.cart.add({ quantity: 1 });
  // @ts-expect-error the search term is a path param
  void client.categories.search({});
  // @ts-expect-error a return request is 'return' or 'replace', never 'cancel'
  void client.orders.requestReturn({ uniqueId: 'OD-0000000001', type: 'cancel', reason: 'x', comments: '' });
  // @ts-expect-error placing an order needs the gift options (the legacy controller fails without them)
  void client.orders.create({ method: 'cod' });
  // @ts-expect-error the book list's `type` is a product type
  void client.books.list({ type: 'magazine' });
}
void typeErrors;

type Row = [label: string, call: (client: ApiClient) => Promise<unknown>, method: string, url: string, body?: unknown];

const book = id(3);
const addressId = id(21);
const newAddress = {
  fullName: 'Demo Shopper',
  contactNo: '9000000000',
  email: 'shopper@demo.pageaters.com',
  city: 'Bengaluru',
  state: 'Karnataka',
  pinCode: '560001',
  isDefault: true,
  addressLine1: '42 Demo Lane',
};

// Every shopper endpoint: method, URL (path and query) and JSON body. Path params never leak into the body.
const rows: Row[] = [
  [
    'books.list',
    (c) => c.books.list({ page: 2, limit: 20, sortBy: 'popularity', sortOrder: -1, type: 'book_box' }),
    'GET',
    '/store-books?page=2&limit=20&sortBy=popularity&sortOrder=-1&type=book_box',
  ],
  ['books.detail', (c) => c.books.detail({ id: 'BK-0000000001' }), 'GET', '/store-books/unique/BK-0000000001'],
  ['books.search', (c) => c.books.search({ q: 'harry potter' }), 'GET', '/store-books/search?q=harry+potter'],
  ['authors.list', (c) => c.authors.list({ sortBy: 'name', sortOrder: 1 }), 'GET', '/authors?sortBy=name&sortOrder=1'],
  ['authors.detail', (c) => c.authors.detail({ id: 'AU-0000000001' }), 'GET', '/authors/unique/AU-0000000001'],
  ['authors.search', (c) => c.authors.search({ q: 'tol' }), 'GET', '/authors/search?q=tol'],
  ['categories.list', (c) => c.categories.list({ limit: 50 }), 'GET', '/categories?limit=50'],
  ['categories.detail', (c) => c.categories.detail({ id: 'CA-0000000001' }), 'GET', '/categories/unique/CA-0000000001'],
  [
    'categories.products',
    (c) => c.categories.products({ id: id(2), page: 1, sortBy: 'price', sortOrder: 1 }),
    'GET',
    `/categories/${id(2)}/products?page=1&sortBy=price&sortOrder=1`,
  ],
  [
    'categories.overview',
    (c) => c.categories.overview({ id: id(2), limit: 8, sortOrder: -1 }),
    'GET',
    `/categories/${id(2)}/overview?limit=8&sortOrder=-1`,
  ],
  ['categories.search', (c) => c.categories.search({ q: 'sci fi' }), 'GET', '/categories/search/sci%20fi'],
  ['collections.list', (c) => c.collections.list({ category: id(2) }), 'GET', `/collections?category=${id(2)}`],
  ['collections.detail', (c) => c.collections.detail({ id: 'CL-0000000001' }), 'GET', '/collections/unique/CL-0000000001'],
  ['collections.search', (c) => c.collections.search({ q: 'summer' }), 'GET', '/collections/search/summer'],
  ['bundles.list', (c) => c.bundles.list({ category: id(2), page: 3 }), 'GET', `/bundles?category=${id(2)}&page=3`],
  ['bundles.detail', (c) => c.bundles.detail({ id: 'BN-0000000001' }), 'GET', '/bundles/unique/BN-0000000001'],
  ['bundles.search', (c) => c.bundles.search({ q: 'duo' }), 'GET', '/bundles/search/duo'],
  ['productSets.detail', (c) => c.productSets.detail({ id: 'PS-0000000001' }), 'GET', '/product-sets/unique/PS-0000000001'],
  ['productSets.detailBySlug', (c) => c.productSets.detailBySlug({ slug: 'new-releases' }), 'GET', '/product-sets/slug/new-releases'],
  ['deals.list', (c) => c.deals.list({ sortBy: 'priority' }), 'GET', '/deals?sortBy=priority'],
  ['deals.detail', (c) => c.deals.detail({ id: 'DL-0000000001' }), 'GET', '/deals/unique/DL-0000000001'],
  ['addOns.grouped', (c) => c.addOns.grouped({ productId: book }), 'GET', `/add-ons/produtct/${book}`],
  ['mysteryBoxes.list', (c) => c.mysteryBoxes.list({ page: 1, limit: 5 }), 'GET', '/mystery-boxes?page=1&limit=5'],
  ['mysteryBoxes.detail', (c) => c.mysteryBoxes.detail({ id: 'MB-0000000001' }), 'GET', '/mystery-boxes/unique/MB-0000000001'],

  [
    'auth.register',
    (c) => c.auth.register({ email: 'shopper@demo.pageaters.com', password: 'secret-1', fullName: 'Demo Shopper' }),
    'POST',
    '/auth/register',
    { email: 'shopper@demo.pageaters.com', password: 'secret-1', fullName: 'Demo Shopper' },
  ],
  [
    'auth.login',
    (c) => c.auth.login({ email: 'shopper@demo.pageaters.com', password: 'secret-1' }),
    'POST',
    '/auth/login',
    { email: 'shopper@demo.pageaters.com', password: 'secret-1' },
  ],
  ['auth.demoLogin', (c) => c.auth.demoLogin(), 'POST', '/auth/demo-login'],
  [
    'auth.verifyEmail',
    (c) => c.auth.verifyEmail({ email: 'shopper@demo.pageaters.com', token: 'tok' }),
    'POST',
    '/auth/verify-email',
    { email: 'shopper@demo.pageaters.com', token: 'tok' },
  ],
  [
    'auth.resendVerificationEmail',
    (c) => c.auth.resendVerificationEmail({ email: 'shopper@demo.pageaters.com' }),
    'POST',
    '/auth/verify-email/resend',
    { email: 'shopper@demo.pageaters.com' },
  ],
  [
    'auth.forgotPassword',
    (c) => c.auth.forgotPassword({ email: 'shopper@demo.pageaters.com' }),
    'POST',
    '/auth/forgot-password',
    { email: 'shopper@demo.pageaters.com' },
  ],
  [
    'auth.resendForgotPassword',
    (c) => c.auth.resendForgotPassword({ email: 'shopper@demo.pageaters.com' }),
    'POST',
    '/auth/forgot-password/resend',
    { email: 'shopper@demo.pageaters.com' },
  ],
  [
    'auth.resetPassword',
    (c) =>
      c.auth.resetPassword({ token: 'tok', email: 'shopper@demo.pageaters.com', newPassword: 'secret-2', confirmPassword: 'secret-2' }),
    'POST',
    '/auth/reset-password',
    { token: 'tok', email: 'shopper@demo.pageaters.com', newPassword: 'secret-2', confirmPassword: 'secret-2' },
  ],
  [
    'auth.sendContactOtp',
    (c) => c.auth.sendContactOtp({ contactNo: '9000000000' }),
    'POST',
    '/auth/contact/send',
    { contactNo: '9000000000' },
  ],
  ['auth.resendContactOtp', (c) => c.auth.resendContactOtp(), 'POST', '/auth/contact/resend'],
  ['auth.verifyContact', (c) => c.auth.verifyContact({ otp: '123456' }), 'POST', '/auth/contact/verify', { otp: '123456' }],
  ['auth.logout', (c) => c.auth.logout(), 'POST', '/auth/logout', {}],
  ['auth.me', (c) => c.auth.me(), 'GET', '/auth/me'],
  ['auth.updateProfile', (c) => c.auth.updateProfile({ fullName: 'Demo Reader' }), 'PUT', '/auth/me', { fullName: 'Demo Reader' }],
  [
    'auth.updatePassword',
    (c) => c.auth.updatePassword({ password: 'secret-1', newPassword: 'secret-2', confirmPassword: 'secret-2' }),
    'PUT',
    '/auth/password',
    { password: 'secret-1', newPassword: 'secret-2', confirmPassword: 'secret-2' },
  ],

  ['cart.detail', (c) => c.cart.detail(), 'GET', '/cart/retrieve'],
  ['cart.add', (c) => c.cart.add({ product: book, quantity: 2 }), 'POST', '/cart/add', { product: book, quantity: 2 }],
  ['cart.addBundle', (c) => c.cart.addBundle({ bundle: id(4) }), 'POST', '/cart/add/bundle', { bundle: id(4) }],
  [
    'cart.addBox',
    (c) => c.cart.addBox({ box: id(12), preferences: { preferredGenres: 'Fantasy' } }),
    'POST',
    '/cart/add/box',
    { box: id(12), preferences: { preferredGenres: 'Fantasy' } },
  ],
  ['cart.addAddOn', (c) => c.cart.addAddOn({ addOn: id(11), quantity: 3 }), 'POST', '/cart/add/addOn', { addOn: id(11), quantity: 3 }],
  ['cart.updateQuantity', (c) => c.cart.updateQuantity({ product: book, quantity: 1 }), 'PUT', `/cart/update/${book}`, { quantity: 1 }],
  [
    'cart.updateAddOnQuantity',
    (c) => c.cart.updateAddOnQuantity({ addOn: id(11), quantity: 4 }),
    'PUT',
    `/cart/update/addOn/${id(11)}`,
    { quantity: 4 },
  ],
  ['cart.remove', (c) => c.cart.remove({ product: book }), 'DELETE', `/cart/remove/${book}`],
  ['cart.removeBundle', (c) => c.cart.removeBundle({ bundle: id(4) }), 'DELETE', `/cart/remove/bundle/${id(4)}`],
  ['cart.removeBox', (c) => c.cart.removeBox({ box: id(12) }), 'DELETE', `/cart/remove/box/${id(12)}`],
  ['cart.removeAddOn', (c) => c.cart.removeAddOn({ addOn: id(11) }), 'DELETE', `/cart/remove/addOn/${id(11)}`],
  ['cart.empty', (c) => c.cart.empty(), 'DELETE', '/cart/empty'],
  ['cart.clear', (c) => c.cart.clear(), 'DELETE', '/cart/clear'],

  ['favorites.list', (c) => c.favorites.list(), 'GET', '/favorites'],
  ['favorites.check', (c) => c.favorites.check({ product: book }), 'GET', `/favorites/${book}`],
  ['favorites.add', (c) => c.favorites.add({ product: book }), 'POST', '/favorites', { product: book }],
  ['favorites.remove', (c) => c.favorites.remove({ product: book }), 'DELETE', `/favorites/${book}`],

  ['addresses.list', (c) => c.addresses.list(), 'GET', '/addresses'],
  ['addresses.detail', (c) => c.addresses.detail({ id: addressId }), 'GET', `/addresses/${addressId}`],
  ['addresses.create', (c) => c.addresses.create(newAddress), 'POST', '/addresses', newAddress],
  ['addresses.update', (c) => c.addresses.update({ id: addressId, ...newAddress }), 'PUT', `/addresses/${addressId}`, newAddress],
  ['addresses.remove', (c) => c.addresses.remove({ id: addressId }), 'DELETE', `/addresses/${addressId}`],
  ['addresses.makeDefault', (c) => c.addresses.makeDefault({ id: addressId }), 'PATCH', `/addresses/${addressId}`],
  ['addresses.checkPincode', (c) => c.addresses.checkPincode({ pincode: '560001' }), 'GET', '/addresses/check-pincode/560001'],

  ['orders.detail', (c) => c.orders.detail({ uniqueId: 'OD-0000000001' }), 'GET', '/orders/getByUniqueId/OD-0000000001'],
  ['orders.list', (c) => c.orders.list(), 'GET', '/orders/list'],
  ['orders.attempt', (c) => c.orders.attempt({ address: addressId }), 'POST', '/orders/attempt', { address: addressId }],
  ['orders.checkout', (c) => c.orders.checkout(), 'GET', '/orders/retrieve'],
  [
    'orders.applyStoreCredit',
    (c) => c.orders.applyStoreCredit({ uniqueId: 'OD-0000000002', amount: 100 }),
    'PATCH',
    '/orders/credit',
    { uniqueId: 'OD-0000000002', amount: 100 },
  ],
  [
    'orders.create',
    (c) => c.orders.create({ method: 'online', giftOptions: { isGift: false } }),
    'POST',
    '/orders/create',
    { method: 'online', giftOptions: { isGift: false } },
  ],
  [
    'orders.requestReturn',
    (c) => c.orders.requestReturn({ uniqueId: 'OD-0000000001', type: 'return', reason: 'Damaged', comments: 'Torn cover', books: [book] }),
    'POST',
    '/orders/return/OD-0000000001',
    { type: 'return', reason: 'Damaged', comments: 'Torn cover', books: [book] },
  ],
  [
    'orders.cancel',
    (c) => c.orders.cancel({ uniqueId: 'OD-0000000001', reason: 'Changed my mind', comments: '' }),
    'POST',
    '/orders/cancel/OD-0000000001',
    { reason: 'Changed my mind', comments: '' },
  ],

  ['storeCredit.balance', (c) => c.storeCredit.balance(), 'GET', '/store-credit'],
  ['storeCredit.history', (c) => c.storeCredit.history({ page: 2 }), 'GET', '/store-credit/history?page=2'],
  ['stockAlerts.check', (c) => c.stockAlerts.check({ product: book }), 'GET', `/stock-alerts/${book}`],
  ['stockAlerts.subscribe', (c) => c.stockAlerts.subscribe({ product: book }), 'POST', '/stock-alerts', { product: book }],
  ['stockAlerts.unsubscribe', (c) => c.stockAlerts.unsubscribe({ product: book }), 'DELETE', `/stock-alerts/${book}`],
  [
    'subscribers.subscribe',
    (c) => c.subscribers.subscribe({ email: 'shopper@demo.pageaters.com' }),
    'POST',
    '/subscribers',
    { email: 'shopper@demo.pageaters.com' },
  ],
];

void describe('shopper endpoints: requests', () => {
  void it('covers every shopper endpoint exactly once', () => {
    // The shopper registry itself, so resources mounted beside it (`admin`, `request`) don't count.
    const defined = Object.entries(shopperEndpoints).flatMap(([resource, group]) =>
      Object.keys(group).map((name) => `${resource}.${name}`),
    );
    assert.deepEqual([...rows.map(([label]) => label)].sort(), defined.sort());
  });

  for (const [label, call, method, url, body] of rows) {
    void it(`${label} → ${method} ${url}`, async () => {
      const { fetch, calls } = mockFetch();
      await call(createApiClient({ baseUrl: BASE, fetch }));
      assert.equal(calls.length, 1);
      assert.equal(calls[0]?.init.method, method);
      assert.equal(calls[0]?.url, `${BASE}${url}`);
      const sent = calls[0]?.init.body;
      assert.deepEqual(sent === undefined ? undefined : JSON.parse(sent as string), body);
      if (body !== undefined) assert.equal(calls[0]?.init.headers.get('content-type'), 'application/json');
    });
  }
});
