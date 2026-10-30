import { z } from 'zod';
import { addressTypeSchema } from '../enums.ts';
import { emailFieldSchema, objectIdFieldSchema, phoneFieldSchema } from './common.ts';
import { joiBoolean } from './convert.ts';

// Address payloads, ported from apps/api/src/validators/address.validator.js. Field names are the Mongoose
// Address model's. `country` is not sent (the model defaults it to 'IN').
//
// Phase 4 tightened the Joi rules: text fields have maximum lengths (ADDRESS_LIMITS, counted after trimming), the
// pin code is six digits, and the update and the `:id` routes require a well-formed id.

export const ADDRESS_LIMITS = {
  fullName: 100,
  city: 100,
  state: 100,
  addressLine: 200,
  landmark: 200,
} as const;

const requiredText = (code: string, max: number) => z.string({ error: code }).trim().min(1).max(max);
const optionalText = (code: string, max: number) => z.string({ error: code }).trim().max(max).optional();

// An Indian PIN code: six digits (after trimming).
export const pinCodeFieldSchema = z
  .string({ error: 'INVALID_PINCODE' })
  .trim()
  .regex(/^\d{6}$/);

const addressFields = {
  fullName: requiredText('INVALID_NAME', ADDRESS_LIMITS.fullName),
  contactNo: phoneFieldSchema,
  email: emailFieldSchema,
  city: requiredText('INVALID_CITY', ADDRESS_LIMITS.city),
  state: requiredText('INVALID_STATE', ADDRESS_LIMITS.state),
  pinCode: pinCodeFieldSchema,
  isDefault: z.preprocess(joiBoolean, z.boolean({ error: 'INVALID_DEFAULT_SELECTION' })),
  addressLine1: requiredText('INVALID_ADD_1', ADDRESS_LIMITS.addressLine),
  addressLine2: optionalText('INVALID_ADD_2', ADDRESS_LIMITS.addressLine),
  landmark: optionalText('INVALID_LANDMARK', ADDRESS_LIMITS.landmark),
  // No error code in Joi, so zod's default message (Joi sent its own English text).
  type: addressTypeSchema.optional(),
};

// POST /address.
export const addressCreatePayloadSchema = z.strictObject(addressFields);
export type AddressCreatePayload = z.infer<typeof addressCreatePayloadSchema>;

// PUT /address/:id (no validator in the legacy API). The same rules as create, every field optional: the API keeps a
// field left out. Unknown keys are ignored rather than refused, since a client may send back the whole address
// document it read (`_id`, `country`, timestamps…); the API reads only these fields.
export const addressUpdatePayloadSchema = z.object({
  id: objectIdFieldSchema,
  ...z.object(addressFields).partial().shape,
});
export type AddressUpdatePayload = z.infer<typeof addressUpdatePayloadSchema>;

// GET, DELETE and PATCH /address/:id.
export const addressGetPayloadSchema = z.strictObject({
  id: objectIdFieldSchema,
});
export type AddressGetPayload = z.infer<typeof addressGetPayloadSchema>;

// GET /address/check-pincode/:pincode.
export const addressPincodePayloadSchema = z.strictObject({
  pincode: pinCodeFieldSchema,
});
export type AddressPincodePayload = z.infer<typeof addressPincodePayloadSchema>;
