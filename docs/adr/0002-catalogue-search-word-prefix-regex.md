# 0002 — Catalogue search is a word-prefix regex query

- Status: Accepted
- Date: 2026-10-30

## Context

The API's public searches (books, authors, categories, collections, bundles) used lunr indexes built in memory once
per process. On Vercel Functions that means every cold start reads the whole catalogue, and every warm instance serves
results that are stale after any catalogue write until it is recycled. AGENTS.md §4.5 forbids long-lived in-process
state, so PLAN.md Phase 4 called for replacing lunr with a MongoDB text index or Atlas Search.

The shopper search is type-ahead: `tw` must find "Test Book Two". Neither planned option keeps that:

- A MongoDB `$text` index matches whole (stemmed) words only; it cannot match the start of a word.
- Atlas Search can, but it does not exist in the in-memory MongoDB the API tests run on, and the free Atlas tier caps
  the number of search indexes below the five entities that need one.

The catalogue is small (a few thousand books, fewer of everything else).

## Decision

Each search runs a per-request MongoDB query: a case-insensitive regex anchored at the start of a word,
`(?:^|\W)<term>`, over the same fields lunr indexed. A non-string query answers nothing; otherwise control characters
become spaces, and the text is trimmed, cut to 100 characters and escaped before it becomes a pattern; it is split on
whitespace into at most 5 terms. Every term must match some field (AND across terms, OR across fields). Each search
answers at most 10 live records, most popular first (categories: most books first), with a 1 s query time limit.

## Consequences

- No index to build or keep in sync: a catalogue write is visible to the next search, and cold starts do no work.
- Behaviour differs from lunr: several words must all match (lunr matched any), there is no stemming or stop-word
  removal, and "word start" follows the ASCII definition of a word character, so an accented letter counts as a
  boundary.
- A leading-alternation regex cannot use an index, so every search scans its collection. That is acceptable at this
  catalogue size behind the public rate limits; if the catalogue grows, revisit with Atlas Search (autocomplete) in a
  new ADR.
