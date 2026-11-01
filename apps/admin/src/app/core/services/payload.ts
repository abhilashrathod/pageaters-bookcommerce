import type { ApiClient } from '@pageaters/api-client';

// Form values go through the matching `admin…PayloadSchema` from @pageaters/shared before a catalog write, so a
// loaded record can't send stray keys (e.g. `wholeSalePriceHistory`) back: zod objects drop unknown keys.

interface PayloadSchema {
  safeParse(value: unknown): {
    success: boolean;
    data?: unknown;
    error?: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> };
  };
}

type AdminResources = ApiClient['admin'];

/**
 * The body an admin write takes (without its path `id`). The admin tsconfig isn't `strict`, which loosens zod's
 * inferred output types, so the bound endpoint's input type is the one to send.
 */
export type AdminBody<
  Resource extends keyof AdminResources,
  Action extends 'create' | 'update',
> = AdminResources[Resource] extends Record<Action, (input: infer Input, ...rest: never[]) => unknown>
  ? Omit<Input, 'id'>
  : never;

/** The parsed payload, or an Error carrying the first zod issue ("price: Invalid input…"). */
export function parsePayload<Out>(schema: PayloadSchema, value: unknown): Out {
  const result = schema.safeParse(value);
  if (result.success) return result.data as Out;
  const issue = result.error.issues[0];
  throw new Error(issue.path.length ? `${issue.path.map(String).join('.')}: ${issue.message}` : issue.message);
}
