import { z } from 'zod';

import { addressTypeSchema } from '../enums.ts';
import { isoDateSchema, objectIdSchema } from '../primitives.ts';

// A saved delivery address (apps/api/src/models/address.model.js), as the address endpoints send it and as orders
// populate `deliveryAddress`. Every field has a model default, so all are present; the create validator requires
// name, phone, email (the controller falls back to the account email), city, state, pin code and line 1.
export const addressSchema = z.object({
  _id: objectIdSchema,
  userId: objectIdSchema,
  fullName: z.string(),
  // The API's `phone` validator: exactly 10 digits.
  contactNo: z.string().regex(/^\d{10}$/),
  email: z.email(),
  addressLine1: z.string(),
  addressLine2: z.string(),
  landmark: z.string(),
  city: z.string(),
  state: z.string(),
  // Indian PIN code, checked for serviceability by the API; the validator only requires a string.
  pinCode: z.string(),
  // ISO 3166 alpha-2; always 'IN' (the model default, never set by an endpoint).
  country: z.string(),
  type: addressTypeSchema,
  isDefault: z.boolean(),
  isDeleted: z.boolean(),
  // Legacy free-form string: '' or a `Date` cast to String by Mongoose ("Tue Oct 28 2026 …"), not ISO.
  deletedAt: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});
export type Address = z.infer<typeof addressSchema>;
