import type { CategoryListItem } from '@pageaters/shared';
import Link from 'next/link';

import { CoverImage } from './cover-image.tsx';

type CardCategory = Pick<CategoryListItem, 'categoryId' | 'title' | 'thumbnail' | 'numberOfBooks'>;

// The legacy CategoryPortraitCard (carousels): the thumbnail under a 50% dark veil, white title and title count
// centred on it.
export function CategoryCard({ category }: { category: CardCategory }) {
  return (
    <Link href={`/categories/${category.categoryId}`} className="relative block overflow-hidden rounded-[0.5rem] md:rounded-[0.825rem]">
      <CoverImage src={category.thumbnail} alt="" width={300} height={400} sizes="(min-width: 62rem) 12vw, 31vw" className="rounded-none" />
      <span className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 p-3 text-center text-white">
        <span className="mb-2 text-base font-semibold md:text-[1.25rem]">{category.title}</span>
        <span className="text-sm">{category.numberOfBooks ?? 0} Titles</span>
      </span>
    </Link>
  );
}

// The legacy CategoryCardLarge (categories listing): the thumbnail with the title on a frosted strip at the bottom.
export function CategoryCardLarge({ category }: { category: CardCategory }) {
  return (
    <Link href={`/categories/${category.categoryId}`} className="relative mb-7 block overflow-hidden rounded-[1rem]">
      <CoverImage src={category.thumbnail} alt="" width={247} height={375} sizes="(min-width: 62rem) 16vw, 48vw" className="rounded-none" />
      <span className="absolute inset-x-0 bottom-0 flex h-1/5 items-center justify-center bg-white/20 px-2 text-center text-base leading-tight font-semibold text-white backdrop-blur-[5px] sm:text-[1.125rem] md:text-[1.4rem] lg:text-[1.8rem] lg:tracking-[-1px]">
        {category.title}
      </span>
    </Link>
  );
}
