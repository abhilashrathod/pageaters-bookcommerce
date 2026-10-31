'use client';

import type { ReactNode } from 'react';

import { DemoLoginButton } from '@/components/cart/demo-login-button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useSession } from '@/lib/session.ts';

// Shows its children to a signed-in shopper, and the demo sign-in to a guest.
export function ShopperGate({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === 'loading') return <Skeleton className="h-40 w-full" />;
  if (status === 'guest') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Sign in to see your cart and orders. This demo has one shared shopper account.</p>
        <DemoLoginButton />
      </div>
    );
  }
  return children;
}
