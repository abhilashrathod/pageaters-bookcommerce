import type { Metadata } from 'next';
import Link from 'next/link';

import { OrderDetail } from '@/components/cart/orders.tsx';
import { ShopperGate } from '@/components/cart/shopper-gate.tsx';

export const metadata: Metadata = { title: 'Order | Pageaters' };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Link href="/account/orders" className="text-sm text-primary hover:underline">
        ← My orders
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold">Order details</h1>
      <ShopperGate>
        <OrderDetail orderId={id} />
      </ShopperGate>
    </>
  );
}
