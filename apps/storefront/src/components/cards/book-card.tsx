import type { BookListItem } from '@pageaters/shared';
import Link from 'next/link';

import { Badges } from './badges.tsx';
import { CoverImage } from './cover-image.tsx';
import { Price } from './price.tsx';

// Fields a book card reads; product sets populate only some of them.
export type BookCardBook = Partial<
  Pick<BookListItem, 'bookId' | 'title' | 'poster' | 'price' | 'currentDiscount' | 'inventory' | 'bestSeller' | 'editorsPick' | 'newRelease' | 'preOrder'>
>;

const tag = 'absolute top-2 left-2 z-10 inline-flex rounded-[7px] border border-black/20 px-2 py-1 text-base leading-5 shadow-tag';

// The legacy ProductCardLandscape: cover with a discount or out-of-stock tag, flag badges, title and price.
export function BookCard({ book }: { book: BookCardBook }) {
  const title = book.title ?? 'Untitled';
  const outOfStock = (book.inventory ?? 0) <= 0;
  return (
    <Link href={`/books/${book.bookId}`} className="relative block transition-colors duration-500 hover:text-accent">
      {outOfStock ? (
        <span className={`${tag} bg-destructive text-white`}>Out of Stock</span>
      ) : (
        !!book.currentDiscount && <span className={`${tag} bg-background text-primary`}>{book.currentDiscount}% Off</span>
      )}
      <CoverImage
        src={book.poster}
        alt={title}
        width={247}
        height={375}
        sizes="(min-width: 62rem) 14vw, (min-width: 36rem) 25vw, 48vw"
        className={`mb-2.5 rounded-[1rem] shadow-soft ${outOfStock ? 'grayscale' : ''}`}
      />
      <Badges flags={book} className="mb-1" />
      <span className="block">{title}</span>
      <Price price={book.price} discount={book.currentDiscount} />
    </Link>
  );
}
