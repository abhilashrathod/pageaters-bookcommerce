import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { env } from '@/env.ts';
import { isSafePath, secretMatches } from '@/lib/secrets.ts';

// CMS live preview: turn on draft mode, then open the previewed path (pages render the live postMessage data).
export async function GET(request: NextRequest) {
  if (!env.PREVIEW_SECRET) return new Response('Not found', { status: 404 });
  const params = request.nextUrl.searchParams;
  if (!secretMatches(env.PREVIEW_SECRET, params.get('secret'))) return new Response('Invalid secret', { status: 401 });
  const path = params.get('path');
  if (!isSafePath(path)) return new Response('Invalid path', { status: 400 });
  (await draftMode()).enable();
  redirect(path);
}
