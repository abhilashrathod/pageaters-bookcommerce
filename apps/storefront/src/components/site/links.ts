import { isSafeHref } from '@pageaters/cms-types';

export interface SiteLink {
  label: string;
  href: string;
  newTab: boolean;
}

interface CmsLink {
  label?: string | null;
  href?: string | null;
  newTab?: boolean | null;
}

// CMS links that have a label and pass isSafeHref; the rest are dropped (the CMS validates them too).
export function safeLinks(links: ReadonlyArray<CmsLink | null | undefined> | null | undefined): SiteLink[] {
  return (links ?? []).flatMap((link) =>
    link?.label && link.href && isSafeHref(link.href)
      ? [{ label: link.label, href: link.href, newTab: link.newTab ?? false }]
      : [],
  );
}

// Link groups (header menus, footer columns) with unsafe links removed; a group left empty is dropped.
export function safeGroups(
  groups: ReadonlyArray<{ title: string; links?: CmsLink[] | null }>,
): { title: string; links: SiteLink[] }[] {
  return groups.flatMap(({ title, links }) => {
    const safe = safeLinks(links);
    return safe.length ? [{ title, links: safe }] : [];
  });
}
