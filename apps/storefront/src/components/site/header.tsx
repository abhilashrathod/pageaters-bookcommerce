import type { Header as HeaderData } from '@pageaters/cms-types';
import Link from 'next/link';

import { AccountMenu, CartBadge } from '@/components/cart/account-menu.tsx';
import { cmsFetch } from '@/lib/cms.ts';

import { ExploreIcon, ExploreMenu } from './explore-menu.tsx';
import { HeaderSearch } from './header-search.tsx';
import { safeGroups } from './links.ts';
import { MobileMenu } from './mobile-menu.tsx';
import { ICON_BUTTON, Wordmark } from './wordmark.tsx';

// The legacy header (partials/Header.tsx): a white bar with the legacy shadow, the bold text wordmark, the search
// pill, then the "Explore Store" grid menu (the CMS `header` groups), the user menu and the cart. Below md the last
// three move to the bottom bar (MobileMenu). CMS down → no Explore menu.
export async function Header() {
  const header = await cmsFetch<HeaderData>('/globals/header', ['cms:global:header']);
  const groups = safeGroups((header?.navigation ?? []).map(({ label, links }) => ({ title: label, links })));
  const name = header?.logoText || 'Pageaters';

  return (
    <>
      <header className="sticky top-0 z-20 w-full bg-background shadow-[0_0_6px_0_rgb(0_0_0/0.2)]">
        <div className="page-container flex flex-wrap items-center py-2.5">
          <div className="flex-[5] sm:flex-1">
            <Link href="/" aria-label={`${name} home`}>
              <Wordmark name={name} />
            </Link>
          </div>
          <nav aria-label="Main" className="flex flex-[5] justify-end sm:flex-[2_1_auto]">
            <ul className="flex w-full items-center justify-end">
              <HeaderSearch />
              {groups.length ? (
                <li className="hidden px-2 md:inline-flex">
                  <ExploreMenu
                    groups={groups}
                    trigger={
                      <button type="button" className={ICON_BUTTON} aria-label="Explore store">
                        <ExploreIcon />
                      </button>
                    }
                  />
                </li>
              ) : null}
              <li className="hidden px-2 md:inline-flex">
                <AccountMenu />
              </li>
              <li className="hidden pl-2 md:inline-flex">
                <CartBadge />
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <MobileMenu groups={groups} />
    </>
  );
}
