import type { Metadata } from 'next';

import { CheckoutView } from '@/components/cart/checkout-view.tsx';
import { ShopperGate } from '@/components/cart/shopper-gate.tsx';
import { PageHeading } from '@/components/page-heading.tsx';

export const metadata: Metadata = { title: 'Checkout | Pageaters' };

export default function CheckoutPage() {
  return (
    <>
      <PageHeading title="Checkout" trail={[{ title: 'Cart', href: '/cart' }]} />
      <ShopperGate>
        <CheckoutView />
      </ShopperGate>
    </>
  );
}
