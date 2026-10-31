import type { Metadata } from 'next';
import Link from 'next/link';

import { OrderDetail } from '@/components/cart/orders.tsx';
import { ShopperGate } from '@/components/cart/shopper-gate.tsx';

export const metadata: Metadata = { title: 'Order placed | Pageaters' };

export default async function OrderConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Thank you for your order!</h1>
        <p className="text-muted-foreground">
          This is a demo: nothing is charged or shipped. You can follow the order under{' '}
          <Link href="/account/orders" className="text-primary hover:underline">
            My orders
          </Link>
          .
        </p>
      </div>
      <ShopperGate>
        <OrderDetail orderId={id} />
      </ShopperGate>
    </>
  );
}
