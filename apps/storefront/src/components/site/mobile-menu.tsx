'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import type { SiteLink } from './links.ts';

// The header navigation below md: a toggle that opens the menu groups as a panel under the header.
export function MobileMenu({ groups }: { groups: { title: string; links: SiteLink[] }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
        className="rounded-md p-2 hover:bg-muted"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>
      {open ? (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
          className="absolute inset-x-0 top-full max-h-[70vh] overflow-y-auto border-t bg-background shadow-md"
        >
          <div className="page-container grid gap-4 py-4 text-sm">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="mb-1 font-medium">{group.title}</p>
                <ul>
                  {group.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        {...(link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className="block py-1.5 text-muted-foreground hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
