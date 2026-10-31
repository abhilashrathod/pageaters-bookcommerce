const s = require('@pageaters/shared');

// Accounts and the session: /auth, plus the newsletter sign-up.

const v1 = (path) => `/api/v1${path}`;
const auth = (method, path, summary, rest) => ({ method, path: v1(path), tag: 'Auth', summary, ...rest });
const empty = s.shopperEmptyResponseSchema;
const profile = s.shopperProfileResponseSchema;

module.exports = [
  auth('POST', '/auth/register', 'Register', {
    auth: 'public',
    description: 'Creates a shopper account and sends the verification e-mail. Off in DEMO_MODE.',
    limiter: 'messageSend',
    request: s.registerPayloadSchema,
    response: empty,
  }),
  auth('POST', '/auth/login', 'Log in', {
    auth: 'public',
    description: 'Sets the session cookie and answers the profile. Only failed attempts count towards the limit.',
    limiter: 'login',
    request: s.loginPayloadSchema,
    response: profile,
  }),
  auth('POST', '/auth/demo-login', 'Log in as the demo shopper', {
    auth: 'public',
    description: 'DEMO_MODE only (404 otherwise): signs into the seeded demo shopper, sets the session cookie and answers the profile.',
    limiter: 'demoLogin',
    response: profile,
  }),
  auth('POST', '/auth/demo-login/admin', 'Log in as the demo admin', {
    auth: 'public',
    description:
      'DEMO_MODE only (404 otherwise): signs into the seeded demo admin, which can run the order lifecycle but not change the catalog, upload files or issue store credit.',
    limiter: 'demoLogin',
    response: profile,
  }),
  auth('POST', '/auth/logout', 'Log out', {
    auth: 'session',
    description: 'Revokes the session and clears its cookie.',
    request: s.revokeValidationPayloadSchema,
    response: empty,
  }),
  auth('GET', '/auth/me', 'Get my profile', { auth: 'user', response: profile }),
  auth('PUT', '/auth/me', 'Update my profile', { auth: 'session', request: s.updateProfilePayloadSchema, response: profile }),
  auth('PUT', '/auth/password', 'Change my password', {
    auth: 'session',
    description: 'Ends every session of the account, this one included.',
    request: s.updatePasswordPayloadSchema,
    response: empty,
  }),

  auth('POST', '/auth/verify-email', 'Verify e-mail', {
    auth: 'public',
    limiter: 'codeCheck',
    request: s.verifyEmailPayloadSchema,
    response: empty,
  }),
  auth('POST', '/auth/verify-email/resend', 'Resend the e-mail code', {
    auth: 'public',
    limiter: 'messageSend',
    request: s.resendVerificationEmailPayloadSchema,
    response: empty,
  }),
  auth('POST', '/auth/forgot-password', 'Request a password reset', {
    auth: 'public',
    limiter: 'messageSend',
    request: s.forgotPasswordPayloadSchema,
    response: empty,
  }),
  auth('POST', '/auth/forgot-password/resend', 'Resend the reset code', {
    auth: 'public',
    limiter: 'messageSend',
    request: s.resendVerificationEmailPayloadSchema,
    response: empty,
  }),
  auth('POST', '/auth/reset-password', 'Reset the password', {
    auth: 'public',
    limiter: 'codeCheck',
    request: s.resetPasswordPayloadSchema,
    response: empty,
  }),

  auth('POST', '/auth/contact/send', 'Send a phone code', {
    auth: 'user',
    description: 'Off in DEMO_MODE (as are resend and verify).',
    limiter: 'messageSend',
    request: s.sendVerifyContactPayloadSchema,
    response: empty,
  }),
  auth('POST', '/auth/contact/resend', 'Resend the phone code', { auth: 'user', limiter: 'messageSend', response: empty }),
  auth('POST', '/auth/contact/verify', 'Verify the phone', {
    auth: 'user',
    limiter: 'codeCheck',
    request: s.verifyContactPayloadSchema,
    response: empty,
  }),

  {
    method: 'POST',
    path: v1('/subscribers'),
    tag: 'Newsletter',
    summary: 'Subscribe to the newsletter',
    auth: 'public',
    request: s.subscriberRootPayloadSchema,
    response: empty,
  },
];
