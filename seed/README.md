# @pageaters/seed

Sanitised catalog for local development, generated from the original store's books-only export.
The raw dump stays outside the repo (`../pageaters-data-dump`) and is never committed.

```sh
pnpm --filter @pageaters/seed sanitise [dump-dir]   # default: $SEED_DUMP_DIR or ../pageaters-data-dump
```

Writes `data/{authors,bundles,categories,collections,product-sets,store-books}.json` in MongoDB Extended JSON.
Running it again on the same dump produces identical files. `data/` is gitignored: seed data is for local
development only and is never committed or deployed.

What the pipeline does:

- Copies only allowlisted fields per collection, nested keys included (`src/collections.ts`). Fields not on the list are dropped and
  reported, and the run exits 1 until someone reviews them.
- Never copies `wholeSalePriceHistory` (supplier prices), `inventory` (real stock) or `__v`.
- Drops soft-deleted documents and prunes every reference to them, checked against the target collection. Inactive product sets are kept.
- Generates stock from each document ID (`src/stock.ts`): mostly 5–40, a few standalone books low or out of stock;
  books in a bundle and procurement, import and pre-order books are always orderable.
- Recounts `numberOfBooks` per category, clears legacy canonical URLs, and normalises `EN` to `English`.

| Script      | Purpose                      |
| ----------- | ---------------------------- |
| `sanitise`  | Dump → `data/`               |
| `test`      | Unit tests on synthetic data |
| `lint`      | ESLint                       |
| `typecheck` | `tsc --noEmit`               |
