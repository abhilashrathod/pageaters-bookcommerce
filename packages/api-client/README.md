# @pageaters/api-client

Typed client for the Pageaters API, used by the storefront (Next.js, server and client components) and the admin
(Angular). Promise-based on the global `fetch`; it uses only globals that browsers, Next.js and Node 22 share (no
DOM- or Node-only APIs, enforced by lint and by building against the DOM lib while type-checking against Node's).
Response types come from `@pageaters/shared`.

```sh
pnpm --filter @pageaters/api-client build       # tsc → dist/ (ESM .js + .d.ts)
pnpm --filter @pageaters/api-client typecheck
pnpm --filter @pageaters/api-client lint
pnpm --filter @pageaters/api-client test        # builds, then node --test on src/**/*.test.ts
```

## Usage

```ts
import { createApiClient, isApiError } from '@pageaters/api-client';

// Browser (storefront client components, admin): the API's httpOnly cookies go along by default.
const api = createApiClient({ baseUrl: 'https://api.demo.pageaters.com/api/v1' });

const category = await api.categories.detail({ id: 'CA-0123456789' }); // Category
const page = await api.categories.list({ page: 2, limit: 20 }); // Paginated<CategoryListItem>
```

On the Next.js server there is no browser cookie jar, so forward the visitor's cookies per call. The client never
imports Next; the app passes a function:

```ts
import { cookies } from 'next/headers';

const api = createApiClient({
  baseUrl: process.env.API_URL,
  headers: async () => ({ cookie: (await cookies()).toString() }),
  timeoutMs: 0,
});

await api.categories.detail({ id }, { next: { tags: [`category:${id}`], revalidate: 3600 } });
```

Use `timeoutMs: 0` for the Next server client (or wrap calls in React's `cache()`). Next.js de-duplicates identical
`fetch` calls within a render, but not one that carries an `AbortSignal`; the client only passes a signal when a
timeout or a caller `signal` needs one, so with no timeout two blocks asking for the same category share one request.
Vercel's function timeout bounds a hung call instead.

Angular wraps calls in `from(api.categories.list(query))`; pass an `AbortSignal` if the call should cancel on
unsubscribe.

### Options

| Client option    | Default        | Meaning                                                                                                                                                                   |
| ---------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`        | —              | API root including `/api/v1`. May be relative (`/api/v1`) behind a same-origin proxy                                                                                      |
| `fetch`          | global `fetch` | Custom implementation (tests, instrumentation); must honour `init.signal` for timeouts                                                                                    |
| `credentials`    | `'include'`    | The API authenticates with httpOnly cookies on its own domain                                                                                                             |
| `headers`        | —              | Object, `Headers`, entries, or a (async) function run per call                                                                                                            |
| `validate`       | `false`        | Parse each response's `data` with the endpoint's schema                                                                                                                   |
| `timeoutMs`      | `15000`        | Aborts a call whose body hasn't arrived in time; `0` disables                                                                                                             |
| `onUnauthorized` | —              | Awaited before a 401 is thrown (clear state, route to login). The API has no refresh flow. If it throws, the call still rejects with the 401, the hook's error as `cause` |

Per call: `signal`, `validate`, `timeoutMs`, `headers` (merged over the client's), and Next's `cache` and
`next: { tags, revalidate }`, passed to `fetch` untouched (left out when unset). Every fetch uses
`redirect: 'error'`: the API never redirects, and following one could carry forwarded cookies elsewhere.

### Errors

Every failure rejects with an `ApiError` (`statusCode`, `code`, `message`, `data`, `issues`). Use `isApiError(e)`
rather than `instanceof`: it works across duplicated bundles.

| `code`                               | `statusCode` | When                                                                               |
| ------------------------------------ | ------------ | ---------------------------------------------------------------------------------- |
| the API's key (`CATEGORY_NOT_EXIST`) | HTTP status  | The API sent its error envelope (non-2xx, or `statusCode` ≥ 400)                   |
| `CLIENT_HTTP_ERROR`                  | HTTP status  | Non-2xx without the envelope (proxy HTML, plain-text 429); `data` is the body text |
| `CLIENT_INVALID_RESPONSE`            | HTTP status  | 2xx that isn't the JSON envelope; `data` is the body text                          |
| `CLIENT_VALIDATION_FAILED`           | HTTP status  | Validation on and `data` didn't match; see `issues`, `data`                        |
| `CLIENT_NETWORK_ERROR`               | `0`          | `fetch` rejected (offline, DNS, CORS); original error in `cause`                   |
| `CLIENT_TIMEOUT`                     | `0`          | `timeoutMs` elapsed                                                                |
| `CLIENT_ABORTED`                     | `0`          | The caller's `signal` aborted                                                      |

The client's codes are exported as `ClientErrorCode`.

- Request validation failures (the legacy Joi validators) are 400s whose `code` is the Joi message, e.g.
  `REQUIRED_QUANTITY` or `INVALID_ID`.
- A 401's `code` is always `UNAUTHORIZED`; the reason (`INVALID_TOKEN`…) only appears translated in `message`.
- Log `code`, `statusCode` and `issues`, never `data`: it holds the response or the raw body, which may carry
  personal data.
- A path that would leave the base URL (not starting with a single `/`, or resolving above the base path) throws a
  `TypeError` before any request, as does a missing or invalid path param.

### Validation

Off by default: `data` is cast to the endpoint's `z.output` type with no parsing at all, because the legacy API
breaks some target contracts until Phase 4. Turn it on per client or per call (`{ validate: true }`) to parse with
the shared schema; the parsed value is returned (unknown keys stripped). Response schemas therefore must not use
transforms or defaults, or the unvalidated cast would lie about the shape.

### Bundle size

Endpoint objects reference the shared zod schemas (for validation and types), so a bundle that imports the client
includes zod and those schemas even with validation off. Tree-shaking can't drop them while the endpoint registry is
reachable.

### Requests

- Path params: whole-segment `:name` params, `name` matching `[A-Za-z0-9_]+` (checked by `defineEndpoint`),
  required by the types and URI-encoded. `''`, `.`, `..`, `NaN` and `Infinity` are rejected at runtime (they would
  reach another route).
- Query: `undefined`/`null` are skipped, numbers and booleans stringified, arrays sent as repeated keys
  (`categories=a&categories=b`), which Express parses into an array.
- Body: JSON. `FormData` is passed through untouched (fetch sets the multipart boundary).
- `client.request({ method, path, query, body, response })` is the escape hatch for a call no endpoint describes.

## Defining endpoints

An endpoint is data; the client turns it into a function. A call takes one flat object, as the API reads one
merged object (`req.allParams()`): path params are taken out by name, the rest becomes the query or the JSON
body, whichever the endpoint declares (not both — a type error).

```ts
import { categoryDetailResponseSchema, paginationQuerySchema, categoryListResponseSchema } from '@pageaters/shared';
import { defineEndpoint } from '../../core/endpoint.ts';

export const categories = {
  list: defineEndpoint({
    method: 'GET',
    path: '/categories',
    query: paginationQuerySchema, // z.input → call input (defaulted fields optional)
    response: categoryListResponseSchema.shape.data, // z.output of the envelope's data → result
  }),
  detail: defineEndpoint({
    method: 'GET',
    path: '/categories/unique/:id',
    response: categoryDetailResponseSchema.shape.data,
  }),
};
// client.categories.detail({ id }) → Promise<Category>; detail({}) is a compile error.
```

`response` is the schema of the envelope's `data`; shared's `fooResponseSchema.shape.data` reuses its definition.
Request schemas give types only: the API validates. A field whose shared input type is `unknown` (the
`z.preprocess` coercions, e.g. `page`, a cart `quantity`) is typed by its output instead (`number`), in queries and
bodies alike; defaulted fields stay optional. Every query field must be a `QueryValue` (string, number, boolean,
or an array of those): a query schema with an object field fails to compile at `defineEndpoint`.

## Layout

| Path                        | Holds                                                      | Owner           |
| --------------------------- | ---------------------------------------------------------- | --------------- |
| `src/index.ts`              | Public barrel, the endpoint registry and `createApiClient` | orchestrator    |
| `src/core/`                 | Transport, errors, URL building, `defineEndpoint`/binding  | 2a              |
| `src/endpoints/shopper/`    | Public and shopper resources, mounted at the top level     | 2a (sample), 2b |
| `src/endpoints/admin/`      | Admin resources, mounted under `client.admin`              | 2c              |
| `src/testing/mock-fetch.ts` | Test helper (`mockFetch`, `ok`, `json`); not built         | —               |

One file per resource (`categories.ts`, `cart.ts`…) exporting a plain object of endpoints; each folder's `index.ts`
collects them. Shopper resources sit at the top level (`client.cart.add()`); admin ones under `client.admin`
(`client.admin.categories.create()`), so a public and an admin resource can share a name and the two folders never
edit the same file. The registry in `src/index.ts` belongs to the orchestrator, which mounts each folder at merge:

```ts
export const endpoints = {
  ...shopperEndpoints,
  admin: adminEndpoints, // added by the orchestrator when 2c merges, with its import
};
```

`request` is reserved at the top level (the escape hatch); a resource with that name fails to compile.

## Conventions

- Endpoint names are verbs or nouns of the action (`list`, `detail`, `search`, `add`, `remove`), not HTTP verbs.
- Types come from `@pageaters/shared` schemas; never written by hand. A payload with no shared schema yet is typed
  in the endpoint file and listed for Phase 4.
- Relative imports use `.ts` specifiers; tests sit next to the code as `*.test.ts` (`node:test`), with a mocked
  `fetch` and no network. `src/dist.test.ts` imports the built package by name in plain Node ESM.
- Only erasable TypeScript (`erasableSyntaxOnly`).
