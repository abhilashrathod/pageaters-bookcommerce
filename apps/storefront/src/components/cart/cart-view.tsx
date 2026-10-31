'use client';

import Link from 'next/link';
import { useState } from 'react';

import { LineItem, PriceBreakdown } from '@/components/cart/line-item.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { refreshCart } from '@/lib/session.ts';
import { errorMessage, shopperApi } from '@/lib/shopper-api.ts';
import { useLoad } from '@/lib/use-load.ts';

const loadCart = () => shopperApi.cart.detail();
// The API allows 2 of each book; bundles, boxes are 1 each.
const BOOK_QUANTITIES = [1, 2];

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

  if (error) return <p role="alert" className="text-destructive">{error}</p>;
  if (!cart) return <Skeleton className="h-60 w-full" />;
  const empty = !cart.products.length && !cart.bundles.length && !cart.mysteryBoxes.length && !cart.addOns.length;
  if (empty) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-lg">Add some books here. Your cart is empty.</p>
        <Button asChild variant="accent">
          <Link href="/">Browse books</Link>
        </Button>
      </div>
    );
  }

  const remove = (label: string, action: () => Promise<unknown>) => (
    <Button variant="link" size="sm" className="h-auto self-start p-0 text-destructive" disabled={busy} onClick={() => run(action)}>
      Remove<span className="sr-only"> {label}</span>
    </Button>
  );

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <ul className="md:col-span-2" aria-busy={busy}>
        {cart.products.map(({ _id, product, quantity, productTotal }) => (
          <LineItem key={_id} image={product.poster} title={product.title} detail={product.author?.name ?? undefined} total={productTotal}>
            <label className="flex items-center gap-2 text-sm">
              Qty
              <select
                className="rounded-md border bg-background px-2 py-1"
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
          <LineItem key={_id} image={bundle.poster} title={bundle.title} detail={`Bundle of ${bundle.bundledBooks.length} books`} total={total}>
            {remove(bundle.title, () => shopperApi.cart.removeBundle({ bundle: bundle._id }))}
          </LineItem>
        ))}
        {cart.mysteryBoxes.map(({ _id, box, total }) => (
          <LineItem key={_id} image={box.images[0]} title={box.title} detail="Mystery box" total={total}>
            {remove(box.title, () => shopperApi.cart.removeBox({ box: box._id }))}
          </LineItem>
        ))}
        {cart.addOns.map(({ _id, addOn, quantity, total }) => (
          <LineItem key={_id} image={addOn.poster} title={addOn.name} detail={`Add-on × ${quantity}`} total={total}>
            {remove(addOn.name, () => shopperApi.cart.removeAddOn({ addOn: addOn._id }))}
          </LineItem>
        ))}
      </ul>
      <aside className="flex h-fit flex-col gap-4 rounded-lg border p-4">
        <h2 className="font-semibold">Order summary</h2>
        <PriceBreakdown subTotal={cart.subTotal} />
        <p className="text-xs text-muted-foreground">Shipping is added at checkout.</p>
        {actionError ? (
          <p role="alert" className="text-sm text-destructive">
            {actionError}
          </p>
        ) : null}
        {/* `disabled` doesn't reach a Link through asChild: show a plain disabled button while the cart updates. */}
        {busy ? (
          <Button variant="accent" disabled>
            Proceed to checkout
          </Button>
        ) : (
          <Button asChild variant="accent">
            <Link href="/checkout/address">Proceed to checkout</Link>
          </Button>
        )}
      </aside>
    </div>
  );
}
