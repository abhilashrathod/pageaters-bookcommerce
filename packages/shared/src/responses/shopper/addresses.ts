import { z } from 'zod';

import { addressSchema } from '../../commerce/address.ts';
import { apiResponse } from '../../primitives.ts';

// GET /addresses: the shopper's live addresses, not paginated.
export const shopperAddressListResponseSchema = apiResponse(z.array(addressSchema));
// GET /addresses/:id, POST /addresses, PATCH /addresses/:id (make default).
export const shopperAddressResponseSchema = apiResponse(addressSchema);
// PUT /addresses/:id: null when the id isn't one of the shopper's addresses (the legacy existence check runs
// `Address.findOne()` with no filter, so it passes and the filtered update then matches nothing).
export const shopperAddressUpdateResponseSchema = apiResponse(addressSchema.nullable());

// GET /addresses/check-pincode/:pincode: the courier's answer for a serviceable PIN code (an unserviceable one is
// a 400 `PINCODE_ERROR`). `isCod`/`isPrepaid` are the courier's flags as sent ('Y'/'N'), '' when missing. The
// legacy API also sends the courier's raw record as `raw`; it is not part of the contract (Phase 4 drops it).
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
