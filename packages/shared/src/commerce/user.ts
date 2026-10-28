import { z } from 'zod';

import { userRoleSchema, userStatusSchema } from '../enums.ts';
import { isoDateSchema, moneySchema, objectIdSchema } from '../primitives.ts';

// A user as the API may send it to a client (apps/api/src/models/user.model.js). The profile endpoints (login, /me,
// profile update) send `User.getProfile()`, which selects away the credentials and the admin-only fields; the admin's
// customer views also send role, status and timestamps, so those are optional here.
//
// Never part of this shape: password, salt, contactOtp, verifyEmailToken, forgotPasswordToken, the *SentOn
// rate-limit stamps, razorPayCustId, isDeleted. `z.object` strips unknown keys, so parsing a full Mongoose document
// through this schema drops them (user.test.ts proves it). The `id` virtual (toJSON getters) duplicates `_id` and is
// dropped too.
export const userSchema = z.object({
  _id: objectIdSchema,
  email: z.email(),
  fullName: z.string(),
  // 10 digits once set (the API's `phone` validator); '' until the user adds one.
  contactNo: z.union([z.literal(''), z.string().regex(/^\d{10}$/)]),
  // Free-form strings the model defaults to '' (no endpoint sets them today).
  dateOfBirth: z.string(),
  gender: z.string(),
  emailVerified: z.boolean(),
  contactVerified: z.boolean(),
  // Balance in rupees; credit transactions are in store-credit.ts.
  storeCredit: moneySchema,
  // ISO strings written with `new Date().toISOString()`; '' until the first login / password set.
  lastLoginAt: z.union([isoDateSchema, z.literal('')]),
  lastPasswordSetAt: z.union([isoDateSchema, z.literal('')]),
  // Admin views only (getProfile selects these away).
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  createdAt: isoDateSchema.optional(),
  updatedAt: isoDateSchema.optional(),
});
export type User = z.infer<typeof userSchema>;
