import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AdminBookCreatePayload, AdminBookUpdatePayload } from '@pageaters/shared';

import { bindEndpoints, isEndpoint } from '../../core/endpoint.ts';
import type { EndpointTree } from '../../core/endpoint.ts';
import { createRequester } from '../../core/http.ts';
import { mockFetch, ok } from '../../testing/mock-fetch.ts';
import { adminEndpoints, fileUploadForm, fileUploadRequest } from './index.ts';

// Method, URL and body of every admin endpoint, against a mocked fetch. No network: the admin routes write to the
// shared demo database. `src/index.ts` mounts `adminEndpoints` at merge; until then they are bound here the same way.

const BASE = 'https://api.example.test/api/v1';
const id = (n: number) => `64d0000000000000000000${n.toString().padStart(2, '0')}`;

function client() {
  const mock = mockFetch(() => ok({}));
  return { ...mock, admin: bindEndpoints({ admin: adminEndpoints }, createRequester({ baseUrl: BASE, fetch: mock.fetch })).admin };
}
type Admin = ReturnType<typeof client>['admin'];

const bookCreate: AdminBookCreatePayload = {
  title: 'The Placeholder Atlas',
  poster: 'https://images.example.test/atlas.jpg',
  categories: [id(2)],
  relatedBooks: [],
};
const bookUpdate: Omit<AdminBookUpdatePayload, 'categories' | 'relatedBooks' | 'relatedBundles' | 'relatedCollections'> = {
  type: 'book',
  title: 'The Placeholder Atlas',
  tagline: '',
  eyebrow: '',
  description: '',
  message: '',
  tags: [],
  language: 'English',
  pages: 320,
  readingLevel: 'Beginner',
  version: 'paperback',
  dimensions: '',
  weight: 300,
  ISBN: '0000000000000',
  publicationYear: '2020',
  publisher: 'Example House',
  editorsPick: false,
  bestSeller: false,
  newRelease: false,
  preOrder: false,
  availability: 'available',
  poster: 'https://images.example.test/atlas.jpg',
  images: [],
  inventory: 12,
  currentDiscount: 0,
  popularity: 0,
  price: 499,
  rentPrice: 0,
  membersPrice: 449,
  membersRentPrice: 0,
};
const bookUpdateFull: AdminBookUpdatePayload = {
  ...bookUpdate,
  categories: [],
  relatedBooks: [],
  relatedBundles: [],
  relatedCollections: [],
};

interface Case {
  name: string;
  call: (admin: Admin) => Promise<unknown>;
  method: string;
  url: string;
  body?: unknown;
}

