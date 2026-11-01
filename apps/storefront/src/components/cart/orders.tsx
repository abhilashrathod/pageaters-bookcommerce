'use client';

import { Calendar, Eye, MapPin, ShoppingBag, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useCallback } from 'react';

import { formatAddress } from '@/components/cart/address-select.tsx';
import { LinesSkeleton } from '@/components/cart/cart-view.tsx';
import { LineItem, PANEL, PriceBreakdown, WithSummary } from '@/components/cart/line-item.tsx';
import { CoverImage } from '@/components/cards/cover-image.tsx';
import { EmptyState } from '@/components/empty-state.tsx';
import { Button } from '@/components/ui/button.tsx';
import { formatPrice } from '@/lib/money.ts';
import { shopperApi } from '@/lib/shopper-api.ts';
import { useLoad } from '@/lib/use-load.ts';

// Lists show at most 50 items (store rule).
const MAX_ORDERS = 50;
const loadOrders = () => shopperApi.orders.list();
const dateOf = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

// The legacy order status colours (interactive-cards/Order.tsx): status colours, not theme tokens.
const STATUS: Record<string, string> = {
  paid: 'bg-[#2B580C]',
  confirmed: 'bg-[#2B580C]',
  shipped: 'bg-[#BB3B0E]',
  fulfilled: 'bg-[#FF5F25]',
  cancelled: 'bg-[#F90716]',
  returned: 'bg-[#444444]',
  replacement: 'bg-[#444444]',
  'return in progress': 'bg-[#E83A14]',
  'replacement in progress': 'bg-[#E83A14]',
  refunded: 'bg-[#001E6C]',
};

function Status({ status }: { status: string }) {
  return <span className={`rounded-[3px] px-2 text-white uppercase ${STATUS[status] ?? 'bg-muted-foreground'}`}>{status}</span>;
}

const INFO = 'inline-flex items-center gap-1.5 font-semibold text-[#3c3c3c]';

export function OrdersList() {
  const { data: orders, error } = useLoad(loadOrders);
  if (error) return <p role="alert" className="page-container text-destructive">{error}</p>;
  if (!orders) return <LinesSkeleton />;
  if (!orders.length) {
    return (
      <div className="page-container">
        <EmptyState illustration="empty-orders" title="No Orders Yet!" size={250} />
      </div>
    );
  }
  return (
    <ul className="page-container grid gap-x-6 xl:grid-cols-2">
      {orders.slice(0, MAX_ORDERS).map((order) => {
        const covers = [
          ...order.products.map(({ _id, product }) => ({ _id, src: product.poster, alt: product.title })),
          ...order.bundles.map(({ _id, bundle }) => ({ _id, src: bundle.poster, alt: bundle.title })),
          ...order.boxes.map(({ _id, box }) => ({ _id, src: box.images[0], alt: box.title })),
        ];
        const address = order.deliveryAddress;
        return (
          <li
            key={order._id}
            className="mb-3.5 border-b border-border pb-3.5 transition-colors duration-500 sm:mb-[1.6rem] sm:rounded-[1rem] sm:border sm:p-6 sm:hover:border-muted-foreground"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-[21px]">Order #{order.orderId}</h2>
              <Status status={order.orderStatus} />
            </div>
            <p className="mb-3.5 flex flex-wrap gap-x-3.5">
              <span className={INFO}>
                <Calendar className="size-4" aria-hidden />
                {dateOf(order.orderDate)}
              </span>
              <span className={INFO}>
                <Wallet className="size-4" aria-hidden />
                {formatPrice(order.total)}
              </span>
            </p>
            <p className="mb-3.5">
              <span className={INFO}>
                <MapPin className="size-4" aria-hidden />
                {address.fullName} ({address.type})
              </span>
              <br />
              {formatAddress(address)}
            </p>
            <p className={`${INFO} mb-2`}>
              <ShoppingBag className="size-4" aria-hidden />
              Order Items
            </p>
            <div className="mb-6 flex -space-x-2.5">
              {covers.map((cover) => (
                <span key={cover._id} className="size-[50px] overflow-hidden rounded-full shadow-[0_0_0_4px_#fff] sm:size-[75px]">
                  <CoverImage src={cover.src} alt={cover.alt} width={75} height={75} sizes="75px" className="size-full rounded-full" />
                </span>
              ))}
            </div>
            <div className="mt-3.5 flex justify-center">
              <Button asChild variant="ghost">
                <Link href={`/account/orders/${order.orderId}`}>
                  <Eye className="size-6" aria-hidden />
                  View Details<span className="sr-only"> of order {order.orderId}</span>
                </Link>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// One order: lines, address, payment, bill and its history (legacy account/orders/[id]).
export function OrderDetail({ orderId }: { orderId: string }) {
  const load = useCallback(() => shopperApi.orders.detail({ uniqueId: orderId }), [orderId]);
  const { data: order, error } = useLoad(load);
  if (error) return <p role="alert" className="page-container text-destructive">{error}</p>;
  if (!order) return <LinesSkeleton />;
  const summary = <PriceBreakdown subTotal={order.subTotal} shipping={order.shipping} storeCredit={order.storeCredit} total={order.total} />;
  return (
    <WithSummary title="Order Summary" summary={summary}>
      <div className={PANEL}>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[21px]">Order #{order.orderId}</h2>
          <Status status={order.orderStatus} />
        </div>
        <div className="mb-6 grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col">
            <h3 className="text-[21px]">Delivery Address:</h3>
            <span className="font-semibold text-[#3c3c3c]">
              {order.deliveryAddress.fullName} ({order.deliveryAddress.type})
            </span>
            <span>{formatAddress(order.deliveryAddress)}</span>
          </div>
          <div className="flex flex-col">
            <h3 className="text-[21px]">Order Info:</h3>
            <span>Placed on {dateOf(order.orderDate)}</span>
            {order.payment ? <span>Payment: {order.payment.method === 'cod' ? 'Cash on Delivery' : `Online (${order.payment.method})`}</span> : null}
          </div>
        </div>
        <h3 className="mb-3.5 text-[21px]">Order Items</h3>
        <ul className="mb-6">
          {order.products.map(({ _id, product, quantity, productTotal }) => (
            <LineItem key={_id} image={product.poster} title={product.title} detail={<p>Qty: {quantity}</p>} total={productTotal} />
          ))}
          {order.bundles.map(({ _id, bundle, total }) => (
            <LineItem key={_id} image={bundle.poster} title={bundle.title} detail={<p>Bundle</p>} total={total} />
          ))}
          {order.boxes.map(({ _id, box, total }) => (
            <LineItem key={_id} image={box.images[0]} title={box.title} detail={<p>Mystery box</p>} total={total} />
          ))}
          {order.addOns.map(({ _id, addOn, quantity, total }) => (
            <LineItem key={_id} image={addOn.poster} title={addOn.name} detail={<p>Add-on × {quantity}</p>} total={total} />
          ))}
        </ul>
        {order.orderHistory.length ? (
          <section>
            <h3 className="mb-3.5 text-[21px]">Order History</h3>
            <ol className="flex flex-col gap-2 border-l border-border pl-4">
              {order.orderHistory.map((entry) => (
                <li key={entry._id}>
                  <span className="font-semibold capitalize">{entry.title}</span> <span className="text-muted-foreground">· {dateOf(entry.time)}</span>
                  <p className="text-muted-foreground">{entry.description}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </WithSummary>
  );
}
