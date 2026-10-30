const { z } = require('zod');

// Environment config for the API, validated once at boot (AGENTS.md §4.6). Every variable read here is documented
// in apps/api/.env.example. Empty values count as unset. Validation errors name the variable and the rule, never
// the value: every message below is fixed text, and the formatter drops any message that would contain the value.

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:4200'];

const required = (schema) => schema.optional().refine((value) => value !== undefined, 'is required');

const httpUrl = (message) => z.url({ protocol: /^https?$/, error: message });

const isOrigin = (item) => {
  try {
    const url = new URL(item);
    // URL accepts `*` in a host; refuse it so the list can never act as a wildcard.
    return ['http:', 'https:'].includes(url.protocol) && url.origin === item && !item.includes('*');
  } catch {
    return false;
  }
};

const schema = z.object({
  APP_ENV: z
    .enum(['development', 'staging', 'production', 'test'], {
      error: 'must be one of development, staging, production, test',
    })
    .default('development'),
  PORT: z
    .string()
    .regex(/^\d{1,5}$/, 'must be a whole number between 1 and 65535')
    .transform(Number)
    .refine((port) => port >= 1 && port <= 65535, 'must be a whole number between 1 and 65535')
    .default(5005),
  STOREFRONT_URL: httpUrl('must be an http(s) URL').default('http://localhost:3000'),
  ALLOWED_ORIGINS: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .refine((items) => items.length > 0, 'must list at least one origin')
    .refine(
      (items) => items.every(isOrigin),
      'must be a comma-separated list of http(s) origins without a path or trailing slash, e.g. https://demo.pageaters.com',
    )
    .default(DEFAULT_ALLOWED_ORIGINS),

  // Adapters (AGENTS.md §4.4): `mock` unless a real one is chosen explicitly, so nothing is ever sent to an address or
  // number a visitor typed by default (§6). A real adapter's keys are required only when it is selected
  // (ADAPTER_KEYS below).
  EMAIL_ADAPTER: z.enum(['sendgrid', 'mock'], { error: 'must be one of sendgrid, mock' }).default('mock'),
  SMS_ADAPTER: z.enum(['twilio', 'mock'], { error: 'must be one of twilio, mock' }).default('mock'),

  // Required: the database, auth, and the Razorpay SDK client, which is constructed when its module loads and
  // throws without credentials (until the payments adapter).
  // A raw `@` in the password makes the driver read part of the password as a host name (and log it), so the
  // credentials may hold only the one `@` that ends them.
  MONGODB_URI: required(
    z
      .string()
      .regex(/^mongodb(\+srv)?:\/\/\S+$/, 'must start with mongodb:// or mongodb+srv://')
      .refine(
        (value) => (value.replace(/^mongodb(\+srv)?:\/\//, '').split('?')[0].match(/@/g) ?? []).length <= 1,
        'password must be URL-encoded (write @ as %40)',
      ),
  ),
  // AES-256 uses Buffer.from(key) (utf8) as the key, so the rule counts bytes: use 32 ASCII characters.
  ENCRYPTION_KEY: required(
    z.string().refine((value) => Buffer.byteLength(value, 'utf8') === 32, 'must be exactly 32 bytes (use 32 ASCII characters)'),
  ),
  // Critical guard (AGENTS.md §6): live Razorpay keys are refused outright; only test-mode keys may be used.
  RAZORPAY_KEY_ID: required(
    z
      .string()
      .refine((value) => !value.startsWith('rzp_live_'), 'is a live key (rzp_live_…); only test-mode keys are allowed')
      .refine((value) => value.startsWith('rzp_live_') || value.startsWith('rzp_test_'), 'must start with rzp_test_'),
  ),

  // Optional: only the feature that uses the variable fails without it. The vendor keys of an adapter become
  // required when that adapter is selected.
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  DELHIVERY_BASE_URL: httpUrl('must be an http(s) URL').default('https://staging-express.delhivery.com'),
  DELHIVERY_API_TOKEN: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC', 'must start with AC').optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'must be an E.164 phone number (+ and country code, digits only)')
    .optional(),
  SENDGRID_API_KEY: z.string().optional(),
  MAIL_FROM: z.email({ error: 'must be an email address' }).default('no-reply@demo.pageaters.com'),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  IMAGE_CDN_URL: httpUrl('must be an http(s) URL').optional(),
});

const VARIABLES = Object.keys(schema.shape);

// The variables each real adapter needs, keyed by its selector. MAIL_FROM has a default for the mock, but a real
// send must name its own (verified) sender.
const ADAPTER_KEYS = {
  EMAIL_ADAPTER: { sendgrid: ['SENDGRID_API_KEY', 'MAIL_FROM'] },
  SMS_ADAPTER: { twilio: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE'] },
};

// `<KEY>: is required when <SELECTOR>=<adapter>` for each key the selected real adapters miss. Reads the raw input:
// the selector values are fixed names (an invalid one is reported by the schema), so the message never echoes input.
const missingAdapterKeys = (input) => {
  const problems = [];
  for (const [selector, adapters] of Object.entries(ADAPTER_KEYS)) {
    const keys = Object.hasOwn(adapters, input[selector] ?? '') ? adapters[input[selector]] : [];
    for (const name of keys) {
      if (input[name] === undefined) problems.push({ name, reason: `is required when ${selector}=${input[selector]}` });
    }
  }
  return problems;
};

class EnvError extends Error {
  constructor(problems) {
    const lines = problems.map(({ name, reason }) => `  - ${name}: ${reason}`);
    super(`Invalid API environment (see apps/api/.env.example):\n${lines.join('\n')}`);
    this.name = 'EnvError';
    this.variables = problems.map(({ name }) => name);
  }
}

// Fallback for zod's built-in messages (e.g. a non-string value): fixed text that cannot carry the input.
const safeError = (issue) => (issue.input === undefined ? 'is required' : 'is invalid');

/**
 * Validates an environment source (normally process.env) and returns the frozen config.
 * Only the variables in the schema are read; blank values count as unset.
 * @param {Record<string, string | undefined>} source
 * @throws {EnvError} listing each bad variable name and the rule it breaks (never its value)
 */
const parseEnv = (source) => {
  // Every key is present (undefined when unset or blank): zod skips an absent optional key, refinements included.
  const input = {};
  for (const name of VARIABLES) {
    const value = source[name];
    input[name] = typeof value === 'string' && value.trim() === '' ? undefined : value;
  }

  const result = schema.safeParse(input, { error: safeError });
  const problems = [];
  for (const issue of result.success ? [] : result.error.issues) {
    const name = String(issue.path[0]);
    if (problems.some((problem) => problem.name === name)) continue;
    const value = input[name];
    const echoes = typeof value === 'string' && value.length > 0 && issue.message.includes(value);
    problems.push({ name, reason: echoes ? 'is invalid' : issue.message });
  }
  for (const problem of missingAdapterKeys(input)) {
    if (!problems.some(({ name }) => name === problem.name)) problems.push(problem);
  }
  if (problems.length > 0) throw new EnvError(problems);

  const env = result.data;
  Object.freeze(env.ALLOWED_ORIGINS);
  return Object.freeze(env);
};

let cached;

module.exports = {
  parseEnv,
  EnvError,
  VARIABLES,
  /** The validated, frozen config for process.env (parsed on first access). */
  get env() {
    cached ??= parseEnv(process.env);
    return cached;
  },
};
