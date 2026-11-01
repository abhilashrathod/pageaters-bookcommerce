'use client';

import { House } from 'lucide-react';
import Link from 'next/link';

import { AccountMenu, CartBadge } from '@/components/cart/account-menu.tsx';
import { useSession } from '@/lib/session.ts';

import { ExploreIcon, ExploreMenu, type MenuGroup } from './explore-menu.tsx';
import { ICON_BUTTON } from './wordmark.tsx';

// The legacy MobileMenu: below md, a bar fixed to the bottom with Home, Cart, Account and the Store menu.
export function MobileMenu({ groups }: { groups: MenuGroup[] }) {
  const { status } = useSession();
  return (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ccc] bg-white/90 md:hidden">
      <ul className="flex justify-evenly">
        <li className="inline-flex p-3">
          <Link href="/" className={`${ICON_BUTTON} flex-col`}>
            <House className="size-[30px]" strokeWidth={1.5} aria-hidden />
            <span className="text-xs">Home</span>
          </Link>
        </li>
        <li className="inline-flex p-3">
          <CartBadge label="Cart" />
        </li>
        <li className="inline-flex p-3">
          <AccountMenu side="top" label={status === 'shopper' ? 'Account' : 'Sign In'} />
        </li>
        {groups.length ? (
          <li className="inline-flex p-3">
            <ExploreMenu
              groups={groups}
              side="top"
              trigger={
                <button type="button" className={`${ICON_BUTTON} flex-col`} aria-label="Explore store">
                  <ExploreIcon />
                  <span className="text-xs">Store</span>
                </button>
              }
            />
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
