import { createHash, timingSafeEqual } from 'node:crypto';

// The CMS → storefront contract checks (apps/cms/src/storefront.ts). Pure, so node tests can load it.

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Constant-time secret check; an unset secret (feature off) or a missing value never matches. */
export const secretMatches = (expected: string | undefined, given: string | null | undefined): boolean =>
  !!expected && !!given && timingSafeEqual(digest(expected), digest(given));

/** A same-site path to redirect to: one leading `/` (not `//` or `/\`, which browsers treat as another host). */
export const isSafePath = (path: string | null | undefined): path is string =>
  typeof path === 'string' && /^\/(?![/\\])/.test(path) && !/[\\\s]/.test(path);

const TAG = /^cms:[\w:.\-/]{1,200}$/;

/** The tags in a revalidation body `{ tags: [...] }`: 1–50 `cms:` tags, else null. */
export const parseTags = (body: unknown): string[] | null => {
  const tags = (body as { tags?: unknown } | null)?.tags;
  if (!Array.isArray(tags) || tags.length < 1 || tags.length > 50) return null;
  return tags.every((tag) => typeof tag === 'string' && TAG.test(tag)) ? (tags as string[]) : null;
};
