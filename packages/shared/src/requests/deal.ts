import { z } from 'zod';
import { objectIdFieldSchema } from './common.ts';

// GET /deals (public): the `category` filter must be a category id (INVALID_ID), so a malformed one answers 400
// instead of failing Mongoose's cast. '' means no filter. Page, limit and sort are checked by the API's paging
// helper (INVALID_PAGING, SORTING_NOT_ALLOWED), as on every list.
export const dealListFilterSchema = z.object({
  category: z.union([z.literal('').transform(() => undefined), objectIdFieldSchema], { error: 'INVALID_ID' }).optional(),
});
export type DealListFilter = z.infer<typeof dealListFilterSchema>;
