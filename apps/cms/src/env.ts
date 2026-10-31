import { z } from 'zod';

// The CMS's environment, validated once at boot (AGENTS.md §4.6); every variable is documented in .env.example.
// Messages name the variable and the rule, never the value. Empty values count as unset.

// The database name in a MongoDB URI (`/<name>` after the hosts, before `?`), or '' when there is none.
const databaseName = (uri: string) =>
  uri
    .replace(/^mongodb(\+srv)?:\/\//, '')
    .split('?')[0]
    ?.split('/')[1] ?? '';

const schema = z.object({
  // Payload keeps content in its own database (AGENTS.md §4.3): never the API's.
  MONGODB_URI: z
    .string({ error: 'is required' })
    .regex(/^mongodb(\+srv)?:\/\/\S+$/, 'must start with mongodb:// or mongodb+srv://')
    .refine((uri) => databaseName(uri) !== '', 'must name its database, e.g. …/pageaters_cms')
    .refine((uri) => databaseName(uri) !== 'pageaters_api', 'must not be the API database (pageaters_api)'),
  // The API root the commerce pickers read (server-side only), version prefix included.
  API_URL: z
    .url({ protocol: /^https?$/, error: 'must be an http(s) URL, e.g. http://localhost:5005/api/v1' })
    .default('http://localhost:5005/api/v1'),
  // The public demo: the login form is prefilled with the read-only demo login (demo.ts).
  DEMO_MODE: z
    .enum(['true', 'false'], { error: 'must be true or false' })
    .transform((value) => value === 'true')
    .default(false),
  PAYLOAD_SECRET: z.string({ error: 'is required' }).min(32, 'must be at least 32 characters'),
  // Media go to Vercel Blob when set; without it they are written to local disk (development only).
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  // Set by Vercel itself (`1`): there the disk is read-only, so the Blob token is required (checked below).
  VERCEL: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export const parseEnv = (source: Record<string, string | undefined>): Env => {
  const input = Object.fromEntries(Object.keys(schema.shape).map((name) => [name, source[name]?.trim() ? source[name] : undefined]));
  const result = schema.safeParse(input);
  const problems = result.success ? [] : result.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`);
  if (input.VERCEL !== undefined && input.BLOB_READ_WRITE_TOKEN === undefined) {
    problems.push('BLOB_READ_WRITE_TOKEN: is required on Vercel (VERCEL is set)');
  }
  if (result.success && problems.length === 0) return result.data;
  const lines = problems.map((problem) => `  - ${problem}`);
  throw new Error(`Invalid CMS environment (see apps/cms/.env.example):\n${lines.join('\n')}`);
};
