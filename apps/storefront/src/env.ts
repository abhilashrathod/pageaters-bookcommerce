import { z } from 'zod';

// The storefront's server environment, validated once at boot (AGENTS.md §4.6); every variable is documented in
// .env.example. Messages name the variable and the rule, never the value. Empty values count as unset.
const origin = (example: string) =>
  z
    .url({ protocol: /^https?$/, error: `must be an http(s) URL, e.g. ${example}` })
    .refine((url) => !url.endsWith('/'), 'must not end with /');

const secret = z.string().min(32, 'must be at least 32 characters');

const schema = z.object({
  // The API root, version prefix included; read on the server only (catalog data for the blocks).
  API_URL: origin('http://localhost:5005/api/v1').default('http://localhost:5005/api/v1'),
  // The same API root as the browser reaches it (shopper calls: cart, checkout, orders). Inlined into the client bundle
  // at build time; src/lib/shopper-api.ts reads it directly, this entry only validates it on the server.
  NEXT_PUBLIC_API_URL: origin('http://localhost:5005/api/v1').default('http://localhost:5005/api/v1'),
  CMS_URL: origin('http://localhost:3001').default('http://localhost:3001'),
  SITE_URL: origin('http://localhost:3000').default('http://localhost:3000'),
  // Shared with the CMS; unset turns the feature off (/api/draft and /api/revalidate answer 404).
  PREVIEW_SECRET: secret.optional(),
  REVALIDATE_SECRET: secret.optional(),
});

export type Env = z.infer<typeof schema>;

export const parseEnv = (source: Record<string, string | undefined>): Env => {
  const input = Object.fromEntries(Object.keys(schema.shape).map((name) => [name, source[name]?.trim() ? source[name] : undefined]));
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const problems = result.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`);
  throw new Error(`Invalid storefront environment:\n  ${problems.join('\n  ')}`);
};

export const env = parseEnv(process.env);
