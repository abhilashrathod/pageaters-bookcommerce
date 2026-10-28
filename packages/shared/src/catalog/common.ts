import { z } from 'zod';

import { objectIdSchema } from '../primitives.ts';

// Building blocks shared by the catalog schemas, plus the conventions they follow.
//
// References. The API sends a reference either as a bare ObjectId or, where a controller calls `.populate()`,
// as the referenced document. Populated documents are always projections (`select: 'title poster …'`), and some
// have their own references populated in turn (a related book's author). Each entity therefore has three layers:
// - `fooFieldsSchema`: its own fields, no references;
// - `fooRefSchema`: an id, or a projection of the fields (always with `_id`) whose references are again an id or
//   a projection of the target's fields — one level of nesting, which is as deep as the API populates;
// - `fooSchema`: the whole document, its references being `barRefSchema`s.
// The layers keep the types finite. Fully recursive schemas (getters referring back to `fooSchema`) typecheck, but
// the emitted declarations elide the deeper levels to `any`, so consumers would lose the types.
// Cross-file references sit in getters, so the modules' import cycles (book ↔ author…) resolve lazily.
//
// Soft-delete internals (`isDeleted`, `deletedAt`, and `isActive`/`deactivatedAt` on sets and deals) are left
// out: the API only ever serves live documents. Objects are not strict, so a response that still carries them
// (or `__v`) parses and the extra keys are dropped.

// An id, or a projection of the target's fields that always carries its `_id`.
export function ref<Shape extends z.ZodRawShape>(target: z.ZodObject<Shape>) {
  return z.union([objectIdSchema, target.partial().extend({ _id: objectIdSchema })]);
}

// A whole-number count that cannot go negative (stock, pages, number of books).
export const countSchema = z.number().int().nonnegative();

// `currentDiscount`: a percentage off the list price.
export const discountSchema = z.number().min(0).max(100);

// A link the storefront renders (`href`): a site-relative path, or an absolute https URL. Protocol-relative
// (`//host`, `/\host`) and other schemes (`javascript:`, `data:`, `http:`) are rejected.
export const linkSchema = z.union([
  z.string().regex(/^\/(?![/\\])[^\s\\]*$/, 'INVALID_LINK'),
  z.url({ protocol: /^https$/, hostname: z.regexes.domain }),
]);
