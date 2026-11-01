'use client';

import type { Address } from '@pageaters/shared';
import { Building2, CirclePlus, House, Mail, Phone, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import { AddressForm } from '@/components/cart/address-form.tsx';
import { LinesSkeleton } from '@/components/cart/cart-view.tsx';
import { PANEL, PriceBreakdown, WithSummary } from '@/components/cart/line-item.tsx';
import { EmptyState } from '@/components/empty-state.tsx';
import { Button } from '@/components/ui/button.tsx';
import { errorMessage, shopperApi } from '@/lib/shopper-api.ts';
import { useLoad } from '@/lib/use-load.ts';

const loadAddresses = () => shopperApi.addresses.list();
const loadCart = () => shopperApi.cart.detail();

export const formatAddress = (address: Address) =>
  [address.addressLine1, address.addressLine2, address.landmark, address.city, address.state, address.pinCode].filter(Boolean).join(', ');

// The legacy address card (interactive-cards/Address): home or office icon with the name, the address, phone and email.
export function AddressCard({ address }: { address: Address }) {
  const TypeIcon = address.type === 'OFFICE' ? Building2 : House;
  const contact = 'flex items-center gap-1.5 text-[#3c3c3c]';
  return (
    <span className="flex flex-col">
      <span className="mb-2 flex items-center gap-1.5 text-[21px] font-semibold">
        <TypeIcon className="size-[21px]" strokeWidth={1.5} aria-hidden />
        {address.fullName}
      </span>
      <span className="mb-2">{formatAddress(address)}</span>
      <span className={contact}>
        <Phone className="size-4" strokeWidth={1.5} aria-hidden />
        {address.contactNo}
      </span>
      <span className={contact}>
        <Mail className="size-4" strokeWidth={1.5} aria-hidden />
        {address.email}
      </span>
    </span>
  );
}

// The legacy add/update address dialog (dialogs/add-or-update-address), here for adding.
function AddAddressDialog({ onSaved }: { onSaved: (address: Address) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" className="text-[#3c3c3c]">
          <CirclePlus className="size-[30px]" strokeWidth={1.5} aria-hidden />
          Add Address
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-[620px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[8px] bg-background p-5 shadow-lg"
        >
          <div className="mb-3.5 flex items-center justify-between">
            <Dialog.Title className="text-lg">Add Address</Dialog.Title>
            <Dialog.Close className="rounded-md p-1 hover:bg-muted" aria-label="Close">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <AddressForm
            onSaved={(address) => {
              setOpen(false);
              onSaved(address);
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Step 1 of checkout: choose (or add) the delivery address, then open the checkout for it (`orders.attempt`).
export function AddressSelect() {
  const router = useRouter();
  const { data: addresses, error, reload } = useLoad(loadAddresses);
  const { data: cart } = useLoad(loadCart);
  const [chosen, setChosen] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  if (error) return <p role="alert" className="page-container text-destructive">{error}</p>;
  if (!addresses) return <LinesSkeleton />;
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

  const summary = (
    <>
      {cart ? <PriceBreakdown subTotal={cart.subTotal} shipping="Calculated at Checkout" /> : null}
      {actionError ? (
        <p role="alert" className="mb-3.5 text-sm text-destructive">
          {actionError}
        </p>
      ) : null}
      <Button variant="accent" className="w-full" disabled={!selected || busy} onClick={deliverHere}>
        {busy ? 'Please wait…' : selected ? 'Use Selected Address' : 'Add/Select Address Info'}
      </Button>
    </>
  );

  return (
    <WithSummary title="Order Summary" summary={summary}>
      <div className={PANEL}>
        {addresses.length ? (
          <fieldset>
            <legend className="sr-only">Deliver to</legend>
            <ul>
              {addresses.map((address) => (
                <li key={address._id} className="my-3.5 border-b border-border pb-3.5 first:mt-0">
                  <label className="flex cursor-pointer gap-3.5">
                    <input
                      type="radio"
                      name="address"
                      value={address._id}
                      checked={selected === address._id}
                      onChange={() => setChosen(address._id)}
                      className="mt-2 size-4 accent-accent"
                    />
                    <AddressCard address={address} />
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : (
          <EmptyState illustration="delivery-address" title="Save Some Addresses!" size={250} />
        )}
        <div className="m-6 flex justify-center">
          <AddAddressDialog
            onSaved={(address) => {
              setChosen(address._id);
              void reload();
            }}
          />
        </div>
      </div>
    </WithSummary>
  );
}
