import {
  addressCreatePayloadSchema,
  shopperAddressListResponseSchema,
  shopperAddressResponseSchema,
  shopperEmptyResponseSchema,
  shopperPincodeServiceabilityResponseSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// The shopper's delivery addresses (`apps/api/src/routes/address.routes.js`, mounted at /addresses). `id` is the
// address's ObjectId.
const address = shopperAddressResponseSchema.shape.data;

export const addresses = {
  // GET /addresses
  list: defineEndpoint({ method: 'GET', path: '/addresses', response: shopperAddressListResponseSchema.shape.data }),
  // GET /addresses/:id
  detail: defineEndpoint({ method: 'GET', path: '/addresses/:id', response: address }),
  // POST /addresses — the PIN code must be serviceable (else 400 `PINCODE_ERROR`); `isDefault: true` unsets the
  // previous default.
  create: defineEndpoint({ method: 'POST', path: '/addresses', body: addressCreatePayloadSchema, response: address }),
  // PUT /addresses/:id — sets only the fields sent; the others stay. A new PIN code must be serviceable (else 400
  // `PINCODE_ERROR`); `isDefault: true` unsets the previous default. An id that isn't one of the shopper's live
  // addresses is a 400 `ADDRESS_NOT_EXIST`.
  update: defineEndpoint({
    method: 'PUT',
    path: '/addresses/:id',
    body: addressCreatePayloadSchema.partial(),
    response: address,
  }),
  // DELETE /addresses/:id — soft delete.
  remove: defineEndpoint({ method: 'DELETE', path: '/addresses/:id', response: shopperEmptyResponseSchema.shape.data }),
  // PATCH /addresses/:id — makes it the default address.
  makeDefault: defineEndpoint({ method: 'PATCH', path: '/addresses/:id', response: address }),
  // GET /addresses/check-pincode/:pincode — public (no session needed); asks the courier.
  checkPincode: defineEndpoint({
    method: 'GET',
    path: '/addresses/check-pincode/:pincode',
    response: shopperPincodeServiceabilityResponseSchema.shape.data,
  }),
};
