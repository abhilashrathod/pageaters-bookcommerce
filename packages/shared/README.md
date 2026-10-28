# @pageaters/shared

Domain contracts shared by the API, the api-client, the storefront and the admin: zod schemas, the types inferred
from them, and domain enums. Isomorphic: no Node or DOM APIs outside tests.

```sh
pnpm --filter @pageaters/shared build       # tsc → dist/ (ESM .js + .d.ts)
pnpm --filter @pageaters/shared typecheck
pnpm --filter @pageaters/shared lint
pnpm --filter @pageaters/shared test        # builds, then node --test on src/**/*.test.ts
```

Consumers import the built package by name (`import { objectIdSchema } from '@pageaters/shared'`); `turbo` builds it
first through `^build`.

## Layout

| Path                 | Holds                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `src/index.ts`       | The public barrel                                                                        |
| `src/primitives.ts`  | ObjectId, ISO date, money, image URL, pagination query and page envelope, API wrapper    |
| `src/enums.ts`       | Domain enums (roles, statuses, product, order and payment values) as the API stores them |
| `src/{d}/` (planned) | Books, authors, categories, collections, bundles, product sets, deals…                   |
| `src/{d}/` (planned) | Users, addresses, carts, favourites, orders, store credit…                               |
| `src/{d}/` (planned) | Request payloads (replacing the API's Joi validators)                                    |

## Conventions

- A schema is `fooSchema`; its type is `type Foo = z.infer<typeof fooSchema>`. Types are never written by hand, except the generic `Paginated<T>` and `ApiResponse<T>`, which a test checks against their schemas.
- An enum is an `as const` object, a `z.enum` schema and the inferred type, all sharing the name:
  `UserRole.ADMIN`, `userRoleSchema`, `type UserRole`. Values are exactly what the API stores in MongoDB.
- Relative imports use `.ts` specifiers. Tests run on the sources through Node's type stripping, and `tsc`
  rewrites the specifiers to `.js` in `dist/` (`rewriteRelativeImportExtensions`), so the build runs in plain Node.
- Only erasable TypeScript (`erasableSyntaxOnly`): no TS `enum`, no namespaces, no parameter properties.
- Tests sit next to the code as `*.test.ts` and use `node:test`; `src/dist.test.ts` imports the built package
  by name to prove the `exports` map works in plain Node ESM.
- Wire formats: dates are ISO strings (`isoDateSchema`), money is rupees as a number with at most two decimals
  (`moneySchema`), list queries arrive as strings and are coerced (`paginationQuerySchema`).
