import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bindEndpoints } from '../../core/endpoint.ts';
import { createRequester } from '../../core/http.ts';
import { mockFetch, ok } from '../../testing/mock-fetch.ts';
import { adminEndpoints } from './index.ts';

// Every distinct admin response schema parses a fictional fixture with validation on (no network). Placeholders
// only: owner@example.com, shopper@demo.pageaters.com, 9000000000, fictional addresses and example.test images.

const BASE = 'https://api.example.test/api/v1';
const at = '2026-10-28T10:00:00.000Z';
const id = (n: number) => `64d0000000000000000000${n.toString().padStart(2, '0')}`;
const img = (name: string) => `https://images.example.test/${name}.jpg`;

function adminClient(data: unknown) {
  const mock = mockFetch(() => ok(data));
  return bindEndpoints({ admin: adminEndpoints }, createRequester({ baseUrl: BASE, fetch: mock.fetch, validate: true })).admin;
}
type Admin = ReturnType<typeof adminClient>;

// Compile time: an admin user list item never has credential keys.
type UserListItem = Awaited<ReturnType<Admin['users']['list']>>['docs'][number];
type Lacks<T, Key extends PropertyKey> = Key extends keyof T ? false : true;
const _noPassword: Lacks<UserListItem, 'password' | 'salt' | 'contactOtp' | 'forgotPasswordToken' | 'razorPayCustId'> = true;
type SearchItem = Awaited<ReturnType<Admin['users']['search']>>[number];
const _noSearchPassword: Lacks<SearchItem, 'password' | 'salt'> = true;
type DetailsUser = NonNullable<Awaited<ReturnType<Admin['users']['detail']>>['user']>;
const _noDetailsPassword: Lacks<DetailsUser, 'password' | 'salt'> = true;
type BookDetail = Awaited<ReturnType<Admin['storeBooks']['detail']>>;
const _noWholesale: Lacks<BookDetail, 'wholeSalePriceHistory' | 'isDeleted' | 'deletedAt'> = true;
void [_noPassword, _noSearchPassword, _noDetailsPassword, _noWholesale];

const page = <T>(docs: T[]) => ({
  docs,
  totalDocs: docs.length,
  limit: 10,
  totalPages: 1,
  page: 1,
  pagingCounter: 1,
  hasPrevPage: false,
  hasNextPage: false,
  prevPage: null,
  nextPage: null,
});
const stamps = { createdAt: at, updatedAt: at };

const credentials = {
  password: 'placeholder-hash',
  salt: 'placeholder-salt',
  contactOtp: '000000',
  verifyEmailToken: 'placeholder-token',
  forgotPasswordToken: 'placeholder-token',
  razorPayCustId: 'cust_placeholder',
};
const user = {
  _id: id(1),
  email: 'shopper@demo.pageaters.com',
  fullName: 'Demo Shopper',
  contactNo: '9000000000',
  dateOfBirth: '',
  gender: '',
  emailVerified: true,
  contactVerified: true,
  storeCredit: 0,
  lastLoginAt: at,
  lastPasswordSetAt: '',
  role: 'USER',
  status: 'ACTIVE',
  ...stamps,
};
const admin = { ...user, _id: id(9), email: 'owner@example.com', fullName: 'Owner', role: 'ADMIN' };
const customer = { _id: id(1), fullName: 'Demo Shopper', email: 'shopper@demo.pageaters.com', contactNo: '9000000000' };

const address = {
  _id: id(2),
  userId: id(1),
  fullName: 'Demo Shopper',
  contactNo: '9000000000',
  email: 'shopper@demo.pageaters.com',
  addressLine1: '1 Example Street',
  addressLine2: 'Flat 2',
  landmark: 'Near the sample park',
  city: 'Sampleton',
  state: 'Placeholder State',
  pinCode: '000000',
  country: 'IN',
  type: 'HOME',
  isDefault: true,
  isDeleted: false,
  deletedAt: '',
  ...stamps,
};

