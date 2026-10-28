import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BookAvailability, OrderStatus } from './enums.ts';
import {
  cartResponseSchema,
  favoritesListResponseSchema,
  populatedCartSchema,
  populatedCustomerOrderListItemSchema,
  populatedCustomerOrderSchema,
  populatedFavoritesSchema,
} from './populated.ts';

// Fictional fixtures shaped like the controllers' populated responses.
const id = (n: number) => `64d0000000000000000${String(n).padStart(5, '0')}`;
const now = '2026-10-28T10:00:00.000Z';
const blob = (name: string) => `https://abc123.public.blob.vercel-storage.com/catalog/${name}.png`;
const preferences = { preferredAuthors: '', preferredGenres: 'Fantasy', favoriteBooks: '', ignoredBooks: '' };

const author = { _id: id(1), name: 'An Author', avatar: blob('author') };
const book = {
  _id: id(2),
  bookId: 'PE-0001',
  title: 'A Book',
  poster: blob('book'),
  author,
  currentDiscount: 15,
  price: 399,
};
const bundle = {
  _id: id(3),
  bundleId: 'PB-0001',
  title: 'A Bundle',
  poster: blob('bundle'),
  bundledBooks: [id(2)],
  currentDiscount: 10,
  price: 999,
};
const addOn = { _id: id(4), name: 'Gift wrap', poster: '', currentDiscount: 0, price: 49 };
const box = { _id: id(5), boxId: 'MB-0001', title: 'A Box', images: [blob('box')], currentDiscount: 0, price: 799 };
const address = {
  _id: id(6),
  userId: id(7),
  fullName: 'Demo Shopper',
  contactNo: '9000000000',
  email: 'shopper@demo.pageaters.com',
  addressLine1: '42 Demo Lane',
  addressLine2: 'Indiranagar',
  landmark: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pinCode: '560038',
  country: 'IN',
  type: 'HOME',
  isDefault: true,
  isDeleted: false,
  deletedAt: '',
  createdAt: now,
  updatedAt: now,
};

void describe('populatedCartSchema', () => {
  const addedOn = 'Wed Oct 28 2026 15:30:00 GMT+0530 (India Standard Time)';
  const cart = {
    _id: id(10),
    user: id(7),
    products: [
      {
        _id: id(11),
        product: { ...book, availability: BookAvailability.AVAILABLE },
        quantity: 2,
        addedOn,
        price: 399,
        productTotal: 678,
      },
    ],
    bundles: [{ _id: id(12), bundle, quantity: 1, addedOn, total: 899 }],
    addOns: [{ _id: id(13), addOn, quantity: 1, addedOn, price: 49, total: 49 }],
    mysteryBoxes: [{ _id: id(14), box, quantity: 1, addedOn, preferences, price: 799, total: 799 }],
    subTotal: 2425,
    isDeleted: false,
    deletedAt: '',
    createdAt: now,
    updatedAt: now,
  };

  void it('parses GET /cart with every line kind populated', () => {
    const body = { statusCode: 200, status: 'CART_FETCHED', message: 'Cart fetched', data: cart };
    assert.deepEqual(cartResponseSchema.parse(body), body);
  });

  void it('rejects lines whose references are still ids', () => {
    assert.equal(populatedCartSchema.safeParse({ ...cart, bundles: [{ ...cart.bundles[0], bundle: id(3) }] }).success, false);
  });

  void it('requires availability on cart books, which the order select leaves out', () => {
    const line = { ...cart.products[0], product: book };
    assert.equal(populatedCartSchema.safeParse({ ...cart, products: [line] }).success, false);
  });
});

void describe('populated customer orders', () => {
  const order = {
    _id: id(20),
    orderId: 'OD-1234567890',
    orderStatus: OrderStatus.CONFIRMED,
    orderDate: now,
    deliveryAddress: address,
    deliveryInstructions: '',
    shipmentTrackingId: '',
    products: [{ _id: id(21), product: book, quantity: 2, price: 399, discount: 15, productTotal: 678.3, weight: 600 }],
    bundles: [{ _id: id(22), bundle, quantity: 1, price: 999, discount: 10, total: 899.1, weight: 1200 }],
    addOns: [{ _id: id(23), addOn, quantity: 1, price: 49, discount: 0, total: 49 }],
    boxes: [{ _id: id(24), box, quantity: 1, price: 799, discount: 0, total: 799, weight: 900, preferences }],
    rentals: [],
    orderHistory: [{ _id: id(25), title: OrderStatus.CONFIRMED, description: 'We have received your order.', time: now }],
    giftOptions: { isGift: false, details: { package: '', cost: 0, message: '', from: '' } },
    payment: { method: 'cod' },
    subTotal: 2425,
    shipping: 0,
    storeCredit: 100,
    total: 2325,
    weight: 2700,
    createdAt: now,
    updatedAt: now,
  };

  void it('parses GET /orders/:uniqueId with the address and lines populated', () => {
    const parsed = populatedCustomerOrderSchema.parse(order);
    assert.equal(parsed.deliveryAddress.city, 'Bengaluru');
    assert.equal(parsed.products[0]?.product.author?.name, 'An Author');
  });

  void it('rejects an unpopulated delivery address', () => {
    assert.equal(populatedCustomerOrderSchema.safeParse({ ...order, deliveryAddress: id(6) }).success, false);
  });

  void it('parses a GET /orders/list item, which selects no add-on lines', () => {
    const listItem = populatedCustomerOrderListItemSchema.parse(order);
    assert.equal('addOns' in listItem, false);
    assert.equal(listItem.boxes[0]?.box.boxId, 'MB-0001');
  });
});

void describe('populatedFavoritesSchema', () => {
  const wished = {
    _id: id(2),
    title: 'A Book',
    bookId: 'PE-0001',
    ISBN: '9780000000001',
    author: id(1),
    inventory: 12,
    poster: blob('book'),
    price: 399,
    popularity: 3,
    editorsPick: false,
    currentDiscount: 15,
    newRelease: true,
    preOrder: false,
    bestSeller: false,
  };

  void it('parses GET /favorites with the wishlist populated', () => {
    const body = { statusCode: 200, message: 'OK', data: { _id: id(30), wishlist: [wished] } };
    assert.deepEqual(favoritesListResponseSchema.parse(body), body);
  });

  void it('rejects a wishlist of bare ids', () => {
    assert.equal(populatedFavoritesSchema.safeParse({ _id: id(30), wishlist: [id(2)] }).success, false);
  });
});
