'use client';

import { BadgePercent, Boxes, LayoutGrid, LibraryBig, Package, Shapes, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';
import { Fragment, type ReactNode } from 'react';

import type { SiteLink } from './links.ts';

// Stand-ins for the legacy iconify menu icons, by link path; other links show no icon (as legacy "Contact").
const ICONS: Record<string, LucideIcon> = {
  '/book-boxes': Package,
  '/categories': Shapes,
  '/collections': LibraryBig,
  '/bundles': Boxes,
  '/deals': BadgePercent,
};

export const MENU_CONTENT = 'z-50 w-[200px] rounded-[4px] border bg-background p-1 text-sm shadow-md';
export const MENU_LABEL = 'px-3 py-1.5 text-xs text-muted-foreground';
export const MENU_ITEM = 'flex cursor-pointer items-center gap-2.5 rounded-[4px] px-3 py-2.5 outline-none data-[highlighted]:bg-muted';

export type MenuGroup = { title: string; links: SiteLink[] };

// The legacy "Explore Store" menu (Mantine Menu with arrow) from the CMS header groups, behind a trigger.
export function ExploreMenu({ groups, trigger, side = 'bottom' }: { groups: MenuGroup[]; trigger: ReactNode; side?: 'top' | 'bottom' }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" side={side} sideOffset={6} className={MENU_CONTENT}>
          {groups.map((group, index) => (
            <Fragment key={group.title}>
              {index > 0 ? <DropdownMenu.Separator className="my-1 h-px bg-border" /> : null}
              <DropdownMenu.Label className={MENU_LABEL}>{group.title}</DropdownMenu.Label>
              {group.links.map((link) => {
                const Icon = ICONS[link.href];
                return (
                  <DropdownMenu.Item key={link.href + link.label} asChild>
                    <Link href={link.href} className={MENU_ITEM} {...(link.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                      {Icon ? <Icon className="size-5" strokeWidth={1.5} aria-hidden /> : null}
                      {link.label}
                    </Link>
                  </DropdownMenu.Item>
                );
              })}
            </Fragment>
          ))}
          <DropdownMenu.Arrow className="fill-background" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function ExploreIcon() {
  return <LayoutGrid className="size-[30px]" strokeWidth={1.5} aria-hidden />;
}
