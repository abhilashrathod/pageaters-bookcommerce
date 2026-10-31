import type { Book, Bundle } from '@pageaters/shared';

import { AddToCartButton } from '@/components/cart/add-to-cart-button.tsx';
import { BookCard } from '@/components/cards/book-card.tsx';
import { CoverImage } from '@/components/cards/cover-image.tsx';
import { Price } from '@/components/cards/price.tsx';

import type { BlockContext } from './types.ts';

const FLAGS = [
  ['newRelease', 'New Release', 'bg-foreground text-background'],
  ['editorsPick', "Editor's Pick", 'bg-accent text-accent-foreground'],
  ['bestSeller', 'Best Seller', 'bg-primary text-primary-foreground'],
  ['preOrder', 'Pre-order', 'bg-success text-white'],
] as const;

// Core block: the item's details with the buy box (legacy books/[id] and bundles/[id]).
export function ProductInfoBlock({ context }: { context: BlockContext }) {
  const item = context.item;
  if (item?.kind === 'book') return <BookInfo book={item.data} />;
  if (item?.kind === 'bundle') return <BundleInfo bundle={item.data} />;
  return null;
}

function BuyBox({ price, discount, inStock, children }: { price: number; discount: number; inStock: boolean; children: React.ReactNode }) {
  return (
    <div className="my-6 space-y-3">
      <p className="text-2xl">
        <Price price={price} discount={discount} />
        {discount > 0 && <span className="ml-2 text-base text-success">({discount}% Off)</span>}
      </p>
      <p className={inStock ? 'text-success' : 'text-destructive'}>{inStock ? 'In stock' : 'Out of stock'}</p>
      {children}
    </div>
  );
}

function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <li key={tag} className="rounded-full bg-muted px-3 py-1 text-sm">
          {tag}
        </li>
      ))}
    </ul>
  );
}

function BookInfo({ book }: { book: Book }) {
  const author = book.author && typeof book.author === 'object' ? book.author.name : undefined;
  const inStock = book.inventory > 0;
  const details = [
    ['Publisher', book.publisher],
    ['Published', book.publicationYear],
    ['Language', book.language],
    ['Pages', book.pages ? String(book.pages) : ''],
    ['ISBN', book.ISBN],
  ].filter(([, value]) => value);
  return (
    <section className="page-container my-8 grid gap-8 md:grid-cols-[1fr_2fr]">
      <div>
        <CoverImage
          src={book.poster}
          alt={book.title}
          width={300}
          height={450}
          sizes="(min-width: 48rem) 30vw, 90vw"
          className="shadow-lg"
        />
        <Tags tags={book.tags} />
      </div>
      <div>
        {book.eyebrow && <p className="mb-2 text-sm tracking-wide text-accent uppercase">{book.eyebrow}</p>}
        <h1 className="text-3xl font-semibold">
          {book.title} {book.tagline && <span className="font-normal text-muted-foreground">({book.tagline})</span>}
        </h1>
        {author && <p className="mt-2 text-muted-foreground">by {author}</p>}
        <p className="mt-3 flex flex-wrap gap-1">
          {FLAGS.filter(([flag]) => book[flag]).map(([flag, label, colors]) => (
            <span key={flag} className={`rounded-sm px-2 py-0.5 text-sm ${colors}`}>
              {label}
            </span>
          ))}
        </p>
        <BuyBox price={book.price} discount={book.currentDiscount} inStock={inStock}>
          <AddToCartButton kind={book.type === 'book_box' ? 'box' : 'book'} id={book._id} disabled={!inStock} />
        </BuyBox>
        <p className="whitespace-pre-line">{book.description}</p>
        {details.length > 0 && (
          <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

function BundleInfo({ bundle }: { bundle: Bundle }) {
  const books = bundle.bundledBooks.filter((book) => typeof book === 'object');
  const inStock = bundle.inventory !== 0;
  return (
    <section className="page-container my-8">
      <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
        <div>
          <CoverImage
            src={bundle.poster}
            alt={bundle.title}
            width={385}
            height={385}
            sizes="(min-width: 48rem) 30vw, 90vw"
            className="shadow-lg"
          />
          <Tags tags={bundle.tags} />
        </div>
        <div>
          <h1 className="text-3xl font-semibold">{bundle.title}</h1>
          <BuyBox price={bundle.price} discount={bundle.currentDiscount} inStock={inStock}>
            <AddToCartButton kind="bundle" id={bundle._id} disabled={!inStock} />
          </BuyBox>
          <p className="whitespace-pre-line">{bundle.description}</p>
        </div>
      </div>
      {books.length > 0 && (
        <>
          <h2 className="mt-10 mb-4 text-[1.571rem]">Books in this bundle</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {books.map((book) => (
              <BookCard key={book._id} book={book} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
