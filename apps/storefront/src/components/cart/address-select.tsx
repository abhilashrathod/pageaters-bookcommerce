'use client';

import type { Address } from '@pageaters/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AddressForm } from '@/components/cart/address-form.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { errorMessage, shopperApi } from '@/lib/shopper-api.ts';
import { useLoad } from '@/lib/use-load.ts';

const loadAddresses = () => shopperApi.addresses.list();

export const formatAddress = (address: Address) =>
  [address.addressLine1, address.addressLine2, address.landmark, address.city, address.state, address.pinCode].filter(Boolean).join(', ');

// Step 1 of checkout: choose (or add) the delivery address, then open the checkout for it (`orders.attempt`).
export function AddressSelect() {
  const router = useRouter();
  const { data: addresses, error, reload } = useLoad(loadAddresses);
  const [chosen, setChosen] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  if (error) return <p role="alert" className="text-destructive">{error}</p>;
  if (!addresses) return <Skeleton className="h-40 w-full" />;
  const selected = chosen || addresses.find((address) => address.isDefault)?._id || addresses[0]?._id || '';

  const deliverHere = () => {
    setBusy(true);
    setActionError('');
    shopperApi.orders
      .attempt({ address: selected })
      .then(() => router.push('/checkout'))
      .catch((cause: unknown) => {
        setActionError(errorMessage(cause));
        setBusy(false);
      });
  };

  return (
    <div className="flex flex-col gap-6">
      {addresses.length ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 font-semibold">Deliver to</legend>
          {addresses.map((address) => (
            <label key={address._id} className="flex cursor-pointer gap-3 rounded-lg border p-4 has-checked:border-primary">
              <input type="radio" name="address" value={address._id} checked={selected === address._id} onChange={() => setChosen(address._id)} />
              <span className="flex flex-col gap-1 text-sm">
                <span className="font-medium">
                  {address.fullName} <span className="text-xs text-muted-foreground">({address.type})</span>
                </span>
                <span>{formatAddress(address)}</span>
                <span className="text-muted-foreground">{address.contactNo}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {adding || !addresses.length ? (
        <section className="rounded-lg border p-4">
          <h2 className="mb-4 font-semibold">New address</h2>
          <AddressForm
            onSaved={(address) => {
              setChosen(address._id);
              setAdding(false);
              void reload();
            }}
          />
        </section>
      ) : (
        <Button variant="outline" className="self-start" onClick={() => setAdding(true)}>
          Add a new address
        </Button>
      )}
      {actionError ? (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      ) : null}
      <Button variant="accent" className="self-start" disabled={!selected || busy} onClick={deliverHere}>
        {busy ? 'Please wait…' : 'Deliver here'}
      </Button>
    </div>
  );
}
