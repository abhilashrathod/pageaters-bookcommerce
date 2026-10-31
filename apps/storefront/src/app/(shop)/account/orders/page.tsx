import type { Metadata } from 'next';

import { OrdersList } from '@/components/cart/orders.tsx';
import { ShopperGate } from '@/components/cart/shopper-gate.tsx';

export const metadata: Metadata = { title: 'My orders | Pageaters' };

export default function OrdersPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">My orders</h1>
      <ShopperGate>
        <OrdersList />
      </ShopperGate>
    </>
  );
}
