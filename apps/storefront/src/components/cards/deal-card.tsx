import { isSafeHref } from '@pageaters/cms-types';
import type { DealListItem } from '@pageaters/shared';
import Link from 'next/link';

import { CoverImage } from './cover-image.tsx';

// The legacy DealsCardLarge: square poster and title. The storefront has no deal page, so the card follows the
// deal's own CTA link when it is a safe site path (`/…`), and is a plain card otherwise.
export function DealCard({ deal }: { deal: Pick<DealListItem, 'title' | 'poster' | 'ctaLink'> }) {
  const body = (
    <>
      <CoverImage src={deal.poster} alt={deal.title} width={520} height={520} sizes="(min-width: 62rem) 32vw, 90vw" className="mb-3" />
      <span className="block font-semibold">{deal.title}</span>
    </>
  );
  const href = deal.ctaLink;
  return href?.startsWith('/') && isSafeHref(href) ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}
