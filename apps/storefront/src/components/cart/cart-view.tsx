'use client';

import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { LineItem, PANEL, PriceBreakdown, WithSummary } from '@/components/cart/line-item.tsx';
import { Price } from '@/components/cards/price.tsx';
import { EmptyState } from '@/components/empty-state.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { refreshCart } from '@/lib/session.ts';
import { errorMessage, shopperApi } from '@/lib/shopper-api.ts';
import { useLoad } from '@/lib/use-load.ts';

const loadCart = () => shopperApi.cart.detail();
// The API allows 2 of each book; bundles, boxes are 1 each.
const BOOK_QUANTITIES = [1, 2];

// The legacy cart skeleton: three rows of a cover and text lines.
export function LinesSkeleton() {
  return (
    <div className="page-container">
      <div className={`${PANEL} md:w-2/3`}>
        {[1, 2, 3].map((row) => (
          <div key={row} className="mb-5 flex gap-3.5">
            <Skeleton className="h-[75px] w-[75px] rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3 w-3/4 rounded-full" />
              <Skeleton className="h-3 w-1/2 rounded-full" />
              <Skeleton className="h-3 w-1/4 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CartView() {
  const { data: cart, error, reload } = useLoad(loadCart);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = (action: () => Promise<unknown>) => {
    setBusy(true);
    setActionError('');
    action()
      .then(() => Promise.all([reload(), refreshCart()]))
      .catch((cause: unknown) => setActionError(errorMessage(cause)))
      .finally(() => setBusy(false));
  };

  if (error) return <p role="alert" className="page-container text-destructive">{error}</p>;
  if (!cart) return <LinesSkeleton />;
  const empty = !cart.products.length && !cart.bundles.length && !cart.mysteryBoxes.length && !cart.addOns.length;
  if (empty) {
    return (
      <div className="page-container">
        <EmptyState illustration="empty-cart" title="Add Some Books Here. Cart is Empty">
          <Button asChild variant="accent">
            <Link href="/">Browse books</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }

  const remove = (label: string, action: () => Promise<unknown>) => (
    <Button variant="ghost" className="pl-0" disabled={busy} onClick={() => run(action)}>
      <Trash2 aria-hidden />
      Delete<span className="sr-only"> {label}</span>
    </Button>
  );

  const summary = (
    <>
      <PriceBreakdown subTotal={cart.subTotal} shipping="Calculated at Checkout" />
      {actionError ? (
        <p role="alert" className="mb-3.5 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}
      {/* `disabled` doesn't reach a Link through asChild: show a plain disabled button while the cart updates. */}
      {busy ? (
        <Button variant="accent" className="w-full" disabled>
          Proceed to Buy
        </Button>
      ) : (
        <Button asChild variant="accent" className="w-full">
          <Link href="/checkout/address">Proceed to Buy</Link>
        </Button>
      )}
    </>
  );

  return (
    <WithSummary title="Bill Details" summary={summary}>
      <ul className={PANEL} aria-busy={busy}>
        {cart.products.map(({ _id, product, quantity, productTotal }) => (
          <LineItem
            key={_id}
            image={product.poster}
            title={product.title}
            total={productTotal}
            detail={
              <>
                {product.author?.name ? (
                  <p>
                    By <strong>{product.author.name}</strong>
                  </p>
                ) : null}
                <p>
                  <Price price={product.price} discount={product.currentDiscount} className="font-normal" /> × {quantity}
                  {product.currentDiscount ? <small className="text-xs text-success">&nbsp;({product.currentDiscount} % Off)</small> : null}
                </p>
              </>
            }
          >
            <label className="flex items-center gap-1">
              Qty:
              <select
                className="rounded-[4px] border border-[#d1d1d1] bg-background px-1 py-0.5"
                value={quantity}
                disabled={busy}
                onChange={(event) => run(() => shopperApi.cart.updateQuantity({ product: product._id, quantity: Number(event.target.value) }))}
              >
                {BOOK_QUANTITIES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            {remove(product.title, () => shopperApi.cart.remove({ product: product._id }))}
          </LineItem>
        ))}
        {cart.bundles.map(({ _id, bundle, total }) => (
          <LineItem key={_id} image={bundle.poster} title={bundle.title} detail={<p>Bundle of {bundle.bundledBooks.length} books</p>} total={total}>
            {remove(bundle.title, () => shopperApi.cart.removeBundle({ bundle: bundle._id }))}
          </LineItem>
        ))}
        {cart.mysteryBoxes.map(({ _id, box, total }) => (
          <LineItem key={_id} image={box.images[0]} title={box.title} detail={<p>Mystery box</p>} total={total}>
            {remove(box.title, () => shopperApi.cart.removeBox({ box: box._id }))}
          </LineItem>
        ))}
        {cart.addOns.map(({ _id, addOn, quantity, total }) => (
          <LineItem key={_id} image={addOn.poster} title={addOn.name} detail={<p>Add-on × {quantity}</p>} total={total}>
            {remove(addOn.name, () => shopperApi.cart.removeAddOn({ addOn: addOn._id }))}
          </LineItem>
        ))}
      </ul>
    </WithSummary>
  );
}
