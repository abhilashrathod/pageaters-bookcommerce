'use client';

import { addressCreatePayloadSchema } from '@pageaters/shared';
import type { Address } from '@pageaters/shared';
import { Fragment, useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { errorMessage, shopperApi } from '@/lib/shopper-api.ts';

type Field = { name: string; label: string; autoComplete?: string; inputMode?: 'numeric'; type?: string; wide?: boolean };

// The legacy dialog's sections, each split by a centred divider label.
const SECTIONS: [string | null, Field[]][] = [
  [null, [{ name: 'fullName', label: 'Full Name', autoComplete: 'name', wide: true }]],
  [
    'Contact Info',
    [
      { name: 'email', label: 'Email', autoComplete: 'email', type: 'email' },
      { name: 'contactNo', label: 'Contact No (10 digits)', autoComplete: 'tel-national', inputMode: 'numeric' },
    ],
  ],
  [
    'Delivery Details',
    [
      { name: 'city', label: 'City', autoComplete: 'address-level2' },
      { name: 'state', label: 'State', autoComplete: 'address-level1' },
      { name: 'addressLine1', label: 'Address Line 1', autoComplete: 'address-line1', wide: true },
      { name: 'addressLine2', label: 'Address Line 2 (optional)', autoComplete: 'address-line2', wide: true },
      { name: 'landmark', label: 'Landmark (optional)' },
      { name: 'pinCode', label: 'Pin Code', autoComplete: 'postal-code', inputMode: 'numeric' },
    ],
  ],
];
const FIELDS = SECTIONS.flatMap(([, fields]) => fields);

function Divider({ label }: { label: string }) {
  return (
    <p className="col-span-2 my-1 flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
      {label}
    </p>
  );
}

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
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-2 gap-x-4 gap-y-3">
      {SECTIONS.map(([section, fields]) => (
        <Fragment key={section ?? 'name'}>
          {section ? <Divider label={section} /> : null}
          {fields.map(({ name, label, wide, ...props }) => (
            <div key={name} className={`flex flex-col gap-1.5 ${wide ? 'col-span-2' : ''}`}>
              <Label htmlFor={`address-${name}`}>{label}</Label>
              <Input id={`address-${name}`} name={name} aria-invalid={invalid.has(name)} aria-describedby={invalid.has(name) ? `address-${name}-error` : undefined} {...props} />
              {invalid.has(name) ? (
                <p id={`address-${name}-error`} className="text-xs text-destructive">
                  Please check this field.
                </p>
              ) : null}
            </div>
          ))}
        </Fragment>
      ))}
      <Divider label="Address Preferences" />
      <label className="col-span-2 mb-4 flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDefault" className="accent-accent" /> Make this my default address
      </label>
      {error ? (
        <p role="alert" className="col-span-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={busy} className="col-span-2 justify-self-end">
        {busy ? 'Saving…' : 'Save Address'}
      </Button>
    </form>
  );
}
