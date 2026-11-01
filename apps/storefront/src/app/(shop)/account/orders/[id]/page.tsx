import type { Metadata } from 'next';

import { OrderDetail } from '@/components/cart/orders.tsx';
import { ShopperGate } from '@/components/cart/shopper-gate.tsx';
import { PageHeading } from '@/components/page-heading.tsx';

export const metadata: Metadata = { title: 'Order | Pageaters' };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeading title="Order Details" trail={[{ title: 'Orders', href: '/account/orders' }]} />
      <ShopperGate>
        <OrderDetail orderId={id} />
      </ShopperGate>
    </>
  );
}
