import type { Media } from '@pageaters/cms-types';

import { env } from '@/env.ts';
import { imageSrc } from '@/lib/images.ts';

// Reads Payload's REST API, cached under the given tags; the CMS calls /api/revalidate with them after a publish.
// A CMS outage returns null so callers fall back to defaults instead of breaking the page.
export async function cmsFetch<T>(path: `/${string}`, tags: string[]): Promise<T | null> {
  try {
    const res = await fetch(`${env.CMS_URL}/api${path}`, { cache: 'force-cache', next: { tags } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`[cms] GET ${path} failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// A CMS upload's URL: Payload serves files at /api/media/file/… on the CMS (allowed in next.config.ts); an absolute
// URL must be on an allowed image host. Unpopulated (an ID) or missing media → null.
export function mediaUrl(media: string | Media | null | undefined): string | null {
  if (!media || typeof media === 'string' || !media.url) return null;
  return media.url.startsWith('/api/media/file/') ? `${env.CMS_URL}${media.url}` : imageSrc(media.url);
}
