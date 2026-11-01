import type { BundleListItem } from '@pageaters/shared';
import Link from 'next/link';

import { CoverImage } from './cover-image.tsx';
import { Price } from './price.tsx';

// The legacy BundlesCardMedium: square poster with the soft shadow, title, price and the bundle's extra discount.
export function BundleCard({ bundle }: { bundle: Pick<BundleListItem, 'bundleId' | 'title' | 'poster' | 'price' | 'currentDiscount'> }) {
  return (
    <Link href={`/bundles/${bundle.bundleId}`} className="block transition-colors duration-500 hover:text-accent">
      <CoverImage src={bundle.poster} alt="" width={385} height={385} sizes="(min-width: 62rem) 24vw, 80vw" className="mb-2.5 rounded-[1rem] shadow-soft" />
      <span className="block text-[1.125rem] leading-[1.375rem] font-semibold">{bundle.title}</span>
      <span className="mb-2 block leading-6">
        <Price price={bundle.price} discount={bundle.currentDiscount} />
        {!!bundle.currentDiscount && <small className="block text-xs text-success">&nbsp;(Additional {bundle.currentDiscount} % Off)</small>}
      </span>
    </Link>
  );
}
