// How the CMS talks to the storefront: live-preview URLs (draft mode) and cache revalidation after a publish
// (AGENTS.md "apps/storefront": fetches carry cache tags; a CMS publish calls revalidateTag). The storefront side is
// built in Phase 7: `GET /api/draft?secret=&path=` and `POST /api/revalidate` with `x-revalidate-secret`.

export type Doc = { slug?: unknown; type?: unknown; itemId?: unknown; _status?: unknown } | null | undefined;

const text = (value: unknown) => (typeof value === 'string' ? value : '');

/** The storefront path that shows a document: a page by slug (`home` is `/`), a template or override on its preview route. */
export const previewPath = (collection: string, doc: Doc): string => {
  if (collection === 'pages') return text(doc?.slug) === 'home' ? '/' : `/${text(doc?.slug)}`;
  if (collection === 'templates') return `/preview/templates/${text(doc?.type)}`;
  return `/preview/overrides/${text(doc?.type)}/${text(doc?.itemId)}`;
};

export const previewUrl = (storefrontUrl: string, secret: string, path: string): string =>
  `${storefrontUrl.replace(/\/+$/, '')}/api/draft?${new URLSearchParams({ secret, path }).toString()}`;

/** The cache tags the storefront's fetches of a document carry. */
export const revalidationTags = (collection: string, doc: Doc): string[] => {
  if (collection === 'pages') return ['cms:pages', `cms:page:${text(doc?.slug)}`];
  if (collection === 'templates') return [`cms:template:${text(doc?.type)}`];
  if (collection === 'overrides') return [`cms:override:${text(doc?.type)}:${text(doc?.itemId)}`];
  return [`cms:global:${collection}`];
};

type Logger = { error: (object: object, message: string) => void };

/**
 * Asks the storefront to drop its cached copies (at most 3 s). Never throws: a failed call is only logged, so a save
 * never fails because the storefront is down; its caches then refresh on their own schedule.
 */
export const notifyStorefront = async (target: { url: string; secret: string }, tags: string[], logger: Logger): Promise<void> => {
  try {
    const res = await fetch(`${target.url.replace(/\/+$/, '')}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': target.secret },
      body: JSON.stringify({ tags: [...new Set(tags)] }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) logger.error({ status: res.status, tags }, 'Storefront revalidation refused');
  } catch (error) {
    logger.error({ err: error, tags }, 'Storefront revalidation failed');
  }
};
