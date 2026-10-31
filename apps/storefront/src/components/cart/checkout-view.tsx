'use client';

import type { CheckoutMethod } from '@pageaters/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { formatAddress } from '@/components/cart/address-select.tsx';
import { LineItem, PriceBreakdown } from '@/components/cart/line-item.tsx';
import { openRazorpay } from '@/components/cart/razorpay.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { formatPrice } from '@/lib/money.ts';
import { refreshCart } from '@/lib/session.ts';
import { errorMessage, shopperApi } from '@/lib/shopper-api.ts';
import { useLoad } from '@/lib/use-load.ts';

const loadCheckout = () => shopperApi.orders.checkout();
const loadCredit = () => shopperApi.storeCredit.balance();
const loadCart = () => shopperApi.cart.detail();
const METHODS: { value: CheckoutMethod; label: string }[] = [
  { value: 'online', label: 'Pay online (Razorpay test mode)' },
  { value: 'cod', label: 'Cash on delivery' },
];

// Step 2 of checkout: review the priced order (`orders.checkout`), optionally spend store credit, then pay.
export function CheckoutView() {
  const router = useRouter();
  const { data: order, error, reload } = useLoad(loadCheckout);
  const { data: credit } = useLoad(loadCredit);
  // The open checkout has no lines until it is placed, so the lines shown are the cart's.
  const { data: cart } = useLoad(loadCart);
  const [method, setMethod] = useState<CheckoutMethod>('cod');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-destructive">{error}</p>
        <Button asChild variant="outline">
          <Link href="/cart">Back to cart</Link>
        </Button>
      </div>
    );
  }
  if (!order) return <Skeleton className="h-60 w-full" />;

  const fail = (cause: unknown) => {
    setActionError(cause instanceof Error && !('statusCode' in cause) ? cause.message : errorMessage(cause));
    setBusy(false);
  };
  const confirmed = (orderId: string) => {
    void refreshCart();
    router.push(`/order-confirm/${orderId}`);
  };

  const placeOrder = async () => {
    setBusy(true);
    setActionError('');
    try {
      const result = await shopperApi.orders.create({ method, giftOptions: { isGift: false } });
      if (method === 'cod') return confirmed(result.orderId);
      const key = result.razorKeyId;
      if (!key || !result.razorOrderId) throw new Error('Online payment is not available right now. Please choose cash on delivery.');
      await openRazorpay({ key, orderId: result.razorOrderId, onPaid: () => confirmed(result.orderId), onDismiss: () => setBusy(false) });
    } catch (cause) {
      fail(cause);
    }
  };

  const applyCredit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(new FormData(event.currentTarget).get('amount'));
    setBusy(true);
    setActionError('');
    shopperApi.orders
      .applyStoreCredit({ uniqueId: order.orderId, amount })
      .then(() => reload())
      .then(() => setBusy(false), fail);
  };

  const balance = credit?.storeCredit ?? 0;
  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="flex flex-col gap-6 md:col-span-2">
        <section className="rounded-lg border p-4 text-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Delivering to {order.deliveryAddress.fullName}</h2>
            <Link href="/checkout/address" className="text-primary hover:underline">
              Change
            </Link>
          </div>
          <p className="mt-1">{formatAddress(order.deliveryAddress)}</p>
        </section>
        {cart ? (
          <ul>
            {cart.products.map(({ _id, product, quantity, productTotal }) => (
              <LineItem key={_id} image={product.poster} title={product.title} detail={`Qty ${quantity}`} total={productTotal} />
            ))}
            {cart.bundles.map(({ _id, bundle, total }) => (
              <LineItem key={_id} image={bundle.poster} title={bundle.title} detail="Bundle" total={total} />
            ))}
            {cart.mysteryBoxes.map(({ _id, box, total }) => (
              <LineItem key={_id} image={box.images[0]} title={box.title} detail="Mystery box" total={total} />
            ))}
            {cart.addOns.map(({ _id, addOn, quantity, total }) => (
              <LineItem key={_id} image={addOn.poster} title={addOn.name} detail={`Add-on × ${quantity}`} total={total} />
            ))}
          </ul>
        ) : null}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">Payment method</legend>
          {METHODS.map(({ value, label }) => (
            <label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm has-checked:border-primary">
              <input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} />
              {label}
            </label>
          ))}
        </fieldset>
      </div>
      <aside className="flex h-fit flex-col gap-4 rounded-lg border p-4">
        <h2 className="font-semibold">Order {order.orderId}</h2>
        <PriceBreakdown subTotal={order.subTotal} shipping={order.shipping} storeCredit={order.storeCredit} total={order.total} />
        {balance > 0 && !order.storeCredit ? (
          <form onSubmit={applyCredit} className="flex flex-col gap-2 border-t pt-4">
            <Label htmlFor="store-credit">Redeem store credit (available {formatPrice(balance)})</Label>
            <div className="flex gap-2">
              <Input id="store-credit" name="amount" type="number" min={1} max={Math.min(balance, order.total)} defaultValue={Math.min(balance, order.total)} required />
              <Button type="submit" variant="outline" disabled={busy}>
                Apply
              </Button>
            </div>
          </form>
        ) : null}
        {actionError ? (
          <p role="alert" className="text-sm text-destructive">
            {actionError}
          </p>
        ) : null}
        <Button variant="accent" disabled={busy} onClick={() => void placeOrder()}>
          {busy ? 'Please wait…' : method === 'cod' ? 'Place order' : `Pay ${formatPrice(order.total)}`}
        </Button>
      </aside>
    </div>
  );
}
