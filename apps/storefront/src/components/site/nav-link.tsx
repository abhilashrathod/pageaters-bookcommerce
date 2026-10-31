import Link from 'next/link';

import type { SiteLink } from './links.ts';

// A link that already passed safeLinks; new-tab links get rel=noopener.
export function NavLink({ link, className }: { link: SiteLink; className?: string }) {
  return link.newTab ? (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
      {link.label}
    </a>
  ) : (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}
