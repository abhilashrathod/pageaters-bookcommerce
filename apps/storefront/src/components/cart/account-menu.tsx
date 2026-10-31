'use client';

import { LogOut, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

import { DemoLoginButton } from '@/components/cart/demo-login-button.tsx';
import { Button } from '@/components/ui/button.tsx';
import { logout, useSession } from '@/lib/session.ts';

// The cart link with its item count, for the site header.
export function CartBadge() {
  const { cartCount } = useSession();
  return (
    <Link href="/cart" className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-muted" aria-label={`Cart, ${cartCount} items`}>
      <ShoppingCart aria-hidden />
      {cartCount > 0 ? (
        <span className="absolute -top-1 -right-1 rounded-full bg-accent px-1.5 text-xs text-accent-foreground">{cartCount}</span>
      ) : null}
    </Link>
  );
}

// The header's account corner: demo sign-in for a guest; orders and sign-out for the shopper.
export function AccountMenu() {
  const { status, name } = useSession();
  if (status === 'loading') return null;
  if (status === 'guest') return <DemoLoginButton />;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link href="/account/orders" className="hover:underline">
        {name || 'My orders'}
      </Link>
      <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Sign out">
        <LogOut aria-hidden />
      </Button>
    </div>
  );
}
