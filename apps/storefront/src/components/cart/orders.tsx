'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { formatAddress } from '@/components/cart/address-select.tsx';
import { LineItem, PriceBreakdown } from '@/components/cart/line-item.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { formatPrice } from '@/lib/money.ts';
import { shopperApi } from '@/lib/shopper-api.ts';
import { useLoad } from '@/lib/use-load.ts';

// Lists show at most 50 items (store rule).
const MAX_ORDERS = 50;
const loadOrders = () => shopperApi.orders.list();
const dateOf = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function Status({ status }: { status: string }) {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">{status}</span>;
}

export function OrdersList() {
  const { data: orders, error } = useLoad(loadOrders);
  if (error) return <p role="alert" className="text-destructive">{error}</p>;
  if (!orders) return <Skeleton className="h-40 w-full" />;
  if (!orders.length) return <p className="py-8 text-center text-muted-foreground">No orders yet.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {orders.slice(0, MAX_ORDERS).map((order) => {
        const items = order.products.length + order.bundles.length + order.boxes.length;
        return (
          <li key={order._id}>
            <Link href={`/account/orders/${order.orderId}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4 hover:bg-muted">
              <span className="flex flex-col gap-1">
                <span className="font-medium">{order.orderId}</span>
                <span className="text-sm text-muted-foreground">
                  {dateOf(order.orderDate)} · {items} {items === 1 ? 'item' : 'items'}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <Status status={order.orderStatus} />
                <span className="font-semibold">{formatPrice(order.total)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// One order: lines, address, bill and its history. Used by the order page and the confirmation page.
export function OrderDetail({ orderId }: { orderId: string }) {
  const load = useCallback(() => shopperApi.orders.detail({ uniqueId: orderId }), [orderId]);
  const { data: order, error } = useLoad(load);
  if (error) return <p role="alert" className="text-destructive">{error}</p>;
  if (!order) return <Skeleton className="h-60 w-full" />;
  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="flex flex-col gap-6 md:col-span-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">{order.orderId}</h2>
          <Status status={order.orderStatus} />
          <span className="text-sm text-muted-foreground">{dateOf(order.orderDate)}</span>
        </div>
        <ul>
          {order.products.map(({ _id, product, quantity, productTotal }) => (
            <LineItem key={_id} image={product.poster} title={product.title} detail={`Qty ${quantity}`} total={productTotal} />
          ))}
          {order.bundles.map(({ _id, bundle, total }) => (
            <LineItem key={_id} image={bundle.poster} title={bundle.title} detail="Bundle" total={total} />
          ))}
          {order.boxes.map(({ _id, box, total }) => (
            <LineItem key={_id} image={box.images[0]} title={box.title} detail="Mystery box" total={total} />
          ))}
          {order.addOns.map(({ _id, addOn, quantity, total }) => (
            <LineItem key={_id} image={addOn.poster} title={addOn.name} detail={`Add-on × ${quantity}`} total={total} />
          ))}
        </ul>
        {order.orderHistory.length ? (
          <section>
            <h3 className="mb-2 font-semibold">Order history</h3>
            <ol className="flex flex-col gap-2 border-l pl-4 text-sm">
              {order.orderHistory.map((entry) => (
                <li key={entry._id}>
                  <span className="font-medium capitalize">{entry.title}</span> <span className="text-muted-foreground">· {dateOf(entry.time)}</span>
                  <p className="text-muted-foreground">{entry.description}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
      <aside className="flex h-fit flex-col gap-4 rounded-lg border p-4 text-sm">
        <section>
          <h3 className="font-semibold">Delivery address</h3>
          <p className="mt-1">{order.deliveryAddress.fullName}</p>
          <p>{formatAddress(order.deliveryAddress)}</p>
        </section>
        {order.payment ? <p>Payment: {order.payment.method === 'cod' ? 'Cash on delivery' : `Online (${order.payment.method})`}</p> : null}
        <PriceBreakdown subTotal={order.subTotal} shipping={order.shipping} storeCredit={order.storeCredit} total={order.total} />
      </aside>
    </div>
  );
}
