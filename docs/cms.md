# CMS blocks

Each Payload block (`apps/cms/src/blocks/`) has a storefront component in `apps/storefront/src/blocks/registry.ts`
and a type in `packages/cms-types`.

## Free blocks

- **FAQ** (`faq`) — optional heading and a list (at least one) of questions with plain-text answers. Rendered as an
  accordion of native `<details>`/`<summary>` rows: no client JS, keyboard and screen-reader friendly, line breaks in
  answers kept.
