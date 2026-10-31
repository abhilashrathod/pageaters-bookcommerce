import { isSafeHref } from '@pageaters/cms-types';

import { pageHref } from '../lib/paths.ts';

// A Lexical link node's `fields`: a custom URL, or an internal link to a CMS page (populated to `{ slug }`).
export interface LinkFields {
  linkType?: 'custom' | 'internal';
  url?: string | null;
  newTab?: boolean | null;
  doc?: { relationTo?: string; value?: string | { slug?: string | null } | null } | null;
}

// The link's href, or null to render its text without a link: unsafe URLs (defence in depth: the CMS refuses them
// too), unpopulated or slug-less internal links.
export function linkHref(fields: LinkFields | undefined): string | null {
  if (fields?.linkType === 'internal') {
    const value = fields.doc?.value;
    const slug = typeof value === 'object' ? value?.slug : null;
    return fields.doc?.relationTo === 'pages' && slug && /^[a-z0-9-]+$/.test(slug) ? pageHref(slug) : null;
  }
  return isSafeHref(fields?.url) ? (fields?.url ?? null) : null;
}
