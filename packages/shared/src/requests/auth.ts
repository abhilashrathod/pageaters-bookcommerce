import { z } from 'zod';
import {
  emailFieldSchema,
  fullNameFieldSchema,
  otpFieldSchema,
  passwordFieldSchema,
  phoneFieldSchema,
  TOKEN_MAX,
  tokenFieldSchema,
} from './common.ts';

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
  token: tokenFieldSchema('INVALID_TOKEN'),
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
  token: tokenFieldSchema('INVALID_RESET_PASSWORD_TOKEN'),
  email: emailFieldSchema,
  newPassword: passwordFieldSchema,
  confirmPassword: passwordFieldSchema,
});
export type ResetPasswordPayload = z.infer<typeof resetPasswordPayloadSchema>;

// PUT /auth/me: the name only. The contact number is not accepted here (unknown key → 400 INVALID_REQUEST): it
// changes only through the OTP flow (POST /auth/contact/send → /auth/contact/verify), so an unverified number can't
// be stored on the account (the legacy schema accepted `contactNo` and the API ignored it).
export const updateProfilePayloadSchema = z.strictObject({
  fullName: fullNameFieldSchema,
});
export type UpdateProfilePayload = z.infer<typeof updateProfilePayloadSchema>;

export const resendVerificationEmailPayloadSchema = z.strictObject({
  email: emailFieldSchema,
});
export type ResendVerificationEmailPayload = z.infer<typeof resendVerificationEmailPayloadSchema>;

// Logout. Joi `string().empty('')`: '' counts as absent. The API revokes the session cookie's token and ignores
// this one; it is still bounded.
export const revokeValidationPayloadSchema = z.strictObject({
  token: z.preprocess((value) => (value === '' ? undefined : value), z.string({ error: 'INVALID_TOKEN' }).max(TOKEN_MAX).optional()),
});
export type RevokeValidationPayload = z.infer<typeof revokeValidationPayloadSchema>;
