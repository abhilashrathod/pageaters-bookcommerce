import type { Metadata } from 'next';

import { CartView } from '@/components/cart/cart-view.tsx';
import { ShopperGate } from '@/components/cart/shopper-gate.tsx';
import { PageHeading } from '@/components/page-heading.tsx';

export const metadata: Metadata = { title: 'Cart | Pageaters' };

export default function CartPage() {
  return (
    <>
      <PageHeading title="Cart" />
      <ShopperGate>
        <CartView />
      </ShopperGate>
    </>
  );
}