const bookFields = {
  _id: id(10),
  ...stamps,
  bookId: 'BK-0000000001',
  type: 'book',
  title: 'The Placeholder Atlas',
  blindTitle: '',
  tagline: '',
  eyebrow: '',
  description: 'A fictional book.',
  tags: ['maps'],
  message: '',
  language: 'English',
  pages: 320,
  readingLevel: 'Beginner',
  version: 'paperback',
  books: -1,
  dimensions: '12.9 x 2.3 x 19.7',
  weight: 300,
  ISBN: '0000000000000',
  publicationYear: '2020',
  publisher: 'Example House',
  editorsPick: false,
  bestSeller: true,
  newRelease: false,
  preOrder: false,
  bookOfTheMonth: false,
  availability: 'available',
  poster: img('atlas'),
  images: [],
  totalReviews: 0,
  averageReviews: 0,
  inventory: 12,
  currentDiscount: 10,
  popularity: 5,
  priority: 1,
  price: 499,
  rentPrice: 0,
  membersPrice: 449,
  membersRentPrice: 0,
};
// GET /store-books/get/:id as the legacy API sends it: supplier prices and soft-delete flags included.
const book = {
  ...bookFields,
  wholeSalePriceHistory: [1],
  isDeleted: false,
  deletedAt: '',
  author: { _id: id(11), authorId: 'AU-0000000001', name: 'A. Writer', avatar: img('writer') },
  categories: [{ _id: id(12), categoryId: 'CA-0000000001', title: 'Maps' }],
  relatedBooks: [id(13)],
  relatedBundles: [],
  relatedCollections: [{ _id: id(14), collectionId: 'CL-0000000001', title: 'Rainy days', poster: img('rain'), books: [] }],
  bundledBooks: [],
};

const author = {
  _id: id(11),
  ...stamps,
  authorId: 'AU-0000000001',
  name: 'A. Writer',
  intro: 'Writes placeholders.',
  avatar: img('writer'),
  priority: 0,
  popularity: 0,
  books: [{ _id: id(10), title: 'The Placeholder Atlas' }],
};

const category = {
  _id: id(12),
  ...stamps,
  categoryId: 'CA-0000000001',
  title: 'Maps',
  description: '',
  thumbnail: img('maps'),
  priority: 1,
  popularity: 0,
  numberOfBooks: 1,
  meta: { title: 'Maps', description: '', imageUrl: '', url: '' },
};

const collection = {
  _id: id(14),
  ...stamps,
  collectionId: 'CL-0000000001',
  title: 'Rainy days',
  description: '',
  tags: [],
  poster: img('rain'),
  priority: 0,
  popularity: 0,
  books: [id(10)],
  relatedCollections: [],
  relatedCategories: [id(12)],
  featuredAuthors: [],
};

const bundle = {
  _id: id(15),
  ...stamps,
  bundleId: 'BL-0000000001',
  title: 'Starter pack',
  description: '',
  tags: [],
  poster: img('pack'),
  currentDiscount: 5,
  weight: 600,
  popularity: 0,
  priority: 0,
  price: 899,
  membersPrice: 849,
  bundledBooks: [{ _id: id(10), title: 'The Placeholder Atlas', bookId: 'BK-0000000001', price: 499 }],
  categories: [],
  relatedCollections: [],
  relatedBundles: [],
};

const mysteryBox = {
  _id: id(16),
  ...stamps,
  boxId: 'SET-0000000001',
  title: 'Surprise three',
  description: '',
  tags: [],
  images: [img('box')],
  currentDiscount: 0,
  weight: 900,
  inventory: 4,
  price: 999,
  books: 3,
};

const productSet = {
  _id: id(17),
  ...stamps,
  setId: 'SET-0000000002',
  slug: 'new-releases-abc123',
  title: 'New releases',
  description: '',
  products: [
    { _id: id(18), priority: 1, product: { _id: id(10), title: 'The Placeholder Atlas', author: { _id: id(11), name: 'A. Writer' } } },
  ],
  categories: [{ _id: id(12), categoryId: 'CA-0000000001', title: 'Maps' }],
};

const deal = {
  _id: id(19),
  ...stamps,
  dealId: 'DE-0000000001',
  poster: img('deal'),
  ctaLink: '/collections/rainy-days',
  ctaText: 'Shop now',
  title: 'Monsoon sale',
  description: '',
  priority: 1,
  productSets: [{ _id: id(20), priority: 1, set: { ...productSet, products: [{ _id: id(18), priority: 1, product: id(10) }] } }],
  categories: [],
};

const addOn = {
  _id: id(21),
  ...stamps,
  addOnId: 'AO-0000000001',
  name: 'Bookmark',
  description: '',
  poster: '',
  category: 'Stationery',
  priority: 0,
  price: 49,
  currentDiscount: 0,
  inventory: 10,
};

