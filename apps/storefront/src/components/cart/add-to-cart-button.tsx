'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button.tsx';
import { demoLogin, refreshCart, useSession } from '@/lib/session.ts';
import { errorMessage, shopperApi } from '@/lib/shopper-api.ts';

const add = { book: (id: string) => shopperApi.cart.add({ product: id, quantity: 1 }), bundle: (id: string) => shopperApi.cart.addBundle({ bundle: id }), box: (id: string) => shopperApi.cart.addBox({ box: id }) };

// Adds one item (by its catalog ObjectId) to the cart, signing in as the demo shopper first when needed.
export function AddToCartButton({ kind, id, disabled }: { kind: 'book' | 'bundle' | 'box'; id: string; disabled?: boolean }) {
  const { status } = useSession();
  const [state, setState] = useState<'idle' | 'busy' | 'added'>('idle');
  const [error, setError] = useState('');

  const onClick = async () => {
    setState('busy');
    setError('');
    try {
      if (status === 'guest') await demoLogin();
      await add[kind](id);
      await refreshCart();
      setState('added');
    } catch (cause) {
      setError(errorMessage(cause));
      setState('idle');
    }
  };

  return (
    <div className="flex flex-col items-start gap-1" aria-live="polite">
      {/* items-start: a long error message mustn't stretch the button to its width. */}
      {state === 'added' ? (
        <Button variant="outline" asChild>
          <Link href="/cart">Added — view cart</Link>
        </Button>
      ) : (
        <Button variant="accent" onClick={() => void onClick()} disabled={disabled || status === 'loading' || state === 'busy'}>
          {state === 'busy' ? 'Adding…' : 'Add to Cart'}
        </Button>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
