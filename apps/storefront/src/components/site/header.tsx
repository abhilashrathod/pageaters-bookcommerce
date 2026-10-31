import type { Header as HeaderData } from '@pageaters/cms-types';
import Image from 'next/image';
import Link from 'next/link';

import { AccountMenu, CartBadge } from '@/components/cart/account-menu.tsx';
import { cmsFetch } from '@/lib/cms.ts';

import { safeGroups } from './links.ts';
import { MobileMenu } from './mobile-menu.tsx';
import { NavLink } from './nav-link.tsx';

// Site header from the CMS `header` global. CMS down → logo plus the account and cart corner.
export async function Header() {
  const header = await cmsFetch<HeaderData>('/globals/header', ['cms:global:header']);
  const groups = safeGroups((header?.navigation ?? []).map(({ label, links }) => ({ title: label, links })));
  const name = header?.logoText || 'Pageaters';

  return (
    <header className="sticky top-0 z-20 bg-background shadow-[0_0_6px_0_rgb(0_0_0/0.2)]">
      <div className="page-container flex h-16 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center" aria-label={`${name} home`}>
          <Image src="/images/horizontal-logo.png" alt={name} width={160} height={40} priority className="h-8 w-auto" />
        </Link>

        {groups.length ? (
          <nav aria-label="Main" className="ml-6 hidden flex-1 items-center gap-6 text-sm md:flex">
            {groups.map((group) => (
              <div key={group.title} className="group relative">
                {/* A button so keyboard focus opens the group (group-focus-within), then Tab walks into its links. */}
                <button type="button" aria-haspopup="true" className="cursor-default py-5 font-medium">
                  {group.title}
                </button>
                <ul className="invisible absolute left-0 top-full min-w-48 rounded-md border bg-background p-2 shadow-md group-focus-within:visible group-hover:visible">
                  {group.links.map((link) => (
                    <li key={link.href + link.label}>
                      <NavLink link={link} className="block rounded px-3 py-1.5 hover:bg-muted" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        ) : (
          <div className="flex-1" />
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* Client leaves: demo sign-in or the shopper's orders/sign-out, and the cart with its count. */}
          <AccountMenu />
          <CartBadge />
          {groups.length ? <MobileMenu groups={groups} /> : null}
        </div>
      </div>
    </header>
  );
}
