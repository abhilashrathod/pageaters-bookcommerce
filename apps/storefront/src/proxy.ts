import { NextResponse, type NextRequest } from 'next/server';

import { parsePage } from '@/lib/paths.ts';

// Listing pages keep `?page=N` in their public URL, but a page that reads the query string can't be cached. Rewrite it
// to the path form (`/collections/x/2`), which is ISR-cached per page; page 1 needs no rewrite.
export function proxy(request: NextRequest) {
  const page = parsePage(request.nextUrl.searchParams.get('page') ?? undefined);
  if (page === 1) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `${url.pathname}/${page}`;
  url.searchParams.delete('page');
  return NextResponse.rewrite(url);
}

export const config = { matcher: ['/collections/:id', '/categories/:id'] };