const cases: Case[] = [
  // Store books
  { name: 'storeBooks.detail', call: (a) => a.storeBooks.detail({ id: id(1) }), method: 'GET', url: `/store-books/get/${id(1)}` },
  { name: 'storeBooks.create', call: (a) => a.storeBooks.create(bookCreate), method: 'POST', url: '/store-books', body: bookCreate },
  {
    name: 'storeBooks.update',
    call: (a) => a.storeBooks.update({ id: id(1), ...bookUpdateFull }),
    method: 'PUT',
    url: `/store-books/${id(1)}`,
    body: bookUpdateFull,
  },
  { name: 'storeBooks.remove', call: (a) => a.storeBooks.remove({ id: id(1) }), method: 'DELETE', url: `/store-books/${id(1)}` },
  // Authors
  { name: 'authors.detail', call: (a) => a.authors.detail({ id: id(1) }), method: 'GET', url: `/authors/${id(1)}` },
  {
    name: 'authors.create',
    call: (a) => a.authors.create({ name: 'A. Writer', avatar: 'https://images.example.test/a.jpg', books: [id(2)] }),
    method: 'POST',
    url: '/authors',
    body: { name: 'A. Writer', avatar: 'https://images.example.test/a.jpg', books: [id(2)] },
  },
  {
    name: 'authors.update',
    call: (a) => a.authors.update({ id: id(1), name: 'A. Writer', intro: '', avatar: 'https://images.example.test/a.jpg', books: [] }),
    method: 'PUT',
    url: `/authors/${id(1)}`,
    body: { name: 'A. Writer', intro: '', avatar: 'https://images.example.test/a.jpg', books: [] },
  },
  { name: 'authors.remove', call: (a) => a.authors.remove({ id: id(1) }), method: 'DELETE', url: `/authors/${id(1)}` },
  // Categories
  { name: 'categories.detail', call: (a) => a.categories.detail({ id: id(1) }), method: 'GET', url: `/categories/${id(1)}` },
  {
    name: 'categories.create',
    call: (a) => a.categories.create({ title: 'Poetry', thumbnail: 'https://images.example.test/p.jpg' }),
    method: 'POST',
    url: '/categories',
    body: { title: 'Poetry', thumbnail: 'https://images.example.test/p.jpg' },
  },
  {
    name: 'categories.update',
    call: (a) =>
      a.categories.update({
        id: id(1),
        title: 'Poetry',
        description: '',
        thumbnail: 'https://images.example.test/p.jpg',
        meta: { title: '', description: '', imageUrl: '', url: '' },
        popularity: 0,
        priority: 1,
      }),
    method: 'PUT',
    url: `/categories/${id(1)}`,
    body: {
      title: 'Poetry',
      description: '',
      thumbnail: 'https://images.example.test/p.jpg',
      meta: { title: '', description: '', imageUrl: '', url: '' },
      popularity: 0,
      priority: 1,
    },
  },
  { name: 'categories.remove', call: (a) => a.categories.remove({ id: id(1) }), method: 'DELETE', url: `/categories/${id(1)}` },
  // Collections
  { name: 'collections.detail', call: (a) => a.collections.detail({ id: id(1) }), method: 'GET', url: `/collections/${id(1)}` },
  {
    name: 'collections.create',
    call: (a) =>
      a.collections.create({ title: 'Rainy days', poster: 'https://images.example.test/c.jpg', books: [id(2)], relatedCollections: [] }),
    method: 'POST',
    url: '/collections',
    body: { title: 'Rainy days', poster: 'https://images.example.test/c.jpg', books: [id(2)], relatedCollections: [] },
  },
  {
    name: 'collections.update',
    call: (a) =>
      a.collections.update({
        id: id(1),
        title: 'Rainy days',
        description: '',
        tags: [],
        poster: 'https://images.example.test/c.jpg',
        priority: 0,
        popularity: 0,
        books: [],
        relatedCollections: [],
        relatedCategories: [],
        featuredAuthors: [],
      }),
    method: 'PUT',
    url: `/collections/${id(1)}`,
    body: {
      title: 'Rainy days',
      description: '',
      tags: [],
      poster: 'https://images.example.test/c.jpg',
      priority: 0,
      popularity: 0,
      books: [],
      relatedCollections: [],
      relatedCategories: [],
      featuredAuthors: [],
    },
  },
  { name: 'collections.remove', call: (a) => a.collections.remove({ id: id(1) }), method: 'DELETE', url: `/collections/${id(1)}` },
  // Bundles
  { name: 'bundles.detail', call: (a) => a.bundles.detail({ id: id(1) }), method: 'GET', url: `/bundles/${id(1)}` },
  {
    name: 'bundles.create',
    call: (a) =>
      a.bundles.create({ title: 'Starter pack', poster: 'https://images.example.test/b.jpg', bundledBooks: [id(2), id(3)], price: 899 }),
    method: 'POST',
    url: '/bundles',
    body: { title: 'Starter pack', poster: 'https://images.example.test/b.jpg', bundledBooks: [id(2), id(3)], price: 899 },
  },
  {
    name: 'bundles.update',
    call: (a) =>
      a.bundles.update({
        id: id(1),
        title: 'Starter pack',
        description: '',
        tags: [],
        poster: 'https://images.example.test/b.jpg',
        popularity: 0,
        priority: 0,
        currentDiscount: 5,
        price: 899,
        membersPrice: 849,
        bundledBooks: [id(2)],
        categories: [],
        relatedBundles: [],
        relatedCollections: [],
      }),
    method: 'PUT',
    url: `/bundles/${id(1)}`,
    body: {
      title: 'Starter pack',
      description: '',
      tags: [],
      poster: 'https://images.example.test/b.jpg',
      popularity: 0,
      priority: 0,
      currentDiscount: 5,
      price: 899,
      membersPrice: 849,
      bundledBooks: [id(2)],
      categories: [],
      relatedBundles: [],
      relatedCollections: [],
    },
  },
  { name: 'bundles.remove', call: (a) => a.bundles.remove({ id: id(1) }), method: 'DELETE', url: `/bundles/${id(1)}` },
  // Mystery boxes
  { name: 'mysteryBoxes.detail', call: (a) => a.mysteryBoxes.detail({ id: id(1) }), method: 'GET', url: `/mystery-boxes/${id(1)}` },
  {
    name: 'mysteryBoxes.create',
    call: (a) => a.mysteryBoxes.create({ title: 'Surprise three', books: 3 }),
    method: 'POST',
    url: '/mystery-boxes',
    body: { title: 'Surprise three', books: 3 },
  },
  {
    name: 'mysteryBoxes.update',
    call: (a) =>
      a.mysteryBoxes.update({
        id: id(1),
        title: 'Surprise three',
        description: '',
        tags: [],
        images: [],
        books: 3,
        currentDiscount: 0,
        weight: 900,
        price: 999,
      }),
    method: 'PUT',
    url: `/mystery-boxes/${id(1)}`,
    body: { title: 'Surprise three', description: '', tags: [], images: [], books: 3, currentDiscount: 0, weight: 900, price: 999 },
  },
  { name: 'mysteryBoxes.remove', call: (a) => a.mysteryBoxes.remove({ id: id(1) }), method: 'DELETE', url: `/mystery-boxes/${id(1)}` },
  // Deals
  { name: 'deals.detail', call: (a) => a.deals.detail({ id: id(1) }), method: 'GET', url: `/deals/${id(1)}` },
  {
    name: 'deals.create',
    call: (a) => a.deals.create({ title: 'Monsoon sale', productSets: [{ set: id(2), priority: 1 }] }),
    method: 'POST',
    url: '/deals',
    body: { title: 'Monsoon sale', productSets: [{ set: id(2), priority: 1 }] },
  },
  {
    name: 'deals.update',
    call: (a) =>
      a.deals.update({
        id: id(1),
        poster: '',
        ctaLink: '/collections/monsoon',
        ctaText: 'Shop now',
        title: 'Monsoon sale',
        description: '',
        priority: 1,
        categories: [],
        productSets: [],
      }),
    method: 'PUT',
    url: `/deals/${id(1)}`,
    body: {
      poster: '',
      ctaLink: '/collections/monsoon',
      ctaText: 'Shop now',
      title: 'Monsoon sale',
      description: '',
      priority: 1,
      categories: [],
      productSets: [],
    },
  },
  { name: 'deals.remove', call: (a) => a.deals.remove({ id: id(1) }), method: 'DELETE', url: `/deals/${id(1)}` },
  // Product sets
  {
    name: 'productSets.list',
    call: (a) => a.productSets.list({ page: 2, categories: [id(2), id(3)] }),
    method: 'GET',
    url: `/product-sets?page=2&categories=${id(2)}&categories=${id(3)}`,
  },
  { name: 'productSets.detail', call: (a) => a.productSets.detail({ id: id(1) }), method: 'GET', url: `/product-sets/${id(1)}` },
  {
    name: 'productSets.create',
    call: (a) => a.productSets.create({ title: 'New releases', products: [{ product: id(2), priority: 1 }] }),
    method: 'POST',
    url: '/product-sets',
    body: { title: 'New releases', products: [{ product: id(2), priority: 1 }] },
  },
  {
    name: 'productSets.update',
    call: (a) => a.productSets.update({ id: id(1), title: 'New releases', description: '', products: [], categories: [] }),
    method: 'PUT',
    url: `/product-sets/${id(1)}`,
    body: { title: 'New releases', description: '', products: [], categories: [] },
  },
  { name: 'productSets.remove', call: (a) => a.productSets.remove({ id: id(1) }), method: 'DELETE', url: `/product-sets/${id(1)}` },
  // Add-ons
  {
    name: 'addOns.list',
    call: (a) => a.addOns.list({ limit: 50, sortBy: 'name', sortOrder: 1 }),
    method: 'GET',
    url: '/add-ons?limit=50&sortBy=name&sortOrder=1',
  },
  { name: 'addOns.detail', call: (a) => a.addOns.detail({ id: id(1) }), method: 'GET', url: `/add-ons/${id(1)}` },
  {
    name: 'addOns.create',
    call: (a) => a.addOns.create({ name: 'Bookmark', price: 49 }),
    method: 'POST',
    url: '/add-ons',
    body: { name: 'Bookmark', price: 49 },
  },
  {
    name: 'addOns.update',
    call: (a) =>
      a.addOns.update({
        id: id(1),
        name: 'Bookmark',
        description: '',
        poster: '',
        category: 'Stationery',
        priority: 0,
        price: 49,
        currentDiscount: 0,
        inventory: 10,
      }),
    method: 'PUT',
    url: `/add-ons/${id(1)}`,
    body: {
      name: 'Bookmark',
      description: '',
      poster: '',
      category: 'Stationery',
      priority: 0,
      price: 49,
      currentDiscount: 0,
      inventory: 10,
    },
  },
  { name: 'addOns.remove', call: (a) => a.addOns.remove({ id: id(1) }), method: 'DELETE', url: `/add-ons/${id(1)}` },
  { name: 'analytics.summary', call: (a) => a.analytics.summary(), method: 'GET', url: '/analytics/summary' },
  { name: 'analytics.book', call: (a) => a.analytics.book({ id: id(1) }), method: 'GET', url: `/analytics/books/${id(1)}` },
  { name: 'analytics.customer', call: (a) => a.analytics.customer({ id: id(1) }), method: 'GET', url: `/analytics/customers/${id(1)}` },
  // Orders
  {
    name: 'orders.list',
    call: (a) => a.orders.list({ page: 1, limit: 20, status: 'return in progress' }),
    method: 'GET',
    url: '/orders?page=1&limit=20&status=return+in+progress',
  },
  { name: 'orders.detail', call: (a) => a.orders.detail({ id: id(1) }), method: 'GET', url: `/orders/getById/${id(1)}` },
  { name: 'orders.search', call: (a) => a.orders.search({ q: 'OD-00' }), method: 'GET', url: '/orders/search?q=OD-00' },
  {
    name: 'orders.ship',
    call: (a) => a.orders.ship({ orderId: id(1), shipmentTrackingId: 'https://tracking.example.test/1' }),
    method: 'POST',
    url: '/orders/ship',
    body: { orderId: id(1), shipmentTrackingId: 'https://tracking.example.test/1' },
  },
  {
    name: 'orders.createShipment',
    call: (a) => a.orders.createShipment({ orderId: id(1), dimensions: { width: 20, height: 5, weight: 400 } }),
    method: 'POST',
    url: `/orders/create-shipment/${id(1)}`,
    body: { dimensions: { width: 20, height: 5, weight: 400 } },
  },
  { name: 'orders.deliver', call: (a) => a.orders.deliver({ id: id(1) }), method: 'PATCH', url: `/orders/ship/${id(1)}/complete` },
  {
    name: 'orders.alignReturnShipment',
    call: (a) => a.orders.alignReturnShipment({ id: id(1), requestId: id(5), shipment: 'RT-1' }),
    method: 'PATCH',
    url: `/orders/return/${id(1)}/shipment/${id(5)}`,
    body: { shipment: 'RT-1' },
  },
  {
    name: 'orders.closeReturn',
    call: (a) => a.orders.closeReturn({ id: id(1), requestId: id(5) }),
    method: 'PATCH',
    url: `/orders/return/${id(1)}/shipment/${id(5)}/close`,
  },
  {
    name: 'orders.closeReplacement',
    call: (a) => a.orders.closeReplacement({ id: id(1), requestId: id(5) }),
    method: 'PATCH',
    url: `/orders/replace/${id(1)}/shipment/${id(5)}/close`,
  },
  {
    name: 'orders.cancel',
    call: (a) => a.orders.cancel({ id: 'OD-0000000001', uniqueId: 'OD-0000000001', userId: id(3), reason: 'Out of stock', notify: false }),
    method: 'POST',
    url: '/orders/admin-cancel/OD-0000000001',
    body: { uniqueId: 'OD-0000000001', userId: id(3), reason: 'Out of stock', notify: false },
  },
  {
    name: 'orders.bestSelling',
    call: (a) => a.orders.bestSelling({ startDate: '2026-10-01T00:00:00.000Z', endDate: '2026-11-01T00:00:00.000Z' }),
    method: 'GET',
    url: '/orders/analytics/best-selling?startDate=2026-10-01T00%3A00%3A00.000Z&endDate=2026-11-01T00%3A00%3A00.000Z',
  },
  {
    name: 'orders.revenue',
    call: (a) => a.orders.revenue({ startDate: '2026-10-01T00:00:00.000Z', endDate: '2026-11-01T00:00:00.000Z' }),
    method: 'GET',
    url: '/orders/analytics/revenue?startDate=2026-10-01T00%3A00%3A00.000Z&endDate=2026-11-01T00%3A00%3A00.000Z',
  },
  // Carts
  { name: 'carts.list', call: (a) => a.carts.list({ page: 3 }), method: 'GET', url: '/cart?page=3' },
  { name: 'carts.detail', call: (a) => a.carts.detail({ id: id(1) }), method: 'GET', url: `/cart/${id(1)}` },
  // Users
  { name: 'users.list', call: (a) => a.users.list(), method: 'GET', url: '/users' },
  {
    name: 'users.search',
    call: (a) => a.users.search({ q: 'shopper@demo' }),
    method: 'GET',
    url: '/users/search?q=shopper%40demo',
  },
  { name: 'users.detail', call: (a) => a.users.detail({ id: id(1) }), method: 'GET', url: `/users/${id(1)}` },
  // Stock alerts
  { name: 'stockAlerts.list', call: (a) => a.stockAlerts.list({ limit: 25 }), method: 'GET', url: '/stock-alerts?limit=25' },
  {
    name: 'stockAlerts.subscribers',
    call: (a) => a.stockAlerts.subscribers({ product: id(1) }),
    method: 'GET',
    url: `/stock-alerts/${id(1)}/users`,
  },
  {
    name: 'stockAlerts.notify',
    call: (a) => a.stockAlerts.notify({ product: id(1) }),
    method: 'POST',
    url: `/stock-alerts/${id(1)}/users`,
  },
  // Store credit
  {
    name: 'storeCredit.issue',
    call: (a) => a.storeCredit.issue({ userId: id(1), credit: 150, orderId: id(2) }),
    method: 'POST',
    url: '/store-credit',
    body: { userId: id(1), credit: 150, orderId: id(2) },
  },
  // Subscribers
  {
    name: 'subscribers.list',
    call: (a) => a.subscribers.list({ page: 1, limit: 100 }),
    method: 'GET',
    url: '/subscribers?page=1&limit=100',
  },
];

