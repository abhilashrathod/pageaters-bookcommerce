# @pageaters/cms-types

TypeScript types of the CMS content (`apps/cms`, Payload 3): pages, templates, overrides, media, the globals and every
block, plus `CmsBlock`, `CmsBlockOf<'banner'>` and the `CMS_BLOCK_TYPES` list for the storefront's block registry.

`src/payload-types.ts` is generated, never edited by hand:

```sh
pnpm cms:types                     # from the root (Turbo); or pnpm --filter cms generate:types
                                   # after changing a collection, global or block; commit the result
```

`CMS_BLOCK_TYPES` has a compile-time check: `pnpm typecheck` fails until it lists exactly the generated block types.