const orderLineBook = { _id: id(10), bookId: 'BK-0000000001', title: 'The Placeholder Atlas', currentDiscount: 10, price: 499 };
const orderBase = {
  _id: id(30),
  orderId: 'OD-0000000001',
  userId: id(1),
  orderStatus: 'paid',
  orderDate: at,
  deliveryAddress: address,
  deliveryInstructions: '',
  shipmentTrackingId: '',
  products: [{ _id: id(31), product: id(10), quantity: 1, price: 499, discount: 10, productTotal: 449.1, weight: 300 }],
  bundles: [],
  addOns: [{ _id: id(32), addOn: id(21), quantity: 1, price: 49, discount: 0, total: 49 }],
  boxes: [],
  rentals: [],
  orderHistory: [{ _id: id(33), title: 'paid', description: 'Payment received', time: at }],
  requests: [],
  giftOptions: { isGift: false, details: { package: '', cost: 0, message: '', from: '' } },
  razorOrderId: 'order_placeholder',
  razorPaymentId: 'pay_placeholder',
  payment: { method: 'card', name: 'Demo Shopper', last4: '0000', network: 'Visa' },
  giftCard: null,
  discount: null,
  storeCreditTransaction: null,
  subTotal: 449.1,
  shipping: 50,
  storeCredit: 0,
  total: 548.1,
  weight: 300,
  ...stamps,
};
const orderListItem = {
  _id: id(30),
  orderId: 'OD-0000000001',
  orderDate: at,
  userId: customer,
  deliveryAddress: address,
  orderStatus: 'paid',
  products: [{ ...orderBase.products[0], product: orderLineBook }],
  bundles: [],
  addOns: [{ ...orderBase.addOns[0], addOn: { _id: id(21), name: 'Bookmark', poster: '', currentDiscount: 0, price: 49 } }],
  boxes: [],
  total: 548.1,
};
const orderDetail = {
  ...orderBase,
  products: [
    {
      ...orderBase.products[0],
      product: { ...orderLineBook, poster: img('atlas'), author: { _id: id(11), name: 'A. Writer', avatar: img('writer') } },
    },
  ],
  addOns: orderListItem.addOns,
};

const cartBase = {
  _id: id(40),
  user: id(1),
  products: [{ _id: id(41), product: id(10), quantity: 1, addedOn: 'Wed Oct 28 2026 10:00:00 GMT+0530' }],
  bundles: [],
  addOns: [],
  mysteryBoxes: [],
  subTotal: 449,
  isDeleted: false,
  deletedAt: '',
  ...stamps,
};
const populatedCart = {
  ...cartBase,
  products: [
    {
      ...cartBase.products[0],
      product: {
        ...orderLineBook,
        poster: img('atlas'),
        availability: 'available',
        author: { _id: id(11), name: 'A. Writer', avatar: img('writer') },
      },
      price: 499,
      productTotal: 449,
    },
  ],
};

const stockAlert = {
  _id: id(50),
  user: customer,
  product: { _id: id(10), title: 'The Placeholder Atlas', bookId: 'BK-0000000001', poster: img('atlas'), price: 499, currentDiscount: 10 },
  isDeleted: false,
  deletedAt: '',
  ...stamps,
};

interface Case {
  name: string;
  data: unknown;
  call: (a: Admin) => Promise<unknown>;
  check?: (result: unknown) => void;
}

const noKeys = (keys: string[]) => (value: unknown) => {
  for (const key of keys) assert.equal(key in (value as object), false, key);
};

