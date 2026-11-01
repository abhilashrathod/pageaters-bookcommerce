import type { Metadata } from 'next';

import { AddressSelect } from '@/components/cart/address-select.tsx';
import { ShopperGate } from '@/components/cart/shopper-gate.tsx';
import { PageHeading } from '@/components/page-heading.tsx';

export const metadata: Metadata = { title: 'Delivery address | Pageaters' };

export default function AddressPage() {
  return (
    <>
      <PageHeading title="Address Selection" trail={[{ title: 'Cart', href: '/cart' }]} />
      <ShopperGate>
        <AddressSelect />
      </ShopperGate>
    </>
  );
}
