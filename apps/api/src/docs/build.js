const { MAX_PAGE_LIMIT, PUBLIC_PAGE_LIMIT } = require('@pageaters/shared');

const components = require('./components');
const { requestParts } = require('./request');
const { extraResponseSchemas, routes } = require('./routes');
const { ref, responseComponents } = require('./schemas');

// Builds the OpenAPI 3.1 document from the route registry (./routes). Each entry:
//
// - `method`, `path` (Express style, as mounted: `/api/v1/authors/:id`), `tag`, `summary`, `description?`.
// - `auth`: 'public' | 'session' (any signed-in account) | 'user' (shoppers; admins pass too) | 'admin'.
// - `request`: the schema the route's validate() checks (params, query and body merged; split in ./request.js).
// - `query` / `body`: shared request schemas the route reads without validate() (the api-client's contract).
// - `multipart`: the text fields of a multipart upload (a `file` field is added). `rawBody`: a JSON Schema body.
// - `filters`: query parameters without a shared object schema, `{ name: { description, schema?, required? } }`.
// - `params`: path parameter descriptions, `{ name: description }`. `headers`: required headers, `{ name: description }`.
// - `paged`: 'public' (pageLimit.middleware: at most 50 rows unless ADMIN) or 'page' (page and limit, up to 1000).
// - `limiter`: the stricter rate limit on the route, by its name in rateLimit.middleware.js.
// - `response`: the shared envelope schema of the success answer; without one the generic envelope is shown and the
//   operation says so. `status`: the success status when not 200. `content`: a non-JSON success body,
//   `{ [mediaType]: jsonSchema }` (the HTML page). `responses`: extra responses by status.

const ROLE_NOTE = {
  public: 'Public.',
  session: 'Requires a signed-in session (any role).',
  user: 'Requires a **USER** session (admins pass too).',
  admin: 'Requires an **ADMIN** session.',
};

const openApiPath = (path) => path.replace(/:(\w+)/g, '{$1}').replace(/(.)\/$/, '$1');

const operationId = (method, path) =>
  method.toLowerCase() + openApiPath(path).replace(/[^A-Za-z0-9]+(.)?/g, (_, next = '') => next.toUpperCase());

const describe = (route) => {
  const lines = [route.description, ROLE_NOTE[route.auth]];
  if (route.paged === 'public') lines.push(`Paged: \`limit\` up to ${PUBLIC_PAGE_LIMIT}, or ${MAX_PAGE_LIMIT} for an ADMIN session.`);
  if (route.paged === 'page') lines.push(`Paged: \`limit\` up to ${MAX_PAGE_LIMIT}.`);
  if (route.limiter) lines.push(`Rate limit: the stricter \`${route.limiter}\` limit applies.`);
  if (!route.response && !route.content) lines.push('_No shared response schema yet: shown as the generic envelope._');
  return lines.filter(Boolean).join('\n\n');
};

const successContent = (route, refFor) => {
  if (route.content) return Object.fromEntries(Object.entries(route.content).map(([type, schema]) => [type, { schema }]));
  return { 'application/json': { schema: route.response ? refFor(route.response) : ref('ApiResponse') } };
};

const operation = (route, refFor) => {
  const { parameters, body } = requestParts(route);
  const responses = {
    [route.status ?? 200]: { description: 'Success.', headers: components.requestIdHeader, content: successContent(route, refFor) },
  };
  if (parameters.some((param) => param.in !== 'path') || body) responses[400] = { $ref: '#/components/responses/BadRequest' };
  if (route.auth !== 'public') responses[401] = { $ref: '#/components/responses/Unauthorized' };
  if (route.auth === 'admin') responses[403] = { $ref: '#/components/responses/Forbidden' };
  responses[429] = { $ref: '#/components/responses/TooManyRequests' };
  responses[500] = { $ref: '#/components/responses/ServerError' };
  // Every /api/v1 route but the root sits behind requireDb.
  if (route.path.startsWith('/api/v1/') && route.path !== '/api/v1/')
    responses[503] = { $ref: '#/components/responses/ServiceUnavailable' };
  Object.assign(responses, route.responses);

  return {
    tags: [route.tag],
    summary: route.summary,
    description: describe(route),
    operationId: operationId(route.method, route.path),
    security: route.auth === 'public' ? [] : [{ session: [] }],
    ...(route.auth !== 'public' && { 'x-required-role': route.auth.toUpperCase() }),
    ...(parameters.length && { parameters }),
    ...(body && { requestBody: { required: true, content: body } }),
    responses,
  };
};

/** Keeps the schema components reachable from `root` through `$ref`s, in their original order. */
const reachable = (root, schemas) => {
  const kept = new Set();
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    const match = typeof node.$ref === 'string' && node.$ref.match(/^#\/components\/schemas\/(.+)$/);
    if (match && !kept.has(match[1])) {
      kept.add(match[1]);
      visit(schemas[match[1]]);
    }
    Object.values(node).forEach(visit);
  };
  visit(root);
  return Object.fromEntries(Object.entries(schemas).filter(([name]) => kept.has(name)));
};

const buildDocument = () => {
  const { schemas, refFor } = responseComponents(extraResponseSchemas);

  const paths = {};
  for (const route of routes) {
    const path = openApiPath(route.path);
    paths[path] ??= {};
    paths[path][route.method.toLowerCase()] = operation(route, refFor);
  }

  const document = {
    openapi: '3.1.0',
    info: {
      title: 'Pageaters API',
      version: '1.0.0',
      description: components.description,
      license: { name: 'All Rights Reserved' },
    },
    servers: [{ url: '/', description: 'This deployment' }],
    tags: components.tags,
    'x-tagGroups': components.TAG_GROUPS,
    paths,
    components: {
      securitySchemes: components.securitySchemes,
      headers: components.headers,
      responses: components.responses,
    },
  };
  document.components.schemas = reachable(document, schemas);
  return document;
};

module.exports = { buildDocument, openApiPath };
