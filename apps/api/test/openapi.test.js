const { after, before, describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { TEST_ENV } = require('./helpers/env');

// The OpenAPI document (src/docs) against the app itself: every mounted route is documented and every documented
// route is mounted (walking the Express router stack, so the docs can't drift from the code), the document is valid
// OpenAPI 3.1, and /openapi.json and /docs answer with the right types and CSP. No database: these routes need none.

Object.assign(process.env, TEST_ENV, { MONGODB_URI: 'mongodb://127.0.0.1:1/pageaters_test?serverSelectionTimeoutMS=300' });

const app = require('../src/app');
const { openApiDocument, SCALAR_URL } = require('../src/docs');

const document = openApiDocument();
const METHODS = ['get', 'put', 'post', 'delete', 'patch'];

const documented = new Set(
  Object.entries(document.paths).flatMap(([path, item]) =>
    METHODS.filter((method) => item[method]).map((method) => `${method.toUpperCase()} ${path}`),
  ),
);

// Express path → OpenAPI path: `:id` → `{id}`, no trailing slash (but `/`).
const normalize = (path) => path.replace(/:(\w+)/g, '{$1}').replace(/(.)\/$/, '$1');

// A concrete URL for each documented path, to find where each router is mounted: Express keeps only a matcher for a
// mount path, so a router layer's mount path is whatever part of a documented URL it matches.
const probes = Object.keys(document.paths).map((path) => path.replace(/\{\w+\}/g, 'x'));

/** Every `METHOD /path` the app routes, walking routers recursively. */
const mountedRoutes = () => {
  const found = new Set();
  const walk = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) {
        for (const method of Object.keys(layer.route.methods).filter((name) => name !== '_all')) {
          found.add(`${method.toUpperCase()} ${normalize(`${prefix}${layer.route.path}`)}`);
        }
      } else if (layer.handle?.stack) {
        const probe = probes.find((url) => url.startsWith(prefix) && layer.match(url.slice(prefix.length) || '/'));
        assert.ok(probe, `a router is mounted under ${prefix} at a path no documented route uses`);
        walk(layer.handle.stack, `${prefix}${layer.path}`);
      }
    }
  };
  walk(app.router.stack, '');
  return found;
};

describe('route coverage', () => {
  const mounted = mountedRoutes();

  test('every mounted route is documented', () => {
    assert.deepEqual(
      [...mounted].filter((route) => !documented.has(route)),
      [],
    );
  });

  test('every documented route is mounted', () => {
    assert.deepEqual(
      [...documented].filter((route) => !mounted.has(route)),
      [],
    );
  });

  test('covers the whole API', () => {
    assert.ok(mounted.size > 100, `only ${mounted.size} routes found: the router walk is broken`);
  });
});

describe('the document', () => {
  test('is valid OpenAPI 3.1', async () => {
    const { Validator } = await import('@seriousme/openapi-schema-validator');
    const validator = new Validator();
    const result = await validator.validate(structuredClone(document));
    assert.deepEqual(result.errors, undefined);
    assert.equal(result.valid, true);
    assert.equal(validator.version, '3.1');
  });

  test('has unique operation ids, a tag and an auth rule on every operation', () => {
    const operations = Object.values(document.paths).flatMap((item) => METHODS.map((method) => item[method]).filter(Boolean));
    const ids = operations.map((op) => op.operationId);
    assert.equal(new Set(ids).size, ids.length);
    const tags = new Set(document.tags.map((tag) => tag.name));
    for (const op of operations) {
      assert.ok(
        op.tags.every((tag) => tags.has(tag)),
        `${op.operationId}: unknown tag ${op.tags}`,
      );
      assert.ok(Array.isArray(op.security), `${op.operationId}: no security`);
    }
  });

  test('every $ref resolves', () => {
    const refs = JSON.stringify(document).match(/"\$ref":"#\/components\/[^"]+"/g);
    for (const ref of new Set(refs)) {
      const [, kind, name] = ref.match(/components\/(\w+)\/([^"]+)/);
      assert.ok(document.components[kind]?.[name], `${ref} does not resolve`);
    }
  });

  test('marks admin routes with the session scheme and the ADMIN role', () => {
    const op = document.paths['/api/v1/orders/getById/{id}'].get;
    assert.deepEqual(op.security, [{ session: [] }]);
    assert.equal(op['x-required-role'], 'ADMIN');
    assert.ok(op.responses[403]);
    assert.deepEqual(document.paths['/api/v1/store-books'].get.security, []);
    assert.deepEqual(document.components.securitySchemes.session, {
      type: 'apiKey',
      in: 'cookie',
      name: '_PID',
      description: document.components.securitySchemes.session.description,
    });
  });

  test('uses the shared schemas: request bodies inline, responses as components', () => {
    const login = document.paths['/api/v1/auth/login'].post;
    assert.deepEqual(Object.keys(login.requestBody.content['application/json'].schema.properties), ['email', 'password']);
    assert.deepEqual(login.responses[200].content['application/json'].schema, { $ref: '#/components/schemas/ShopperProfileResponse' });
    const limit = document.paths['/api/v1/store-books'].get.parameters.find((param) => param.name === 'limit');
    assert.equal(limit.schema.maximum, 1000);
  });
});

describe('serving', () => {
  let server;
  let base;

  before(async () => {
    server = await new Promise((resolve) => {
      const started = app.listen(0, '127.0.0.1', () => resolve(started));
    });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  test('GET /openapi.json answers the document', async () => {
    const res = await fetch(`${base}/openapi.json`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^application\/json/);
    assert.ok(res.headers.get('x-request-id'));
    assert.deepEqual(await res.json(), document);
  });

  test('GET /docs answers the reference page with its own CSP', async () => {
    const res = await fetch(`${base}/docs`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/html/);
    const html = await res.text();
    assert.ok(html.includes(`src="${SCALAR_URL}"`));
    assert.match(html, /integrity="sha384-/);

    const csp = Object.fromEntries(
      res.headers
        .get('content-security-policy')
        .split(';')
        .map((directive) => directive.trim().split(/\s+/))
        .map(([name, ...values]) => [name, values]),
    );
    assert.deepEqual(csp['script-src'].slice(0, 2), ["'self'", SCALAR_URL]);
    assert.match(csp['script-src'][2], /^'sha256-/);
    assert.equal(csp['script-src'].length, 3);
    assert.deepEqual(csp['connect-src'], ["'self'"]);
    assert.deepEqual(csp['font-src'], ["'self'", 'https://fonts.scalar.com']);
    assert.deepEqual(csp['object-src'], ["'none'"]);
  });

  test('the inline script matches its CSP hash', async () => {
    const res = await fetch(`${base}/docs`);
    const html = await res.text();
    const inline = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    const hash = require('crypto').createHash('sha256').update(inline).digest('base64');
    assert.ok(res.headers.get('content-security-policy').includes(`'sha256-${hash}'`));
  });

  test('every other route keeps helmet’s default CSP', async () => {
    const res = await fetch(`${base}/openapi.json`);
    assert.match(res.headers.get('content-security-policy'), /script-src 'self';/);
  });
});
