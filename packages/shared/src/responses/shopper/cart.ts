import { z } from 'zod';

import { apiResponse } from '../../primitives.ts';

// Every cart write answers `true` (POST /cart/add and /cart/add/addOn used to answer the unpopulated cart document,
// with a stale `subTotal`, when the line was already there). Re-read GET /cart/retrieve for the priced cart.
export const shopperCartWriteSchema = z.literal(true);
export const shopperCartWriteResponseSchema = apiResponse(shopperCartWriteSchema);
