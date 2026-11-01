'use client';

import { CircleUser, LogOut, ShoppingBag, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';
import { type ReactNode, useState } from 'react';

import { MENU_CONTENT, MENU_ITEM, MENU_LABEL } from '@/components/site/explore-menu.tsx';
import { ICON_BUTTON } from '@/components/site/wordmark.tsx';
import { demoLogin, logout, useSession } from '@/lib/session.ts';
import { errorMessage } from '@/lib/shopper-api.ts';

// The legacy cart icon with the orange count badge.
export function CartBadge({ label }: { label?: string }) {
  const { cartCount } = useSession();
  return (
    <Link href="/cart" className={`${ICON_BUTTON} flex-col`} aria-label={`Cart, ${cartCount} items`}>
      <ShoppingCart className="size-[30px]" strokeWidth={1.5} aria-hidden />
      {label ? <span className="text-xs">{label}</span> : null}
      {cartCount > 0 ? (
        <span className="absolute -top-1 right-0 rounded-full bg-accent px-1.5 text-[11px] font-bold leading-5 text-accent-foreground">{cartCount}</span>
      ) : null}
    </Link>
  );
}

// The legacy user icon menu: "Hello, <name>!" with orders and sign-out for the shopper; the demo sign-in for a guest
// (the demo has no signup, AGENTS.md §6).
export function AccountMenu({ label, side = 'bottom' }: { label?: ReactNode; side?: 'top' | 'bottom' }) {
  const { status, name } = useSession();
  const [error, setError] = useState('');
  // A menu item, not a button inside the menu: Radix menus only let the keyboard reach their items.
  const signIn = (event: Event) => {
    event.preventDefault(); // stays open so a failure can show; signing in swaps the menu to the shopper's items
    setError('');
    demoLogin().catch((cause: unknown) => setError(errorMessage(cause)));
  };
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className={`${ICON_BUTTON} flex-col`} aria-label="Account" disabled={status === 'loading'}>
        <CircleUser className="size-[30px]" strokeWidth={1.5} aria-hidden />
        {label ? <span className="text-xs">{label}</span> : null}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" side={side} sideOffset={6} className={MENU_CONTENT}>
          <DropdownMenu.Label className={MENU_LABEL}>Hello, {name || 'Reader'}!</DropdownMenu.Label>
          {status === 'shopper' ? (
            <>
              <DropdownMenu.Item asChild>
                <Link href="/account/orders" className={MENU_ITEM}>
                  <ShoppingBag className="size-5" strokeWidth={1.5} aria-hidden />
                  Orders
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item className={MENU_ITEM} onSelect={() => void logout()}>
                <LogOut className="size-5" strokeWidth={1.5} aria-hidden />
                Logout
              </DropdownMenu.Item>
            </>
          ) : (
            <>
              <DropdownMenu.Item className={MENU_ITEM} onSelect={signIn}>
                <CircleUser className="size-5" strokeWidth={1.5} aria-hidden />
                Continue as demo shopper
              </DropdownMenu.Item>
              {error ? (
                <p role="alert" className="px-3 py-1 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </>
          )}
          <DropdownMenu.Arrow className="fill-background" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
