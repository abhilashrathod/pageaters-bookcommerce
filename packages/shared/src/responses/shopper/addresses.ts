import { z } from 'zod';

import { addressSchema } from '../../commerce/address.ts';
import { apiResponse } from '../../primitives.ts';

// GET /addresses: the shopper's live addresses, not paginated.
export const shopperAddressListResponseSchema = apiResponse(z.array(addressSchema));
// GET /addresses/:id, POST /addresses, PUT /addresses/:id, PATCH /addresses/:id (make default). An id that isn't one
// of the shopper's live addresses is a 400 `ADDRESS_NOT_EXIST` (PUT answered 200 with `data: null` before Phase 4).
export const shopperAddressResponseSchema = apiResponse(addressSchema);

// GET /addresses/check-pincode/:pincode: the courier's answer for a serviceable PIN code (an unserviceable one is
// a 400 `PINCODE_ERROR`). `isCod`/`isPrepaid` are the courier's flags as sent ('Y'/'N'), '' when missing. Only these
// fields are sent (the legacy API also sent the courier's raw record as `raw`; Phase 4 dropped it).
export const shopperPincodeServiceabilitySchema = z.object({
  main: z.object({
    serviceable: z.literal(true),
    isCod: z.string(),
    isPrepaid: z.string(),
    district: z.string(),
    state: z.string(),
  }),
});
export type ShopperPincodeServiceability = z.infer<typeof shopperPincodeServiceabilitySchema>;
export const shopperPincodeServiceabilityResponseSchema = apiResponse(shopperPincodeServiceabilitySchema);
