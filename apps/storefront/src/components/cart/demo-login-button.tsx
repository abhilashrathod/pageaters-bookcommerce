'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button.tsx';
import { demoLogin } from '@/lib/session.ts';
import { errorMessage } from '@/lib/shopper-api.ts';

// "Continue as demo shopper" (AGENTS.md §6): no signup or OTP in the demo.
export function DemoLoginButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const onClick = () => {
    setBusy(true);
    setError('');
    demoLogin()
      .catch((cause: unknown) => setError(errorMessage(cause)))
      .finally(() => setBusy(false));
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="accent" onClick={onClick} disabled={busy}>
        {busy ? 'Signing in…' : 'Continue as demo shopper'}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
