'use client';

import { addressCreatePayloadSchema } from '@pageaters/shared';
import type { Address } from '@pageaters/shared';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { errorMessage, shopperApi } from '@/lib/shopper-api.ts';

const FIELDS = [
  { name: 'fullName', label: 'Full name', autoComplete: 'name' },
  { name: 'contactNo', label: 'Phone (10 digits)', autoComplete: 'tel-national', inputMode: 'numeric' },
  { name: 'email', label: 'Email', autoComplete: 'email', type: 'email' },
  { name: 'addressLine1', label: 'Address line 1', autoComplete: 'address-line1' },
  { name: 'addressLine2', label: 'Address line 2 (optional)', autoComplete: 'address-line2' },
  { name: 'landmark', label: 'Landmark (optional)' },
  { name: 'city', label: 'City', autoComplete: 'address-level2' },
  { name: 'state', label: 'State', autoComplete: 'address-level1' },
  { name: 'pinCode', label: 'PIN code', autoComplete: 'postal-code', inputMode: 'numeric' },
] as const;

// A new delivery address, checked with the shared schema the API validates with.
export function AddressForm({ onSaved }: { onSaved: (address: Address) => void }) {
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = { ...Object.fromEntries(FIELDS.map(({ name }) => [name, form.get(name)])), isDefault: form.get('isDefault') === 'on' };
    const parsed = addressCreatePayloadSchema.safeParse(input);
    if (!parsed.success) {
      setInvalid(new Set(parsed.error.issues.map((issue) => String(issue.path[0]))));
      return;
    }
    setInvalid(new Set());
    setBusy(true);
    setError('');
    shopperApi.addresses
      .create(parsed.data)
      .then(onSaved, (cause: unknown) => setError(errorMessage(cause)))
      .finally(() => setBusy(false));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map(({ name, label, ...props }) => (
        <div key={name} className="flex flex-col gap-1.5">
          <Label htmlFor={`address-${name}`}>{label}</Label>
          <Input id={`address-${name}`} name={name} aria-invalid={invalid.has(name)} aria-describedby={invalid.has(name) ? `address-${name}-error` : undefined} {...props} />
          {invalid.has(name) ? (
            <p id={`address-${name}-error`} className="text-xs text-destructive">
              Please check this field.
            </p>
          ) : null}
        </div>
      ))}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="isDefault" /> Make this my default address
      </label>
      {error ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={busy} className="sm:col-span-2 sm:justify-self-start">
        {busy ? 'Saving…' : 'Save address'}
      </Button>
    </form>
  );
}
