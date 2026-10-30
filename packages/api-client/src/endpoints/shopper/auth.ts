import {
  forgotPasswordPayloadSchema,
  loginPayloadSchema,
  registerPayloadSchema,
  resendVerificationEmailPayloadSchema,
  resetPasswordPayloadSchema,
  revokeValidationPayloadSchema,
  sendVerifyContactPayloadSchema,
  shopperEmptyResponseSchema,
  shopperProfileResponseSchema,
  updatePasswordPayloadSchema,
  updateProfilePayloadSchema,
  verifyContactPayloadSchema,
  verifyEmailPayloadSchema,
} from '@pageaters/shared';

import { defineEndpoint } from '../../core/endpoint.ts';

// Auth and the shopper's own account (`apps/api/src/routes/auth.routes.js`). Sessions are httpOnly cookies the API
// sets and clears (access token and cart id), so register, login and logout must run where the browser keeps the
// API's `Set-Cookie`: the browser, or a route handler that relays it, never a Server Component.
const empty = shopperEmptyResponseSchema.shape.data;
const profile = shopperProfileResponseSchema.shape.data;

export const auth = {
  // POST /auth/register — signs the new shopper in (sets the cookies) and sends the verification email.
  register: defineEndpoint({ method: 'POST', path: '/auth/register', body: registerPayloadSchema, response: empty }),
  // POST /auth/login — also succeeds, with status `EMAIL_VERIFICATION_PENDING`, before the email is verified.
  login: defineEndpoint({ method: 'POST', path: '/auth/login', body: loginPayloadSchema, response: profile }),
  // POST /auth/verify-email — `email` and `token` come from the verification link.
  verifyEmail: defineEndpoint({ method: 'POST', path: '/auth/verify-email', body: verifyEmailPayloadSchema, response: empty }),
  // POST /auth/verify-email/resend
  resendVerificationEmail: defineEndpoint({
    method: 'POST',
    path: '/auth/verify-email/resend',
    body: resendVerificationEmailPayloadSchema,
    response: empty,
  }),
  // POST /auth/forgot-password — emails a reset link.
  forgotPassword: defineEndpoint({ method: 'POST', path: '/auth/forgot-password', body: forgotPasswordPayloadSchema, response: empty }),
  // POST /auth/forgot-password/resend — the same payload as the verification resend (the API reuses its validator).
  resendForgotPassword: defineEndpoint({
    method: 'POST',
    path: '/auth/forgot-password/resend',
    body: resendVerificationEmailPayloadSchema,
    response: empty,
  }),
  // POST /auth/reset-password — `token` and `email` come from the reset link.
  resetPassword: defineEndpoint({ method: 'POST', path: '/auth/reset-password', body: resetPasswordPayloadSchema, response: empty }),
  // POST /auth/contact/send — texts a one-time code to the number.
  sendContactOtp: defineEndpoint({ method: 'POST', path: '/auth/contact/send', body: sendVerifyContactPayloadSchema, response: empty }),
  // POST /auth/contact/resend — no payload.
  resendContactOtp: defineEndpoint({ method: 'POST', path: '/auth/contact/resend', response: empty }),
  // POST /auth/contact/verify
  verifyContact: defineEndpoint({ method: 'POST', path: '/auth/contact/verify', body: verifyContactPayloadSchema, response: empty }),
  // POST /auth/logout — revokes the cookie's token and clears both cookies; `token` is accepted but unused.
  logout: defineEndpoint({ method: 'POST', path: '/auth/logout', body: revokeValidationPayloadSchema, response: empty }),
  // GET /auth/me
  me: defineEndpoint({ method: 'GET', path: '/auth/me', response: profile }),
  // PUT /auth/me — the name only; the contact number changes through the OTP flow (`sendContactOtp`…), never here.
  updateProfile: defineEndpoint({ method: 'PUT', path: '/auth/me', body: updateProfilePayloadSchema, response: profile }),
  // PUT /auth/password
  updatePassword: defineEndpoint({ method: 'PUT', path: '/auth/password', body: updatePasswordPayloadSchema, response: empty }),
};
