import { z } from 'zod';
import { emailFieldSchema, fullNameFieldSchema, otpFieldSchema, passwordFieldSchema, phoneFieldSchema } from './common.ts';

// Auth payloads, ported from apps/api/src/validators/auth.validator.js. The API validates the merge of route
// params, query and body, and Joi rejects keys a schema doesn't list, hence `z.strictObject`.
//
// Joi did not check `newPassword === confirmPassword`; the controllers do, so these schemas don't either.

export const registerPayloadSchema = z.strictObject({
  email: emailFieldSchema,
  password: passwordFieldSchema,
  fullName: fullNameFieldSchema,
});
export type RegisterPayload = z.infer<typeof registerPayloadSchema>;

export const verifyEmailPayloadSchema = z.strictObject({
  email: emailFieldSchema,
  token: z.string({ error: 'INVALID_TOKEN' }).trim().min(1),
});
export type VerifyEmailPayload = z.infer<typeof verifyEmailPayloadSchema>;

export const sendVerifyContactPayloadSchema = z.strictObject({
  contactNo: phoneFieldSchema,
});
export type SendVerifyContactPayload = z.infer<typeof sendVerifyContactPayloadSchema>;

export const verifyContactPayloadSchema = z.strictObject({
  otp: otpFieldSchema,
});
export type VerifyContactPayload = z.infer<typeof verifyContactPayloadSchema>;

export const loginPayloadSchema = z.strictObject({
  email: emailFieldSchema,
  password: passwordFieldSchema,
});
export type LoginPayload = z.infer<typeof loginPayloadSchema>;

export const updatePasswordPayloadSchema = z.strictObject({
  password: passwordFieldSchema,
  newPassword: passwordFieldSchema,
  confirmPassword: passwordFieldSchema,
});
export type UpdatePasswordPayload = z.infer<typeof updatePasswordPayloadSchema>;

export const forgotPasswordPayloadSchema = z.strictObject({
  email: emailFieldSchema,
});
export type ForgotPasswordPayload = z.infer<typeof forgotPasswordPayloadSchema>;

export const resetPasswordPayloadSchema = z.strictObject({
  token: z.string({ error: 'INVALID_RESET_PASSWORD_TOKEN' }).trim().min(1),
  email: emailFieldSchema,
  newPassword: passwordFieldSchema,
  confirmPassword: passwordFieldSchema,
});
export type ResetPasswordPayload = z.infer<typeof resetPasswordPayloadSchema>;

export const updateProfilePayloadSchema = z.strictObject({
  fullName: fullNameFieldSchema,
  // Optional; '' (or only spaces) clears the number, anything else must be 10 digits after trimming.
  contactNo: z
    .string({ error: 'INVALID_PHONE' })
    .trim()
    .regex(/^(?:\d{10})?$/)
    .optional(),
});
export type UpdateProfilePayload = z.infer<typeof updateProfilePayloadSchema>;

export const resendVerificationEmailPayloadSchema = z.strictObject({
  email: emailFieldSchema,
});
export type ResendVerificationEmailPayload = z.infer<typeof resendVerificationEmailPayloadSchema>;

// Logout. Joi `string().empty('')`: '' counts as absent. No error code in Joi, so zod's default message.
export const revokeValidationPayloadSchema = z.strictObject({
  token: z.preprocess((value) => (value === '' ? undefined : value), z.string().optional()),
});
export type RevokeValidationPayload = z.infer<typeof revokeValidationPayloadSchema>;

// Account deletion: required, not trimmed, so '   ' passes (as in Joi).
export const deleteAccountPayloadSchema = z.strictObject({
  password: z.string({ error: 'INVALID_PASSWORD' }).min(1),
});
export type DeleteAccountPayload = z.infer<typeof deleteAccountPayloadSchema>;
