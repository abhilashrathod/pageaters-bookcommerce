# Storefront (legacy)

The original Pageaters shop front: Next.js 12, Pages Router. It is rebuilt on the App Router in PLAN.md Phase 7.

## Setup

1. Copy the env template. Next.js reads `.env.local`, which is gitignored:

   ```bash
   cp apps/storefront/.env.example apps/storefront/.env.local
   ```

   Each variable is described in [`.env.example`](./.env.example). The defaults point at the local API on
   `http://localhost:5005/api/v1`. Only use a Razorpay **test-mode** key (`rzp_test_…`).

2. Start the dev server from the repo root (needs `pnpm install` first):

   ```bash
   pnpm dev --filter=storefront
   ```

   Open <http://localhost:3000>.
