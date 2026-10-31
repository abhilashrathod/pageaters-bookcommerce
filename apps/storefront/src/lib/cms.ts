import { env } from '@/env.ts';

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
