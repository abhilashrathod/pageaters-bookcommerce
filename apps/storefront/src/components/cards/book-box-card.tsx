import type { BookListItem } from '@pageaters/shared';
import Link from 'next/link';

import { TagPills } from './badges.tsx';
import { CoverImage } from './cover-image.tsx';

// The legacy BookBoxCardLarge (book boxes listing): a bordered card, the box image on top, the title in light type
// and the box's tags as pills.
export function BookBoxCard({ box }: { box: Pick<BookListItem, 'bookId' | 'title' | 'poster' | 'tags'> }) {
  return (
    <Link href={`/books/${box.bookId}`} className="mb-6 block rounded-[1rem] border border-[#ccc] transition-colors duration-500 hover:text-accent">
      <CoverImage
        src={box.poster}
        alt=""
        width={1560}
        height={1170}
        sizes="(min-width: 75rem) 32vw, (min-width: 36rem) 48vw, 100vw"
        className="h-[320px] rounded-t-[1rem] rounded-b-none sm:h-[275px] md:h-[355px] lg:h-[420px]"
      />
      <span className="mb-3.5 block p-3.5 sm:mb-5 sm:p-5 lg:mb-9">
        <span className="mb-1 block text-[28px] font-light tracking-[-1px]">{box.title}</span>
        <TagPills tags={box.tags ?? []} className="mt-3.5 justify-start" />
      </span>
    </Link>
  );
}
