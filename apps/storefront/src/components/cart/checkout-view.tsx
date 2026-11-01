'use client';

import type { CheckoutMethod } from '@pageaters/shared';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { AddressCard } from '@/components/cart/address-select.tsx';
import { LinesSkeleton } from '@/components/cart/cart-view.tsx';
import { LineItem, PANEL, PriceBreakdown, WithSummary } from '@/components/cart/line-item.tsx';
import { openRazorpay } from '@/components/cart/razorpay.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { formatPrice } from '@/lib/money.ts';
import { refreshCart } from '@/lib/session.ts';
import { errorMessage, shopperApi } from '@/lib/shopper-api.ts';
import { useLoad } from '@/lib/use-load.ts';

const loadCheckout = () => shopperApi.orders.checkout();
const loadCredit = () => shopperApi.storeCredit.balance();
const loadCart = () => shopperApi.cart.detail();
const METHODS: { value: CheckoutMethod; label: string }[] = [
  { value: 'online', label: 'Pay Online (Razorpay test mode)' },
  { value: 'cod', label: 'Cash on Delivery' },
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
      <div className="page-container flex flex-col items-start gap-3">
        <p role="alert" className="text-destructive">{error}</p>
        <Button asChild variant="secondary">
          <Link href="/cart">Back to cart</Link>
        </Button>
      </div>
    );
  }
  if (!order) return <LinesSkeleton />;

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
  const count = cart ? cart.products.length + cart.bundles.length + cart.mysteryBoxes.length + cart.addOns.length : 0;
  const summary = (
    <>
      <PriceBreakdown subTotal={order.subTotal} shipping={order.shipping} storeCredit={order.storeCredit} total={order.total} />
      {balance > 0 && !order.storeCredit ? (
        <form onSubmit={applyCredit} className="mb-3.5 flex flex-col gap-2">
          <Label htmlFor="store-credit">Redeem store credit (available {formatPrice(balance)})</Label>
          <div className="flex gap-2">
            <Input id="store-credit" name="amount" type="number" min={1} max={Math.min(balance, order.total)} defaultValue={Math.min(balance, order.total)} required />
            <Button type="submit" variant="secondary" size="sm" className="px-4" disabled={busy}>
              Apply
            </Button>
          </div>
        </form>
      ) : null}
      {actionError ? (
        <p role="alert" className="mb-3.5 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}
      <Button variant="accent" className="w-full" disabled={busy} onClick={() => void placeOrder()}>
        {busy ? 'Please wait…' : method === 'cod' ? 'Place Order' : `Pay ${formatPrice(order.total)}`}
      </Button>
    </>
  );

  return (
    <WithSummary title="Order Summary" summary={summary}>
      <div className={PANEL}>
        <Section title="Delivery Address">
          <div className="flex items-start justify-between gap-3">
            <AddressCard address={order.deliveryAddress} />
            <Link href="/checkout/address" className="shrink-0 text-accent hover:underline">
              Change
            </Link>
          </div>
        </Section>
        <Section title={`In Cart (${count})`}>
          {cart ? (
            <ul>
              {cart.products.map(({ _id, product, quantity, productTotal }) => (
                <LineItem key={_id} image={product.poster} title={product.title} detail={<p>Qty: {quantity}</p>} total={productTotal} />
              ))}
              {cart.bundles.map(({ _id, bundle, total }) => (
                <LineItem key={_id} image={bundle.poster} title={bundle.title} detail={<p>Bundle</p>} total={total} />
              ))}
              {cart.mysteryBoxes.map(({ _id, box, total }) => (
                <LineItem key={_id} image={box.images[0]} title={box.title} detail={<p>Mystery box</p>} total={total} />
              ))}
              {cart.addOns.map(({ _id, addOn, quantity, total }) => (
                <LineItem key={_id} image={addOn.poster} title={addOn.name} detail={<p>Add-on × {quantity}</p>} total={total} />
              ))}
            </ul>
          ) : null}
        </Section>
        <Section title="Payment Method">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-semibold">Please Select Preferred Payment Method</legend>
            {METHODS.map(({ value, label }) => (
              <label key={value} className="flex cursor-pointer items-center gap-3">
                <input type="radio" name="method" value={value} checked={method === value} onChange={() => setMethod(value)} className="size-4 accent-accent" />
                {label}
              </label>
            ))}
          </fieldset>
        </Section>
      </div>
    </WithSummary>
  );
}

// One legacy accordion section (Mantine Accordion), open by default.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-b border-border last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}
