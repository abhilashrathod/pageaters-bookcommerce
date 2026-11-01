'use client';

import type { ReactNode } from 'react';

import { LinesSkeleton } from '@/components/cart/cart-view.tsx';
import { DemoLoginButton } from '@/components/cart/demo-login-button.tsx';
import { EmptyState } from '@/components/empty-state.tsx';
import { useSession } from '@/lib/session.ts';

// Shows its children to a signed-in shopper, and the demo sign-in to a guest (the legacy "Please Sign In" graphic).
export function ShopperGate({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === 'loading') return <LinesSkeleton />;
  if (status === 'guest') {
    return (
      <div className="page-container">
        <EmptyState illustration="personal-settings" title="Please Sign In to Access Your Cart and Orders">
          <p className="mb-3.5 text-muted-foreground">This demo has one shared shopper account.</p>
          <DemoLoginButton />
        </EmptyState>
      </div>
    );
  }
  return children;
}
