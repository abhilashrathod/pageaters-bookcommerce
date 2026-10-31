const crypto = require('crypto');
const { Router } = require('express');
const helmet = require('helmet');

const { buildDocument } = require('./build');

// GET /openapi.json and GET /docs (mounted in app.js, public, under the general rate limit like every request).
//
// The document is built on the first request and kept for the life of the instance: no work at boot, nothing on
// disk, so it stays serverless-safe. /docs renders it with Scalar API Reference, loaded from a pinned jsDelivr URL
// with Subresource Integrity; the page's own CSP (below) allows exactly what that needs, on this route only.

let document;
const openApiDocument = () => (document ??= buildDocument());

// @scalar/api-reference, pinned; the hash is the bundle's SRI (sha384) at this version.
const SCALAR_VERSION = '1.75.0';
const SCALAR_URL = `https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_VERSION}/dist/browser/standalone.js`;
const SCALAR_SRI = 'sha384-xgelKlDcc+BYp0O+ZYzFesLnWCgGpEbXVVZWNQT6WyZYygN01tbEMygnjPXb5OPI';
// Scalar's default fonts (Inter, JetBrains Mono).
const SCALAR_FONTS = 'https://fonts.scalar.com';

const scalarConfig = {
  url: '/openapi.json',
  theme: 'default',
  layout: 'modern',
  defaultHttpClient: { targetKey: 'js', clientKey: 'fetch' },
  // No calls to Scalar's own services: the CSP below would refuse them anyway.
  telemetry: false,
  agent: { disabled: true },
  showDeveloperTools: 'never',
  // Hides Scalar's own "Generate SDKs" promotion in the sidebar.
  customCss: '.explore-scalar-card { display: none !important; }',
};

// The one inline script, allowed by its hash rather than 'unsafe-inline'.
const INIT_SCRIPT = `Scalar.createApiReference('#app', ${JSON.stringify(scalarConfig)});`;
const INIT_HASH = `'sha256-${crypto.createHash('sha256').update(INIT_SCRIPT).digest('base64')}'`;

const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pageaters API reference</title>
    <meta name="description" content="Pageaters API: OpenAPI 3.1 reference generated from the shared zod contracts." />
  </head>
  <body>
    <noscript>This reference needs JavaScript. The raw document is at <a href="/openapi.json">/openapi.json</a>.</noscript>
    <div id="app"></div>
    <script src="${SCALAR_URL}" integrity="${SCALAR_SRI}" crossorigin="anonymous"></script>
    <script>${INIT_SCRIPT}</script>
  </body>
</html>
`;

// Replaces helmet's app-wide CSP on /docs only. Scalar injects its styles at runtime (style-src 'unsafe-inline') and
// sends "try it" requests to this API (connect-src 'self').
const docsCsp = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    'script-src': ["'self'", SCALAR_URL, INIT_HASH],
    'style-src': ["'self'", "'unsafe-inline'"],
    'font-src': ["'self'", SCALAR_FONTS],
    'img-src': ["'self'", 'data:'],
    'connect-src': ["'self'"],
  },
});

const router = new Router();

router.get('/openapi.json', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(openApiDocument());
});

router.get('/docs', docsCsp, (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.type('html').send(PAGE);
});

module.exports = { router, openApiDocument, SCALAR_URL };
