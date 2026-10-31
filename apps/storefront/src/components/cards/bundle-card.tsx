import type { BundleListItem } from '@pageaters/shared';
import Link from 'next/link';

import { CoverImage } from './cover-image.tsx';
import { Price } from './price.tsx';

// The legacy BundlesCardMedium: square poster, title, price and the bundle's extra discount.
export function BundleCard({ bundle }: { bundle: Pick<BundleListItem, 'bundleId' | 'title' | 'poster' | 'price' | 'currentDiscount'> }) {
  return (
    <Link href={`/bundles/${bundle.bundleId}`} className="block">
      <CoverImage src={bundle.poster} alt={bundle.title} width={385} height={385} sizes="(min-width: 62rem) 24vw, 80vw" className="mb-3" />
      <span className="block font-semibold">{bundle.title}</span>
      <Price price={bundle.price} discount={bundle.currentDiscount} />
      {!!bundle.currentDiscount && <small className="block text-success">(Additional {bundle.currentDiscount}% Off)</small>}
    </Link>
  );
}
