import { stockAlertSchema } from '../../commerce/stock-alert.ts';
import { apiResponse } from '../../primitives.ts';

// POST /stock-alerts: the alert just created, references as ids. The check and the unsubscribe answer
// `shopperCheckResponseSchema` and `shopperEmptyResponseSchema`.
export const shopperStockAlertResponseSchema = apiResponse(stockAlertSchema);