// A JSON body as the requester sent it (a string; FormData is only used by the upload).
function jsonBody(body: unknown): object {
  assert.equal(typeof body, 'string');
  return JSON.parse(body as string) as object;
}

function endpointNames(tree: EndpointTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([name, node]) =>
    isEndpoint(node) ? [`${prefix}${name}`] : endpointNames(node, `${prefix}${name}.`),
  );
}

void describe('admin endpoints', () => {
  void it('has one request case per endpoint', () => {
    assert.deepEqual(cases.map((c) => c.name).sort(), endpointNames(adminEndpoints).sort());
  });

  for (const c of cases) {
    void it(`${c.name} → ${c.method} ${c.url}`, async () => {
      const { admin, calls } = client();
      await c.call(admin);
      assert.equal(calls.length, 1);
      const [call] = calls;
      assert.equal(call?.url, `${BASE}${c.url}`);
      assert.equal(call?.init.method, c.method);
      if (c.body === undefined) {
        assert.equal(call?.init.body, undefined);
      } else {
        assert.equal(call?.init.headers.get('content-type'), 'application/json');
        assert.deepEqual(jsonBody(call?.init.body), c.body);
      }
    });
  }

  void it('never sends wholeSalePriceHistory in a typed book payload', async () => {
    // @ts-expect-error supplier prices are not part of the create payload
    const create: AdminBookCreatePayload = { ...bookCreate, wholeSalePriceHistory: [1] };
    // @ts-expect-error … nor of the update payload
    const update: AdminBookUpdatePayload = { ...bookUpdateFull, wholeSalePriceHistory: [1] };
    void [create, update];
    const { admin, calls } = client();
    await admin.storeBooks.create(bookCreate);
    await admin.storeBooks.update({ id: id(1), ...bookUpdateFull });
    for (const call of calls) assert.equal('wholeSalePriceHistory' in jsonBody(call.init.body), false);
  });
});

