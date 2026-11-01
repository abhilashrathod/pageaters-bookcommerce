import { isSafeHref } from '@pageaters/cms-types';
import type { DealListItem } from '@pageaters/shared';
import Image from 'next/image';
import Link from 'next/link';

import { imageSrc } from '@/lib/images.ts';

// The legacy DealsCardLarge: a tall square poster with a drop shadow and the white title at its bottom left. The
// storefront has no deal page, so the card follows the deal's own CTA link when it is a safe site path (`/…`), and
// is a plain card otherwise.
export function DealCard({ deal }: { deal: Pick<DealListItem, 'title' | 'poster' | 'ctaLink'> }) {
  const src = imageSrc(deal.poster);
  const body = (
    <>
      <span className="drop-shadow-banner relative mb-2.5 block h-[390px] overflow-hidden rounded-[1rem] bg-primary sm:h-[350px] md:h-[460px] lg:h-[520px]">
        {src ? <Image src={src} alt="" fill sizes="(min-width: 62rem) 32vw, 90vw" className="object-cover" /> : null}
      </span>
      <span className="absolute bottom-7 left-7 max-w-1/2 text-[1.75rem] leading-[2.286rem] font-semibold text-white">{deal.title}</span>
    </>
  );
  const href = deal.ctaLink;
  return href?.startsWith('/') && isSafeHref(href) ? (
    <Link href={href} className="relative mb-3.5 block">
      {body}
    </Link>
  ) : (
    <div className="relative mb-3.5">{body}</div>
  );
}
