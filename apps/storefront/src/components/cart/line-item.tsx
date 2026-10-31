import type { ReactNode } from 'react';

import { CoverImage } from '@/components/cards/cover-image.tsx';
import { formatPrice } from '@/lib/money.ts';

// One cart, checkout or order line: cover, title, a detail line, the line total from the API, and optional controls.
export function LineItem({
  image,
  title,
  detail,
  total,
  children,
}: {
  image: string | null | undefined;
  title: string;
  detail?: string;
  total: number | undefined;
  children?: ReactNode;
}) {
  return (
    <li className="flex gap-4 border-b py-4 last:border-b-0">
      <div className="w-16 shrink-0">
        <CoverImage src={image} alt={title} width={64} height={96} sizes="64px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-medium">{title}</p>
        {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
        {children}
      </div>
      <p className="shrink-0 font-semibold">{total === undefined ? '' : formatPrice(total)}</p>
    </li>
  );
}

// The bill: every figure comes from the API (never computed here).
export function PriceBreakdown({
  subTotal,
  shipping,
  storeCredit = 0,
  total,
}: {
  subTotal: number;
  shipping?: number;
  storeCredit?: number;
  total?: number;
}) {
  const row = 'flex justify-between py-1';
  return (
    <dl className="text-sm">
      <div className={row}>
        <dt>Subtotal</dt>
        <dd className="font-semibold">{formatPrice(subTotal)}</dd>
      </div>
      {shipping === undefined ? null : (
        <div className={row}>
          <dt>Shipping</dt>
          <dd className="font-semibold">{shipping === 0 ? 'Free' : formatPrice(shipping)}</dd>
        </div>
      )}
      {storeCredit > 0 ? (
        <div className={`${row} text-primary`}>
          <dt>Store credit</dt>
          <dd className="font-semibold">−{formatPrice(storeCredit)}</dd>
        </div>
      ) : null}
      {total === undefined ? null : (
        <div className={`${row} mt-2 border-t pt-3 text-base`}>
          <dt className="font-semibold">Grand total</dt>
          <dd className="font-bold">{formatPrice(total)}</dd>
        </div>
      )}
    </dl>
  );
}