void describe('file upload', () => {
  void it('sends the multipart form untouched, without a JSON content type', async () => {
    const { calls, fetch } = mockFetch(() => ok({ fileUrl: 'atlas-abc-1.jpg' }));
    const request = createRequester({ baseUrl: BASE, fetch });
    const form = fileUploadForm({
      file: new Blob(['placeholder'], { type: 'image/jpeg' }),
      fileName: 'Atlas.Cover.JPG',
      title: 'The Placeholder Atlas',
      fileModule: 'STORE_BOOK',
    });
    const result = await request(fileUploadRequest(form), { validate: true });
    assert.deepEqual(result, { fileUrl: 'atlas-abc-1.jpg' });
    assert.equal(calls[0]?.url, `${BASE}/file/upload`);
    assert.equal(calls[0]?.init.method, 'POST');
    assert.equal(calls[0]?.init.body, form);
    assert.equal(calls[0]?.init.headers.get('content-type'), null);
    assert.equal(form.get('title'), 'The Placeholder Atlas');
    assert.equal(form.get('fileModule'), 'STORE_BOOK');
    // The extension is lower-cased (the API checks it case-sensitively); the rest of the name is kept.
    assert.equal((form.get('file') as File).name, 'Atlas.Cover.jpg');
    assert.equal(
      (fileUploadForm({ file: new Blob([]), fileName: 'noext', title: 't', fileModule: 'ASSETS' }).get('file') as File).name,
      'noext',
    );
  });
});
