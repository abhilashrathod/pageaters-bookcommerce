import { z } from 'zod';
import { objectIdSchema } from '../primitives.ts';

// Request fields shared by several payloads, ported from apps/api/src/validators/common.validator.js (Joi 14).
//
// Error codes: Joi's `.error(new Error('CODE'))` replaces every error of a field with CODE, and the API sends that
// code to the client. Passing `{ error: 'CODE' }` to the zod type does the same: it becomes the message of the type
// check and of every check chained after it, so `issues[0].message` is the Joi code.
//
// Joi 14 strings trim before any rule runs when `.trim()` is set (length and max count the trimmed value), and a
// plain `Joi.string()` rejects '' unless `.allow('')`; hence `.trim()` first and `.min(1)` on required strings.

// Joi `objectId`, required since Phase 4 (Joi never required it, so a missing id reached the controllers). The string check carries the code
// so a non-string id also fails with INVALID_ID, then the shared primitive checks the format.
export const objectIdFieldSchema = z.string({ error: 'INVALID_ID' }).pipe(objectIdSchema);

// Joi `phone`: 10 digits after trimming.
export const phoneFieldSchema = z.string({ error: 'INVALID_PHONE' }).trim().length(10).regex(/^\d+$/);

// Joi `otp`: 6 digits after trimming.
export const otpFieldSchema = z.string({ error: 'INVALID_OTP' }).trim().length(6).regex(/^\d+$/);

// Joi 14 `email()` (isemail 3, default options): a dot-atom local part, then one or more hostname labels; no
// top-level domain is required ('a@b' passes) and non-ASCII characters are allowed. Joi also accepts quoted local
// parts and IP-literal domains ('"a"@b.com', 'a@[127.0.0.1]'); this pattern deliberately does not, since no
// shopper address needs them.
const atext = String.raw`[A-Za-z0-9!#$%&'*+/=?^_\x60{|}~\-\u0080-\uFFFF]`;
const label = String.raw`[A-Za-z0-9\u0080-\uFFFF](?:[A-Za-z0-9\u0080-\uFFFF-]{0,61}[A-Za-z0-9\u0080-\uFFFF])?`;
const EMAIL_PATTERN = new RegExp(`^${atext}+(?:\\.${atext}+)*@${label}(?:\\.${label})*$`);

// Joi `email`: at most 50 characters after trimming. Since Phase 4 the output is also lower-cased (Joi kept the case
// as sent), so 'Owner@Example.com' and 'owner@example.com' name one account; the API reads the parsed value.
export const emailFieldSchema = z.string({ error: 'INVALID_EMAIL' }).trim().max(50).regex(EMAIL_PATTERN).toLowerCase();

// Joi `password`: 1–50 characters after trimming. Unlike Joi's converted value, the output is NOT trimmed: the
// legacy controllers hash and compare the raw `req.body` password, so trimming here would lock out anyone whose
// password starts or ends with a space once the API uses the parsed payload (Phase 4).
// The value as sent is capped too (PASSWORD_RAW_MAX), so padding with spaces can't make the API hash a huge string.
export const PASSWORD_RAW_MAX = 128;
export const passwordFieldSchema = z
  .string({ error: 'INVALID_PASSWORD' })
  .max(PASSWORD_RAW_MAX)
  .refine((value) => {
    const length = value.trim().length;
    return length >= 1 && length <= 50;
  });

// Joi `fullName` (and its unused twin `name`): optional, may be '', at most 50 characters, not trimmed.
export const fullNameFieldSchema = z.string({ error: 'INVALID_NAME' }).max(50).optional();

// Tokens from e-mail links (verify, reset): the API's encrypted tokens are a few hundred characters, so anything
// longer than TOKEN_MAX is not one of ours.
export const TOKEN_MAX = 1024;
export const tokenFieldSchema = (code: string) => z.string({ error: code }).trim().min(1).max(TOKEN_MAX);
