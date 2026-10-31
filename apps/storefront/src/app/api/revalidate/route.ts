import { revalidateTag } from 'next/cache';

import { env } from '@/env.ts';
import { parseTags, secretMatches } from '@/lib/secrets.ts';

// Called by the CMS after a publish with the tags of what changed; those cached reads expire at once.
export async function POST(request: Request) {
  if (!env.REVALIDATE_SECRET) return new Response('Not found', { status: 404 });
  if (!secretMatches(env.REVALIDATE_SECRET, request.headers.get('x-revalidate-secret'))) {
    return new Response('Invalid secret', { status: 401 });
  }
  const tags = parseTags(await request.json().catch(() => null));
  if (!tags) return new Response('Expected { "tags": ["cms:…"] }', { status: 400 });
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
