import type { ReactNode } from 'react';

import { CoverImage } from '@/components/cards/cover-image.tsx';
import { formatPrice } from '@/lib/money.ts';

// The legacy bordered panel around the cart, address and checkout lists (ProductListSpace / OrderSpace); flat on phones.
export const PANEL = 'mb-3.5 rounded-[1rem] transition-colors duration-500 sm:mb-9 sm:border sm:border-[#eee] sm:p-6 sm:hover:border-muted-foreground';

// The legacy two-thirds / one-third page with the "Bill Details" or "Order Summary" column on the right.
export function WithSummary({ title, summary, children }: { title: string; summary: ReactNode; children: ReactNode }) {
  return (
    <div className="page-container grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2">{children}</div>
      <aside>
        <h2 className="mb-2 text-[25px] tracking-[-1px]">{title}</h2>
        {summary}
      </aside>
    </div>
  );
}

// One cart, checkout or order line (legacy cart-elements): a small shadowed cover, the title in semibold, detail
// lines, the line total from the API, and optional controls.
export function LineItem({
  image,
  title,
  detail,
  total,
  children,
}: {
  image: string | null | undefined;
  title: string;
  detail?: ReactNode;
  total: number | undefined;
  children?: ReactNode;
}) {
  return (
    <li className="my-5 flex border-b border-border pb-5 first:mt-0 last:mb-0 last:border-b-0 last:pb-0">
      <div className="w-[95px] shrink-0 sm:w-[75px]">
        <CoverImage src={image} alt={title} width={75} height={100} sizes="95px" className="h-[110px] rounded-[7px] shadow-soft sm:h-[100px]" />
      </div>
      <div className="ml-3.5 flex min-w-0 flex-1 flex-col">
        <p className="flex justify-between gap-3 font-semibold">
          <span>{title}</span>
          <span className="shrink-0">{total === undefined ? '' : formatPrice(total)}</span>
        </p>
        {detail ? <div className="mb-3.5">{detail}</div> : null}
        {children ? <div className="flex items-center gap-7">{children}</div> : null}
      </div>
    </li>
  );
}

// The legacy CartBreakdown rows: every figure comes from the API (never computed here); `shipping` may be a note.
export function PriceBreakdown({
  subTotal,
  shipping,
  storeCredit = 0,
  total,
}: {
  subTotal: number;
  shipping?: number | string;
  storeCredit?: number;
  total?: number;
}) {
  const row = 'flex justify-between border-b border-border px-3.5 py-2 leading-6 last:border-b-0';
  return (
    <dl className="mb-3.5">
      <div className={row}>
        <dt>Subtotal:</dt>
        <dd className="font-semibold">{formatPrice(subTotal)}</dd>
      </div>
      {shipping === undefined ? null : (
        <div className={row}>
          <dt>Shipping:</dt>
          <dd className="font-semibold">{typeof shipping === 'string' ? shipping : shipping === 0 ? 'Free' : formatPrice(shipping)}</dd>
        </div>
      )}
      {storeCredit > 0 ? (
        <div className={`${row} text-success`}>
          <dt>Store Credit:</dt>
          <dd className="font-semibold">-{formatPrice(storeCredit)}</dd>
        </div>
      ) : null}
      <div className={`${row} text-[21px] font-semibold`}>
        <dt>Grand Total:</dt>
        <dd>{formatPrice(total ?? subTotal)}</dd>
      </div>
    </dl>
  );
}
