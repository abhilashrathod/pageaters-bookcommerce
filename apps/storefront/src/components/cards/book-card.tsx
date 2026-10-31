import type { BookListItem } from '@pageaters/shared';
import Link from 'next/link';

import { CoverImage } from './cover-image.tsx';
import { Price } from './price.tsx';

// Fields a book card reads; product sets populate only some of them.
export type BookCardBook = Partial<
  Pick<BookListItem, 'bookId' | 'title' | 'poster' | 'price' | 'currentDiscount' | 'inventory' | 'bestSeller' | 'editorsPick' | 'newRelease' | 'preOrder'>
>;

const FLAGS = [
  ['newRelease', 'New Release', 'bg-foreground text-background'],
  ['editorsPick', "Editor's Pick", 'bg-accent text-accent-foreground'],
  ['bestSeller', 'Best Seller', 'bg-primary text-primary-foreground'],
  ['preOrder', 'Pre-order', 'bg-success text-white'],
] as const;

const tag = 'absolute top-2 left-2 z-10 rounded-sm border border-black/20 px-2 py-1 text-base leading-5 shadow-[0_2px_4px_0_rgb(0_0_0/18%)]';

// The legacy ProductCardLandscape: cover with a discount or out-of-stock tag, flag badges, title and price.
export function BookCard({ book }: { book: BookCardBook }) {
  const title = book.title ?? 'Untitled';
  const outOfStock = (book.inventory ?? 0) <= 0;
  return (
    <Link href={`/books/${book.bookId}`} className="relative block">
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
        className={`mb-2.5 shadow-[0_2px_10px_0_rgba(0,0,0,0.16)] ${outOfStock ? 'grayscale' : ''}`}
      />
      <span className="mb-1 flex flex-wrap gap-1 text-sm leading-[18px]">
        {FLAGS.filter(([flag]) => book[flag]).map(([flag, label, colors]) => (
          <span key={flag} className={`rounded-sm px-1.5 py-0.5 text-xs ${colors}`}>
            {label}
          </span>
        ))}
      </span>
      <span className="block">{title}</span>
      <Price price={book.price} discount={book.currentDiscount} />
    </Link>
  );
}
