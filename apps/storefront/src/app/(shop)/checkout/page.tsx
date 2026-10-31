import type { Metadata } from 'next';

import { CheckoutView } from '@/components/cart/checkout-view.tsx';
import { ShopperGate } from '@/components/cart/shopper-gate.tsx';

export const metadata: Metadata = { title: 'Checkout | Pageaters' };

export default function CheckoutPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>
      <ShopperGate>
        <CheckoutView />
      </ShopperGate>
    </>
  );
}
