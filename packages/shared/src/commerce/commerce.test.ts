import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addressSchema } from './address.ts';
import { cartSchema } from './cart.ts';
import { favoritesSchema } from './favorites.ts';
import { giftCardSchema } from './gift-card.ts';
import { stockAlertSchema, stockAlertSummarySchema } from './stock-alert.ts';
import { StoreCreditAction, storeCreditSchema } from './store-credit.ts';
import { subscriberSchema } from './subscriber.ts';

// Fixtures follow the seed's demo shopper (seed/src/accounts.ts): fixed IDs, fictional address, placeholder phone.
const shopper = '64d000000000000000000a01';
const book = '64d000000000000000000e01';
const now = '2026-10-28T10:00:00.000Z';
const stamps = { createdAt: now, updatedAt: now };
const legacyDate = 'Wed Oct 28 2026 15:30:00 GMT+0530 (India Standard Time)';

void describe('addressSchema', () => {
  const address = {
    _id: '64d000000000000000000b01',
    userId: shopper,
    fullName: 'Demo Shopper',
    contactNo: '9000000000',
    email: 'shopper@demo.pageaters.com',
    addressLine1: '42 Demo Lane',
    addressLine2: 'Indiranagar',
    landmark: 'Near the demo bookshop',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560038',
    country: 'IN',
    type: 'HOME',
    isDefault: true,
    isDeleted: false,
    deletedAt: '',
    ...stamps,
  };

  void it("accepts the demo shopper's address", () => {
    assert.ok(addressSchema.safeParse(address).success);
  });

  void it('rejects an unknown type, a malformed phone and a bad user ID', () => {
    assert.equal(addressSchema.safeParse({ ...address, type: 'WORK' }).success, false);
    assert.equal(addressSchema.safeParse({ ...address, contactNo: '+91 9000000000' }).success, false);
    assert.equal(addressSchema.safeParse({ ...address, userId: 'shopper' }).success, false);
  });
});

void describe('cartSchema', () => {
  const empty = {
    _id: '64d000000000000000000c01',
    user: shopper,
    products: [],
    addOns: [],
    bundles: [],
    mysteryBoxes: [],
    subTotal: 0,
    isDeleted: false,
    deletedAt: '',
    ...stamps,
  };
  const line = { _id: '64d000000000000000000c02', product: book, quantity: 2, addedOn: legacyDate };

  void it("accepts the demo shopper's empty cart and a cart line with GET /cart's computed prices", () => {
    assert.ok(cartSchema.safeParse(empty).success);
    const filled = { ...empty, products: [{ ...line, price: 399, productTotal: 678 }], subTotal: 678 };
    assert.ok(cartSchema.safeParse(filled).success);
  });

  void it('rejects zero or fractional quantities and negative money', () => {
    assert.equal(cartSchema.safeParse({ ...empty, products: [{ ...line, quantity: 0 }] }).success, false);
    assert.equal(cartSchema.safeParse({ ...empty, products: [{ ...line, quantity: 1.5 }] }).success, false);
    assert.equal(cartSchema.safeParse({ ...empty, subTotal: -1 }).success, false);
    assert.equal(cartSchema.safeParse({ ...empty, products: [{ ...line, productTotal: -10 }] }).success, false);
  });

  void it('requires preferences on a mystery box line', () => {
    const box = { _id: '64d000000000000000000c03', box: book, quantity: 1, addedOn: legacyDate };
    assert.equal(cartSchema.safeParse({ ...empty, mysteryBoxes: [box] }).success, false);
    const preferences = { preferredAuthors: '', preferredGenres: '', favoriteBooks: '', ignoredBooks: '' };
    assert.ok(cartSchema.safeParse({ ...empty, mysteryBoxes: [{ ...box, preferences }] }).success);
  });
});

void describe('favoritesSchema', () => {
  const favorites = {
    _id: '64d000000000000000000d01',
    userId: shopper,
    wishlist: [book],
    deals: [],
    collections: [],
    bundles: [],
    ...stamps,
  };

  void it('accepts favourites with wishlisted book IDs', () => {
    assert.ok(favoritesSchema.safeParse(favorites).success);
  });

  void it('rejects non-ID wishlist entries', () => {
    assert.equal(favoritesSchema.safeParse({ ...favorites, wishlist: ['the-hobbit'] }).success, false);
  });
});

void describe('storeCreditSchema', () => {
  const debit = {
    _id: '64d000000000000000000f01',
    creditId: 'SC-1234567890',
    userId: shopper,
    orderId: '64d000000000000000000f02',
    amount: 100,
    action: StoreCreditAction.DEBIT,
    expired: false,
    expiredAt: '',
    ...stamps,
  };

  void it('accepts a debit and a credit issued without an order', () => {
    assert.ok(storeCreditSchema.safeParse(debit).success);
    const { orderId: _orderId, ...issued } = debit;
    assert.ok(storeCreditSchema.safeParse({ ...issued, creditId: 'CR-1234567890', action: StoreCreditAction.CREDIT }).success);
  });

  void it('rejects negative amounts, unknown actions and malformed credit IDs', () => {
    assert.equal(storeCreditSchema.safeParse({ ...debit, amount: -100 }).success, false);
    for (const action of ['credit', 'REFUND', '']) assert.equal(storeCreditSchema.safeParse({ ...debit, action }).success, false, action);
    assert.equal(storeCreditSchema.safeParse({ ...debit, creditId: 'SC-12' }).success, false);
  });
});

void describe('giftCardSchema', () => {
  void it('accepts the placeholder model and rejects a missing ID', () => {
    assert.ok(giftCardSchema.safeParse({ _id: '64d000000000000000000f03', giftCardId: 'GC-1' }).success);
    assert.equal(giftCardSchema.safeParse({ giftCardId: 'GC-1' }).success, false);
  });
});

void describe('subscriberSchema', () => {
  void it('accepts an email subscriber and rejects a non-email', () => {
    assert.ok(subscriberSchema.safeParse({ _id: '64d000000000000000000f04', email: 'owner@example.com', ...stamps }).success);
    assert.equal(subscriberSchema.safeParse({ _id: '64d000000000000000000f04', email: 'not-an-email', ...stamps }).success, false);
  });
});

void describe('stockAlertSchema', () => {
  const alert = { _id: '64d000000000000000000f05', user: shopper, product: book, isDeleted: true, deletedAt: legacyDate, ...stamps };

  void it('accepts an alert and the admin per-product summary', () => {
    assert.ok(stockAlertSchema.safeParse(alert).success);
    assert.ok(stockAlertSummarySchema.safeParse({ _id: book, totalProducts: 3 }).success);
  });

  void it('rejects a non-ID product and an empty summary count', () => {
    assert.equal(stockAlertSchema.safeParse({ ...alert, product: 'book' }).success, false);
    assert.equal(stockAlertSummarySchema.safeParse({ _id: book, totalProducts: 0 }).success, false);
  });
});
