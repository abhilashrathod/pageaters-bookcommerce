import { z } from 'zod';
import { addressTypeSchema } from '../enums.ts';
import { emailFieldSchema, objectIdFieldSchema, phoneFieldSchema } from './common.ts';
import { joiBoolean } from './convert.ts';

// Address payloads, ported from apps/api/src/validators/address.validator.js. Field names are the Mongoose
// Address model's. `country` is not sent (the model defaults it to 'IN').

const requiredText = (code: string) => z.string({ error: code }).trim().min(1);
const optionalText = (code: string) => z.string({ error: code }).trim().optional();

// POST /address. PUT /address/:id has no validator in the legacy API.
export const addressCreatePayloadSchema = z.strictObject({
  fullName: requiredText('INVALID_NAME'),
  contactNo: phoneFieldSchema,
  email: emailFieldSchema,
  city: requiredText('INVALID_CITY'),
  state: requiredText('INVALID_STATE'),
  pinCode: requiredText('INVALID_PINCODE'),
  isDefault: z.preprocess(joiBoolean, z.boolean({ error: 'INVALID_DEFAULT_SELECTION' })),
  addressLine1: requiredText('INVALID_ADD_1'),
  addressLine2: optionalText('INVALID_ADD_2'),
  landmark: optionalText('INVALID_LANDMARK'),
  // No error code in Joi, so zod's default message (Joi sent its own English text).
  type: addressTypeSchema.optional(),
});
export type AddressCreatePayload = z.infer<typeof addressCreatePayloadSchema>;

// GET, DELETE and PATCH /address/:id. Optional as in Joi; the route always supplies it.
export const addressGetPayloadSchema = z.strictObject({
  id: objectIdFieldSchema.optional(),
});
export type AddressGetPayload = z.infer<typeof addressGetPayloadSchema>;

// GET /address/check-pincode/:pincode. Any non-empty text, as in Joi (no 6-digit check).
export const addressPincodePayloadSchema = z.strictObject({
  pincode: requiredText('INVALID_PINCODE'),
});
export type AddressPincodePayload = z.infer<typeof addressPincodePayloadSchema>;
