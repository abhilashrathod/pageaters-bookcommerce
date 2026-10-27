# @pageaters/seed

Sanitised catalog for local development, generated from the original store's books-only export.
The raw dump stays outside the repo (`../pageaters-data-dump`) and is never committed.

```sh
pnpm --filter @pageaters/seed sanitise [dump-dir]   # default: $SEED_DUMP_DIR or ../pageaters-data-dump
pnpm --filter @pageaters/seed covers                # after sanitise; needs network (~10 min)
pnpm --filter @pageaters/seed authors               # after sanitise; needs network (~10 min)
pnpm --filter @pageaters/seed artwork               # after covers; offline, instant
```

Writes `data/{authors,bundles,categories,collections,product-sets,store-books}.json` in MongoDB Extended JSON.
Running it again on the same dump produces identical files. `data/` is gitignored: seed data is for local
development only and is never committed or deployed.

What the pipeline does:

- Copies only allowlisted fields per collection, nested keys included (`src/collections.ts`). Fields not on the list are dropped and
  reported, and the run exits 1 without writing until someone reviews them.
- Never copies `wholeSalePriceHistory` (supplier prices), `inventory` (real stock) or `__v`.
- Drops soft-deleted documents and prunes every reference to them, checked against the target collection. Inactive product sets are kept.
- Generates stock from each document ID (`src/stock.ts`): about 5% of books out of stock, the rest 1–1000. The
  demo is seeded once and never reset, so stock must outlast the occasional demo order.
- Recounts `numberOfBooks` per category, clears legacy canonical URLs, normalises `EN` to `English` and cleans
  ISBNs (digits only, first ISBN when several were typed).
- Scans the output for sensitive data before writing it (`src/scan.ts`): emails, UPI IDs, phone numbers, Aadhaar,
  card and account numbers, GSTIN/PAN/IFSC, the old store's domains and handles, links, social handles and business
  terms. Findings are printed masked. Any finding outside the reviewed list, or a reviewed count that changes, fails
  the run and leaves `data/` untouched.

| Script      | Purpose                                            |
| ----------- | -------------------------------------------------- |
| `sanitise`  | Dump → `data/`                                     |
| `covers`    | Open Library covers → `data/images/covers/`        |
| `authors`   | Author photos or initials → `data/images/authors/` |
| `artwork`   | Brand artwork → `data/images/artwork/`             |
| `test`      | Unit tests on synthetic data                       |
| `lint`      | ESLint                                             |
| `typecheck` | `tsc --noEmit`                                     |

## Covers

`covers` downloads book covers from Open Library, always anchored on the book's ISBN (`src/covers.ts`): first the
cover of that exact edition (Books API, 50 ISBNs per request), then the cover of the whole work (search by ISBN, one
request a second). A cover is used only when Open Library's title matches ours, or the mismatch was reviewed and
listed in `acceptedTitleMismatches`. Writes `data/images/covers/<bookId>-<coverId>.jpg`, `data/covers.json` and
`data/cover-misses.json` (with a reason per book). Reruns keep files already on disk and remove ones no longer used.

## Author images

`authors` gives every author an image (`src/authors.ts`). An Open Library photo is used only when the author is
matched with confidence: listed on the Open Library edition of one of their own books (by ISBN) with the same
surname and first initial, or found by search with exactly our name and a best-known work among our titles for them.
Everyone else gets a branded initials avatar (SVG, accent background). Writes
`data/images/authors/<authorId>-<photoId>.jpg` or `<authorId>.svg` and `data/author-images.json` (with the match
method, or why initials were used). Shared Open Library plumbing (retries, throttling, atomic writes, the guarded
clean-up of unused files) is in `src/openlibrary.ts`.

## Brand artwork

`artwork` generates SVG artwork in the brand colours (`src/artwork.ts`) for every book without a usable cover (it
reads `data/covers.json`), and for every bundle, collection and category. Books get a cover with a coloured spine,
title, series line and author; bundles a stack of books with their count; collections a shelf of spines; categories
an open book. Text sits in the middle because cards crop images to fit. Writes
`data/images/artwork/<kind>/<id>.svg` and `data/artwork.json`; reruns give identical files. Real images can replace
any of these later through super-admin uploads.
