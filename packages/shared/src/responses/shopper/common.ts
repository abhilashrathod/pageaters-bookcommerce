import { z } from 'zod';

import { apiResponse } from '../../primitives.ts';

// `data` of a response that carries nothing: `res.ok('KEY')` and most writes send `{}`. Not strict, so a legacy
// response that sends more (see `auth.ts`) still parses, and the extra keys are dropped when validating.
export const shopperEmptyDataSchema = z.object({});
export type ShopperEmptyData = z.infer<typeof shopperEmptyDataSchema>;
export const shopperEmptyResponseSchema = apiResponse(shopperEmptyDataSchema);

// `data` of a yes/no check (GET /favorites/:product, GET /stock-alerts/:product).
export const shopperCheckResponseSchema = apiResponse(z.boolean());
