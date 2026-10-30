import { addOnSchema } from '../../catalog/add-on.ts';
import { productSetSchema } from '../../catalog/product-set.ts';
import { apiResponse } from '../../primitives.ts';

// Admin catalog responses shared lacks. Every other admin catalog read and write answers with the entity's whole
// document, which the catalog's `fooDetailResponseSchema` already describes (references are ids after a write and
// projections on the admin `GET /:id`). Those documents still carry the soft-delete flags and, for store books,
// `wholeSalePriceHistory`; the schemas strip them on parse and the API is fixed in Phase 4.

// GET /add-ons/:id, POST /add-ons, PUT /add-ons/:id: the whole document.
export const adminAddOnResponseSchema = apiResponse(addOnSchema);

// GET /product-sets/:id (entries kept, sorted by priority, books populated with their author), POST and PUT (entries
// as ids). Unlike the public detail, the entries are not flattened.
export const adminProductSetResponseSchema = apiResponse(productSetSchema);
