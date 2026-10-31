import type { AnnouncementBar as AnnouncementBarData } from '@pageaters/cms-types';

import { cmsFetch } from '@/lib/cms.ts';

import { safeLinks } from './links.ts';
import { NavLink } from './nav-link.tsx';

// The CMS announcement; disabled, empty or unreachable → nothing.
export async function AnnouncementBar() {
  const bar = await cmsFetch<AnnouncementBarData>('/globals/announcement-bar', ['cms:global:announcement-bar']);
  if (!bar?.enabled || !bar.message) return null;
  const [link] = safeLinks([{ ...bar.link, label: bar.link?.label || 'Learn more' }]);
  return (
    <div className="bg-primary px-3 py-2 text-center text-sm text-primary-foreground">
      {bar.message}
      {link ? <NavLink link={link} className="ml-2 font-medium underline underline-offset-2" /> : null}
    </div>
  );
}