const cases: Case[] = [
  {
    name: 'book (storeBooks.detail/create/update)',
    data: book,
    call: (a) => a.storeBooks.detail({ id: id(10) }),
    check: noKeys(['wholeSalePriceHistory', 'isDeleted', 'deletedAt']),
  },
  { name: 'author (authors.*)', data: author, call: (a) => a.authors.detail({ id: id(11) }) },
  { name: 'category (categories.*)', data: category, call: (a) => a.categories.detail({ id: id(12) }) },
  { name: 'collection (collections.*)', data: collection, call: (a) => a.collections.detail({ id: id(14) }) },
  { name: 'bundle (bundles.*)', data: bundle, call: (a) => a.bundles.detail({ id: id(15) }) },
  { name: 'mystery box (mysteryBoxes.*)', data: mysteryBox, call: (a) => a.mysteryBoxes.detail({ id: id(16) }) },
  { name: 'deal (deals.*)', data: deal, call: (a) => a.deals.detail({ id: id(19) }) },
  {
    name: 'product set page',
    data: page([{ ...productSet, products: [{ _id: id(18), priority: 1, product: id(10) }] }]),
    call: (a) => a.productSets.list(),
  },
  { name: 'product set (productSets.detail/create/update)', data: productSet, call: (a) => a.productSets.detail({ id: id(17) }) },
  { name: 'add-on page', data: page([addOn]), call: (a) => a.addOns.list() },
  { name: 'add-on (addOns.detail/create/update)', data: addOn, call: (a) => a.addOns.create({ name: 'Bookmark' }) },
  { name: 'acknowledgement (removes, order steps, store credit)', data: {}, call: (a) => a.authors.remove({ id: id(11) }) },
  { name: 'order page', data: page([orderListItem]), call: (a) => a.orders.list() },
  { name: 'order detail', data: orderDetail, call: (a) => a.orders.detail({ id: id(30) }) },
  {
    name: 'order search',
    data: [{ ...orderBase, userId: customer, products: orderListItem.products }],
    call: (a) => a.orders.search({ q: 'OD-00' }),
  },
  {
    name: 'order with customer (ship, deliver)',
    data: { ...orderBase, userId: customer, orderStatus: 'shipped', shipmentTrackingId: 'https://tracking.example.test/1' },
    call: (a) => a.orders.ship({ orderId: id(30), shipmentTrackingId: 'https://tracking.example.test/1' }),
  },
  {
    name: 'shipment booking (orders.createShipment)',
    data: { success: true, packages: [{ waybill: '0000000000001', status: 'Success', refnum: 'OD-0000000001' }], rmk: '' },
    call: (a) => a.orders.createShipment({ orderId: id(30), dimensions: { width: 20, height: 5, weight: 400 } }),
    check: (result) => assert.deepEqual(result, { success: true, packages: [{ waybill: '0000000000001' }] }),
  },
  {
    name: 'best selling',
    data: [{ totalQuantity: 3, bookDetails: { _id: id(10), title: 'The Placeholder Atlas', author: id(11) } }],
    call: (a) => a.orders.bestSelling({ startDate: at, endDate: at }),
  },
  { name: 'revenue', data: [{ totalRevenue: 1096.2 }], call: (a) => a.orders.revenue({ startDate: at, endDate: at }) },
  {
    name: 'cart page',
    data: page([{ ...cartBase, user: { _id: id(1), fullName: 'Demo Shopper', email: 'shopper@demo.pageaters.com' } }]),
    call: (a) => a.carts.list(),
  },
  { name: 'cart', data: populatedCart, call: (a) => a.carts.detail({ id: id(40) }), check: noKeys(['isDeleted', 'deletedAt']) },
  {
    name: 'user page',
    data: page([{ ...user, ...credentials }]),
    call: (a) => a.users.list(),
    check: (result) => noKeys(Object.keys(credentials))((result as { docs: object[] }).docs[0]),
  },
  {
    name: 'user search',
    data: [
      { ...user, ...credentials },
      { ...admin, ...credentials },
    ],
    call: (a) => a.users.search({ q: 'example' }),
    check: (result) => {
      for (const item of result as object[]) noKeys(Object.keys(credentials))(item);
    },
  },
  {
    name: 'user details',
    data: {
      user: { ...user, ...credentials },
      cart: { ...populatedCart, addOns: [{ _id: id(42), addOn: id(21), quantity: 1, addedOn: 'Wed Oct 28 2026' }] },
      addresses: [address],
      orders: [
        {
          _id: id(30),
          orderId: 'OD-0000000001',
          orderDate: at,
          deliveryAddress: address,
          orderStatus: 'paid',
          shipmentTrackingId: '',
          products: orderDetail.products,
          boxes: [],
          bundles: [],
          total: 548.1,
        },
      ],
    },
    call: (a) => a.users.detail({ id: id(1) }),
    check: (result) => noKeys(Object.keys(credentials))((result as { user: object }).user),
  },
  { name: 'stock alert summary page', data: page([{ _id: id(10), totalProducts: 2 }]), call: (a) => a.stockAlerts.list() },
  {
    name: 'stock alert subscribers',
    data: [stockAlert],
    call: (a) => a.stockAlerts.subscribers({ product: id(10) }),
    check: (result) => noKeys(['isDeleted', 'deletedAt'])((result as object[])[0]),
  },
  { name: 'stock alert notify', data: { success: true, subscribers: 1 }, call: (a) => a.stockAlerts.notify({ product: id(10) }) },
  {
    name: 'subscriber page',
    data: page([{ _id: id(60), email: 'shopper@demo.pageaters.com', ...stamps }]),
    call: (a) => a.subscribers.list(),
  },
];

void describe('admin responses (validation on)', () => {
  for (const c of cases) {
    void it(`parses ${c.name}`, async () => {
      const result = await c.call(adminClient(c.data));
      c.check?.(result);
    });
  }

  void it('rejects the raw Razorpay payment the legacy order detail sends', async () => {
    const raw = { id: 'pay_placeholder', entity: 'payment', method: 'card', email: 'owner@example.com', contact: '9000000000' };
    await assert.rejects(adminClient({ ...orderDetail, payment: raw }).orders.detail({ id: id(30) }), { code: 'CLIENT_VALIDATION_FAILED' });
  });
});
