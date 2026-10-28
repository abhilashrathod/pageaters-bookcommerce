# @pageaters/seed

Sanitised catalog for local development, generated from the original store's books-only export.
The raw dump stays outside the repo (`../pageaters-data-dump`) and is never committed.

```sh
pnpm --filter @pageaters/seed sanitise [dump-dir]   # default: $SEED_DUMP_DIR or ../pageaters-data-dump
pnpm --filter @pageaters/seed covers                # after sanitise; needs network (~10 min)
pnpm --filter @pageaters/seed authors               # after sanitise; needs network (~10 min)
pnpm --filter @pageaters/seed artwork               # after covers; offline, seconds
pnpm --filter @pageaters/seed upload                # last; needs BLOB_READ_WRITE_TOKEN in apps/api/.env (~7 min first time)
pnpm --filter @pageaters/seed accounts              # checks SUPER_ADMIN_* in apps/api/.env
pnpm seed                                           # from the repo root: load into the API database
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
| `upload`    | Images → Vercel Blob; image fields → Blob URLs     |
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
Everyone else gets a branded initials avatar (PNG rendered with the brand font, accent background). Writes
`data/images/authors/<authorId>-<photoId>.jpg` or `<authorId>.png` and `data/author-images.json` (with the match
method, or why initials were used). Shared Open Library plumbing (retries, throttling, atomic writes, the guarded
clean-up of unused files) is in `src/openlibrary.ts`.

## Brand artwork

`artwork` generates artwork in the brand colours (`src/artwork.ts`) for every book without a usable cover (it
reads `data/covers.json`), and for every bundle, collection and category. Books get a cover with a coloured spine,
title, series line and author; bundles a stack of books with their count; collections a shelf of spines; categories
an open book. Text sits in the middle because cards crop images to fit. The SVGs are rendered to PNG with the Metropolis font embedded (`src/render.ts`, from `@fontsource/metropolis`;
system fonts are never used), so the look is the same everywhere. Writes `data/images/artwork/<kind>/<id>.png` and
`data/artwork.json`; reruns give identical files. Real images can replace
any of these later through super-admin uploads.

## Upload to Vercel Blob

`upload` puts every image on Vercel Blob (public, cached for a year) and rewrites the image fields in `data/*.json`:
book `poster` (cover, else artwork; legacy extra `images` are cleared), author `avatar`, bundle and collection
`poster`, category `thumbnail` and `meta.imageUrl`. Blob paths include a hash of the content
(`catalog/covers/<bookId>-<coverId>-<hash>.jpg`), so unchanged images are never uploaded twice and a changed image
gets a new URL. Every document must end up with an image, or the run fails. If an upload fails, the seed files are
left as they were and the successful uploads are kept in `data/image-manifest.json` for the rerun.

Run order: `sanitise` → `covers` → `authors` → `artwork` → `upload`. Rerun `upload` after `sanitise`, which
rewrites the seed files without URLs.

## Demo accounts

`src/accounts.ts` builds the API's demo accounts when the seed is loaded; they are never written to `data/`:
demo shopper (`USER`, with one saved address), demo admin and super-admin (both `ADMIN` until Phase 5 adds the
demo roles). The super-admin comes from `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in `apps/api/.env`; only a
salted hash is stored, the same way the API hashes passwords. `pnpm --filter @pageaters/seed accounts` checks those
settings without printing them.

## Loading into MongoDB

`pnpm seed` (from the repo root; `--dry-run` previews) loads `data/` and the demo accounts into the API database
from `MONGODB_URI` in `apps/api/.env`. It refuses unless that database is `pageaters_api` and every image field is a
Vercel Blob URL. It is safe to rerun: by default it only inserts what is missing, so edits made since (for example
by the super-admin) are kept and nothing is deleted. `--sync` makes the catalog match the seed exactly, replacing
documents and removing extras. Account credentials always follow `.env`; the demo shopper's address, cart and
favourites are only created when missing.

Full run order: `sanitise` → `covers` → `authors` → `artwork` → `upload` → `pnpm seed`.
