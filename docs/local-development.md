# Local development (with the seed)

## Prerequisites

- Node 22 LTS (`.nvmrc`) and pnpm (version pinned in the root `package.json` `packageManager`). Never npm or yarn.
- MongoDB with two databases: `pageaters_api` for the API (the seed refuses any other name) and a separate one for
  the CMS (its `env.ts` refuses `pageaters_api`). The demo uses MongoDB Atlas; a local server works too.
- For the seed's image upload: a Vercel Blob token.

```sh
pnpm install
```

## Environment files

Each app validates its environment at boot with zod and documents every variable in its `.env.example`. Copy it to
`.env` in the same folder and fill it in; `.env` is gitignored.

| App               | File                               | Notes                                                                                 |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| `apps/api`        | `apps/api/.env.example`            | Also read by the seed scripts (`upload`, `accounts`, `load`)                          |
| `apps/cms`        | `apps/cms/.env.example`            |                                                                                       |
| `apps/storefront` | `apps/storefront/.env.example`     | Defaults point at the local API (`:5005`) and CMS (`:3001`)                           |
| `apps/admin`      | `apps/admin/src/environments/*.ts` | No `.env`: the API and CMS URLs are build-time constants (`localhost` in development) |

Local ports: storefront 3000, CMS 3001, admin 4200, API 5005.

## Seed

The catalog comes from the original store's books-only export, which stays **outside** the repo
(`../pageaters-data-dump`). Without it you can't regenerate `seed/data/`; everything it produces is local and
gitignored, never committed or deployed. Steps (details in `seed/README.md`):

```sh
pnpm --filter @pageaters/seed sanitise   # dump → seed/data/*.json: allowlisted fields, generated stock, PII scan
pnpm --filter @pageaters/seed covers     # Open Library covers by ISBN (network, ~10 min)
pnpm --filter @pageaters/seed authors    # author photos or initials avatars (network, ~10 min)
pnpm --filter @pageaters/seed artwork    # brand artwork for books without covers, bundles, collections, categories
pnpm --filter @pageaters/seed upload     # images → Vercel Blob, image fields → Blob URLs
pnpm --filter @pageaters/seed accounts   # checks SUPER_ADMIN_* in apps/api/.env
pnpm seed                                # load into the API database (root; --dry-run previews, --sync mirrors exactly)
```

`pnpm seed` is idempotent: by default it only inserts missing documents, so later super-admin edits survive. It
refuses unless the database is `pageaters_api` and every image field is a Blob URL. It also creates the demo shopper,
demo admin and super-admin accounts. Why seeded once: the demo catalog is never reloaded; the weekly cleanup resets
only visitor data ([demo-mode.md](./demo-mode.md)).

Then the CMS:

```sh
pnpm --filter cms seed:users     # owner admin (SUPER_ADMIN_* in apps/cms/.env) + read-only demo login
pnpm --filter cms seed:content   # homepage, templates, globals, footer pages (published)
```

`seed:content` creates only what is missing, so it never overwrites edits. Run it with the API up, or the homepage's
product set rows are skipped with a warning.

## Running

```sh
pnpm dev                      # all apps
pnpm dev --filter=storefront  # one app
```

## Tests

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # the gates
pnpm --filter api test                                   # one workspace
pnpm cms:types                                           # regenerate packages/cms-types after a CMS schema change
```

**E2E** (`e2e/`, Playwright, one happy path: browse → cart → cash on delivery → admin ships → delivered). Start the
API with `DEMO_MODE=true` and mock adapters, the storefront and the admin first, then:

```sh
pnpm test:e2e
```

`E2E_STOREFRONT_URL`, `E2E_ADMIN_URL` and `E2E_API_URL` override the default localhost URLs.

## Gotchas

- **Demo mode locally:** with `DEMO_MODE=true` the API refuses to boot while any SendGrid/Twilio key is set or
  `CRON_SECRET` is missing. Blank those keys and pass a throwaway `CRON_SECRET` on the command line rather than
  editing your `.env`.
- **Storefront build needs the API:** `sitemap.ts` and `/book-boxes` fetch the catalog at build time, so run the API
  on `:5005` (or set `API_URL`/`NEXT_PUBLIC_API_URL`) before `pnpm build`.
- **API tests use the built `@pageaters/shared`:** after changing `packages/shared`, run
  `pnpm turbo run build --filter=@pageaters/shared` first, or the suites fail in their hooks.
- **Admin dev server caches packages:** after changing `packages/shared` or `packages/api-client`, restart
  `ng serve` (delete `apps/admin/.angular/cache` if still stale).
- **Online payment stays `created` locally:** Razorpay's test webhook can't reach `localhost`. Use cash on delivery.
- **Uploads locally** need `STORAGE_ADAPTER=blob`; the default mock returns URLs that never load.
- **CMS tests** run with `--test-force-exit` because Payload leaves a handle open.
- **Cookies on localhost** are shared across ports, so two demo-shopper sessions on one machine interfere.
