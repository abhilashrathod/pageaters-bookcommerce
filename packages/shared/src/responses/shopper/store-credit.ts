import { storeCreditBalanceSchema, storeCreditSchema } from '../../commerce/store-credit.ts';
import { apiResponse, paginated } from '../../primitives.ts';

// GET /store-credit: the shopper's balance.
export const shopperStoreCreditBalanceResponseSchema = apiResponse(storeCreditBalanceSchema);
// GET /store-credit/history: the shopper's transactions, newest first.
export const shopperStoreCreditHistoryResponseSchema = apiResponse(paginated(storeCreditSchema));
