import type { Metadata } from 'next';

import { CartView } from '@/components/cart/cart-view.tsx';
import { ShopperGate } from '@/components/cart/shopper-gate.tsx';

export const metadata: Metadata = { title: 'Cart | Pageaters' };

export default function CartPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Cart</h1>
      <ShopperGate>
        <CartView />
      </ShopperGate>
    </>
  );
}
