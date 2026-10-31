import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { MongoMemoryServer } from 'mongodb-memory-server-core';
import type { Payload, TypedUser } from 'payload';

// The CMS's access rules end to end: the real Payload config on a throwaway MongoDB, called through the local API with
// access control on (`overrideAccess: false`), as a visitor, the read-only demo login and an admin (AGENTS.md §6: the
// CMS demo login is read-only, enforced server-side). Never Atlas, never the owner's .env.

const MONGODB_VERSION = '8.2.6'; // as apps/api/test/helpers/db.js

let mongo: MongoMemoryServer;
let payload: Payload;
let admin: TypedUser;
let demo: TypedUser;

const asUser = (user: TypedUser) => ({ overrideAccess: false, user });
const asVisitor = { overrideAccess: false } as const;
const forbidden = { name: 'Forbidden' };
const homeData = { title: 'Home', slug: 'home', _status: 'published' as const };
// Payload's generated auth types ask for a password on unlock; the operation only reads the email.
const unlockData = (email: string) => ({ email, password: '' });

before(async () => {
  // mongodb-memory-server verifies the download's TLS certificate only when npm sets this; pnpm doesn't.
  process.env.npm_config_strict_ssl ??= 'true';
  mongo = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1' }, binary: { version: MONGODB_VERSION } });
  Object.assign(process.env, {
    MONGODB_URI: mongo.getUri('pageaters_cms_test'),
    PAYLOAD_SECRET: 'integration-test-only-'.padEnd(32, '0'),
  });
  // The config reads the environment when it loads, so it is imported only now.
  const { getPayload } = await import('payload');
  payload = await getPayload({ config: (await import('./payload.config.ts')).default });

  const create = (email: string, role: 'admin' | 'demo-readonly') =>
    payload.create({ collection: 'users', data: { email, password: 'integration-pass', role } });
  admin = { ...(await create('owner@example.com', 'admin')), collection: 'users' };
  demo = { ...(await create('editor@demo.pageaters.com', 'demo-readonly')), collection: 'users' };
});

after(async () => {
  await payload?.destroy();
  await mongo?.stop({ doCleanup: true, force: true });
});

void describe('the read-only demo login', () => {
  void test('cannot create, edit or delete content', async () => {
    await assert.rejects(payload.create({ collection: 'pages', data: homeData, ...asUser(demo) }), forbidden);
    await assert.rejects(payload.create({ collection: 'templates', data: { type: 'product' }, ...asUser(demo) }), forbidden);
    await assert.rejects(
      payload.create({ collection: 'overrides', data: { type: 'collection', itemId: 'a'.repeat(24) }, ...asUser(demo) }),
      forbidden,
    );
    const page = await payload.create({ collection: 'pages', data: { ...homeData, slug: 'kept' } });
    await assert.rejects(payload.update({ collection: 'pages', id: page.id, data: { title: 'x' }, ...asUser(demo) }), forbidden);
    await assert.rejects(payload.delete({ collection: 'pages', id: page.id, ...asUser(demo) }), forbidden);
  });

  void test('cannot upload media or edit a global', async () => {
    const file = { data: Buffer.from('fake'), mimetype: 'image/png', name: 'x.png', size: 4 };
    await assert.rejects(payload.create({ collection: 'media', data: { alt: 'x' }, file, ...asUser(demo) }), forbidden);
    await assert.rejects(payload.updateGlobal({ slug: 'header', data: { logoText: 'Hacked' }, ...asUser(demo) }), forbidden);
    await assert.rejects(payload.updateGlobal({ slug: 'theme', data: { accent: '#000000' }, ...asUser(demo) }), forbidden);
  });

  void test('cannot change its own password or role, or lift the owner’s lockout', async () => {
    await assert.rejects(payload.update({ collection: 'users', id: demo.id, data: { password: 'hijack' }, ...asUser(demo) }), forbidden);
    await assert.rejects(payload.update({ collection: 'users', id: demo.id, data: { role: 'admin' }, ...asUser(demo) }), forbidden);
    await assert.rejects(
      payload.unlock({ collection: 'users', data: unlockData(admin.email), overrideAccess: false, req: { user: demo } }),
      forbidden,
    );
  });

  void test('sees only its own account, and can read drafts', async () => {
    const users = await payload.find({ collection: 'users', ...asUser(demo) });
    assert.deepEqual(
      users.docs.map((user) => user.email),
      [demo.email],
    );
    await payload.create({ collection: 'pages', data: { title: 'Draft', slug: 'demo-draft', _status: 'draft' }, draft: true });
    const drafts = await payload.find({ collection: 'pages', where: { slug: { equals: 'demo-draft' } }, draft: true, ...asUser(demo) });
    assert.equal(drafts.totalDocs, 1);
  });
});

void describe('a visitor', () => {
  void test('reads published content, never drafts or versions', async () => {
    await payload.create({ collection: 'pages', data: { title: 'Sale', slug: 'sale', _status: 'draft' }, draft: true });
    await payload.create({ collection: 'pages', data: { ...homeData, slug: 'open' } });
    const asked = (draft: boolean) => payload.find({ collection: 'pages', where: { slug: { in: ['sale', 'open'] } }, draft, ...asVisitor });
    assert.deepEqual(
      (await asked(false)).docs.map((page) => page.slug),
      ['open'],
    );
    assert.deepEqual(
      (await asked(true)).docs.map((page) => page.slug),
      ['open'],
    );
    await assert.rejects(payload.findVersions({ collection: 'pages', ...asVisitor }), forbidden);
  });

  void test('reads globals but cannot write anything', async () => {
    assert.equal((await payload.findGlobal({ slug: 'seo', ...asVisitor })).titleTemplate, '%s | Pageaters');
    await assert.rejects(payload.create({ collection: 'pages', data: { ...homeData, slug: 'v' }, ...asVisitor }), forbidden);
    await assert.rejects(payload.updateGlobal({ slug: 'footer', data: { legal: 'x' }, ...asVisitor }), forbidden);
    await assert.rejects(payload.find({ collection: 'users', ...asVisitor }), forbidden);
  });
});

void describe('an admin', () => {
  void test('writes content and globals, and unlocks accounts', async () => {
    const page = await payload.create({ collection: 'pages', data: { ...homeData, slug: 'admin-page' }, ...asUser(admin) });
    assert.equal(page._status, 'published');
    assert.equal((await payload.updateGlobal({ slug: 'header', data: { logoText: 'Pageaters' }, ...asUser(admin) })).logoText, 'Pageaters');
    assert.equal(
      await payload.unlock({ collection: 'users', data: unlockData(demo.email), overrideAccess: false, req: { user: admin } }),
      true,
    );
  });

  void test('cannot publish a template without its core blocks, but may save it as a draft', async () => {
    await assert.rejects(payload.create({ collection: 'templates', data: { type: 'product', _status: 'published' }, ...asUser(admin) }), {
      name: 'ValidationError',
    });
    const draft = await payload.create({
      collection: 'templates',
      data: { type: 'product', _status: 'draft' },
      draft: true,
      ...asUser(admin),
    });
    assert.equal(draft._status, 'draft');
  });
});
