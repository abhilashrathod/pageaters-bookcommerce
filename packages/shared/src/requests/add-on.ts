import { z } from 'zod';
import { objectIdFieldSchema } from './common.ts';

// GET /add-ons/produtct/:productId (sic). Add-ons are not linked to products (the model has no such field), so every
// live add-on is offered with every live store book; since Phase 4 the API checks that `productId` is a live store
// book's id (INVALID_ID, BOOK_NOT_EXIST) instead of ignoring it.
export const addOnGroupsParamsSchema = z.object({
  productId: objectIdFieldSchema,
});
export type AddOnGroupsParams = z.infer<typeof addOnGroupsParamsSchema>;
