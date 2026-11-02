# storefront

The Pageaters shop front — Next.js 16 (App Router), Tailwind CSS v4 and shadcn/ui. Being rebuilt in Phase 7; the
legacy Pages Router app is in git history (before this rebuild, at commit `11f22aa`).

Content and layout come from the CMS (Payload REST API), commerce data from the API through `@pageaters/api-client`.
Theme tokens: the defaults are in `@pageaters/config/tailwind/theme.css`; the CMS Theme global overrides them as
`:root` CSS variables (`src/lib/theme.ts`). Images load only from Vercel Blob and Open Library (`next.config.ts`).

```sh
cp .env.example .env.local   # all values have local defaults
pnpm dev                     # http://localhost:3000 (CMS on :3001, API on :5005)
pnpm lint
pnpm typecheck
pnpm test                    # node --test (env, theme)
pnpm build
```

UI components follow shadcn/ui (`components.json`); add one with `pnpm dlx shadcn@latest add <name>` from this folder.
