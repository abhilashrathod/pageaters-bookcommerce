# cms

Pageaters content — Payload CMS 3 on Next.js 16 (App Router), MongoDB adapter, Vercel Blob storage.

Content only (pages, templates, globals, blocks), in its own database (`pageaters_cms`, never the API's
`pageaters_api`); commerce records stay in the API and are referenced by ID (AGENTS.md "apps/cms").

## Setup

Configuration comes from environment variables only, validated with zod at boot in `src/env.ts`. Invalid or missing
config stops the CMS with one message naming each bad variable and the rule it breaks, never its value.
`.env.example` documents each one: `MONGODB_URI` and `PAYLOAD_SECRET` are required; `BLOB_READ_WRITE_TOKEN` is
optional locally (media then go to the gitignored `media/`) and required on Vercel.

```sh
cp .env.example .env        # then fill in the values
pnpm dev                    # http://localhost:3001 (opens /admin)
pnpm build && pnpm start    # production build, same port
pnpm lint                   # ESLint (flat config on @pageaters/config/eslint/next)
pnpm typecheck
pnpm test                   # node --test (env validation)
pnpm generate:importmap     # after adding admin components (writes src/app/(payload)/admin/importMap.js)
pnpm generate:types         # after changing collections/globals/blocks (writes packages/cms-types; commit it)
```

The first visit to `/admin` offers to create the first user. Create the owner account before a deployment's URL
is public; later steps seed the editor accounts.

`src/app/(payload)/`, the import map and `packages/cms-types/src/payload-types.ts` are written by Payload: don't edit
them by hand.
