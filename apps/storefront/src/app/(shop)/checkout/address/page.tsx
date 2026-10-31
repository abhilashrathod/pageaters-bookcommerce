import type { Metadata } from 'next';

import { AddressSelect } from '@/components/cart/address-select.tsx';
import { ShopperGate } from '@/components/cart/shopper-gate.tsx';

export const metadata: Metadata = { title: 'Delivery address | Pageaters' };

export default function AddressPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Delivery address</h1>
      <ShopperGate>
        <AddressSelect />
      </ShopperGate>
    </>
  );
}
