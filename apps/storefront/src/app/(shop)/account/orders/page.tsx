import type { Metadata } from 'next';

import { OrdersList } from '@/components/cart/orders.tsx';
import { ShopperGate } from '@/components/cart/shopper-gate.tsx';
import { PageHeading } from '@/components/page-heading.tsx';

export const metadata: Metadata = { title: 'My orders | Pageaters' };

export default function OrdersPage() {
  return (
    <>
      <PageHeading title="Orders" />
      <ShopperGate>
        <OrdersList />
      </ShopperGate>
    </>
  );
}
