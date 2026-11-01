import type { Book, Bundle } from '@pageaters/shared';
import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  Files,
  FileText,
  Hash,
  History,
  Languages,
  Package,
  RotateCcw,
  Ruler,
  Ship,
  Truck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Breadcrumbs } from '@/components/breadcrumbs.tsx';
import { AddToCartButton } from '@/components/cart/add-to-cart-button.tsx';
import { Badges, TagPills } from '@/components/cards/badges.tsx';
import { BookCard } from '@/components/cards/book-card.tsx';
import { CoverImage } from '@/components/cards/cover-image.tsx';
import { Price } from '@/components/cards/price.tsx';
import { ReadMore } from '@/components/read-more.tsx';
import { SectionHeading } from '@/components/section-heading.tsx';
import { ShareButton } from '@/components/share-button.tsx';

import type { BlockContext } from './types.ts';

// The legacy book page's site features (books/[id] SITE_FEATURES), green icons in two columns.
const FEATURES: [LucideIcon, string, string][] = [
  [Truck, 'Free Delivery', 'On Orders Above INR 599'],
  [Award, 'Genuine Books', 'No Piracy. No First Copies.'],
  [Wallet, 'Easy Payments', 'Cash on Delivery, Debit & Credit Cards, UPIs, Wallets'],
  [RotateCcw, 'Easy Return & Replacements', '7 Days Return Policy. No questions asked.'],
];

// Core block: the item's details with the buy box, in the legacy books/[id] and bundles/[id] layout.
export function ProductInfoBlock({ context }: { context: BlockContext }) {
  const item = context.item;
  if (item?.kind === 'book') return <BookInfo book={item.data} />;
  if (item?.kind === 'bundle') return <BundleInfo bundle={item.data} />;
  return null;
}

function Layout({ title, cover, children }: { title: string; cover: ReactNode; children: ReactNode }) {
  return (
    <>
      <Breadcrumbs items={[{ title: 'Home', href: '/' }, { title }]} />
      <section className="page-container mb-9 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div>{cover}</div>
        <div className="sm:ml-3.5">{children}</div>
      </section>
    </>
  );
}

function Cover({ src, alt, tags, width, height }: { src: string; alt: string; tags: string[]; width: number; height: number }) {
  return (
    <>
      <div className="flex justify-center">
        <div className="w-[230px] sm:w-full" style={{ maxWidth: width }}>
          <CoverImage
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes={`${width}px`}
            className="rounded-[1.5rem] border border-black/20 shadow-tag"
          />
        </div>
      </div>
      <TagPills tags={tags} className="mt-3.5 mb-3.5" />
      <div className="mb-7 flex justify-center">
        <ShareButton />
      </div>
    </>
  );
}

function Pricing({ price, discount }: { price: number; discount: number }) {
  return (
    <p className="mb-[1.25rem] text-[21px] font-semibold sm:text-[28px]">
      <Price price={price} discount={discount} />
      {discount > 0 && <span className="text-base text-success">&nbsp;({discount}% Off)</span>}
    </p>
  );
}

// The legacy info strip (Mantine Alert): green for ready to ship, cyan procurement, grape import, orange pre-order.
const TONES = {
  green: ['bg-success/10', 'text-success'],
  cyan: ['bg-cyan-50', 'text-cyan-700'],
  grape: ['bg-purple-50', 'text-purple-700'],
  orange: ['bg-orange-50', 'text-orange-700'],
} as const;

function Note({ title, icon: Icon = Package, tone = 'green', children }: { title: string; icon?: LucideIcon; tone?: keyof typeof TONES; children: ReactNode }) {
  const [background, text] = TONES[tone];
  return (
    <div className={`mb-[1.25rem] flex gap-3 rounded-[8px] p-3.5 text-sm ${background}`}>
      <Icon className={`size-6 shrink-0 ${text}`} strokeWidth={1.5} aria-hidden />
      <div>
        <p className={`font-semibold ${text}`}>{title}</p>
        <p className="whitespace-pre-line">{children}</p>
      </div>
    </div>
  );
}

// The legacy InformationBanner: a book's availability with its fulfilment message (e.g. "Fulfills in 2-3 Weeks").
function AvailabilityNote({ book }: { book: Book }) {
  switch (book.availability) {
    case 'procurement':
      return (
        <Note title="Procurement" icon={Truck} tone="cyan">
          {book.message}
        </Note>
      );
    case 'import':
      return (
        <Note title="Import" icon={Ship} tone="grape">
          {book.message}
        </Note>
      );
    case 'pre-order':
      return (
        <Note title="It's a Pre-order!" icon={History} tone="orange">
          {book.message}
        </Note>
      );
    default:
      return <Note title="Available, Ready To Ship!">Ships in 2-3 Days. Approximate delivery in 5-7 business days.</Note>;
  }
}

function Features() {
  return (
    <div className="grid sm:grid-cols-2">
      {FEATURES.map(([Icon, title, text]) => (
        <div key={title} className="mb-3 flex items-center">
          <span className="flex min-w-12 justify-center p-2">
            <Icon className="size-9 text-success" strokeWidth={1.25} aria-hidden />
          </span>
          <span className="ml-2 flex flex-col">
            <span className="font-semibold">{title}</span>
            <span>{text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

const BUY = 'mb-9 flex items-center gap-3 [&_button]:px-8 [&_button]:py-3 [&_button]:text-[17px] [&_button]:font-normal [&_button]:tracking-[-0.5px] sm:[&_button]:px-[35px] sm:[&_button]:py-3.5 sm:[&_button]:text-[21px] sm:[&_button]:tracking-[-1px]';

function BookInfo({ book }: { book: Book }) {
  const author = book.author && typeof book.author === 'object' ? book.author : undefined;
  const inStock = book.inventory > 0;
  const categories = book.categories.filter((category) => typeof category === 'object');
  const related = book.relatedBooks.filter((related) => typeof related === 'object');
  const specs: [LucideIcon, string, string | null | undefined][] = [
    [Files, 'Edition', book.version],
    [FileText, 'Pages', book.pages ? `${book.pages} Pages` : null],
    [BookOpen, 'Reading Level', book.readingLevel],
    [Languages, 'Language', book.language],
    [Hash, 'ISBN', book.ISBN],
    [Building2, 'Publication', book.publisher],
    [Calendar, 'Publication Year', book.publicationYear],
    [Ruler, 'Specs', [book.dimensions && `${book.dimensions} CM`, book.weight && `${book.weight} GRAMS`].filter(Boolean).join(' | ')],
  ];
  return (
    <>
      <Layout title={book.title} cover={<Cover src={book.poster} alt={book.title} tags={book.tags} width={300} height={450} />}>
        {book.eyebrow && <span className="mb-[0.438rem] block text-xs leading-[1.125rem] font-semibold tracking-[2px] text-primary uppercase">{book.eyebrow}</span>}
        <h1 className="text-[21px] sm:text-[28px]">
          {book.title} {book.tagline && `(${book.tagline})`}
        </h1>
        {author?.name && (
          <p className="mb-1 text-[21px] font-semibold">
            <span className="text-[#3c3c3c]">by&nbsp;</span>
            {author.authorId ? (
              <Link href={`/authors/${author.authorId}`} className="text-accent underline">
                {author.name}
              </Link>
            ) : (
              <span className="text-accent underline">{author.name}</span>
            )}
          </p>
        )}
        <Badges flags={book} className="mb-[1.25rem]" />
        <ReadMore text={book.description} />
        <Pricing price={book.price} discount={book.currentDiscount} />
        {inStock && book.type === 'book_box' ? (
          <Note title="Curate on Demand">Advance bookings are preferred. Curate on demand items can take 3-4 weeks to fulfill.</Note>
        ) : inStock ? (
          <AvailabilityNote book={book} />
        ) : null}
        <div className={BUY}>
          {!inStock && <span className="text-[17px] text-destructive sm:text-[21px]">Out of Stock</span>}
          <AddToCartButton kind={book.type === 'book_box' ? 'box' : 'book'} id={book._id} disabled={!inStock} />
        </div>
        {categories.length > 0 && (
          <p className="mb-[1.25rem]">
            <span>Categories:</span>
            {categories.map((category) => (
              <Link key={category._id} href={`/categories/${category.categoryId}`} className="ml-2 font-semibold text-accent">
                {category.title}
              </Link>
            ))}
          </p>
        )}
        <Features />
      </Layout>
      <section className="page-container mb-9">
        <SectionHeading title="Book Specifications" />
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {specs
            .filter(([, , value]) => value)
            .map(([Icon, label, value]) => (
              <div key={label} className="flex">
                <span className="inline-flex min-w-[3.25rem] items-center justify-center">
                  <Icon className="size-9" strokeWidth={1.25} aria-hidden />
                </span>
                <span className="flex flex-col p-2">
                  <dt className="text-[0.825rem]">{label}</dt>
                  <dd className="font-semibold capitalize">{value}</dd>
                </span>
              </div>
            ))}
        </dl>
      </section>
      {related.length > 0 && (
        <section className="page-container mb-9">
          <SectionHeading title="Related Books" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
            {related.map((relatedBook) => (
              <BookCard key={relatedBook._id} book={relatedBook} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function BundleInfo({ bundle }: { bundle: Bundle }) {
  const books = bundle.bundledBooks.filter((book) => typeof book === 'object');
  const inStock = bundle.inventory !== 0;
  return (
    <>
      <Layout title={bundle.title} cover={<Cover src={bundle.poster} alt={bundle.title} tags={bundle.tags} width={450} height={450} />}>
        <h1 className="mb-2 text-[21px] sm:text-[28px]">{bundle.title}</h1>
        <ReadMore text={bundle.description} />
        <Pricing price={bundle.price} discount={bundle.currentDiscount} />
        <div className={BUY}>
          {!inStock && <span className="text-[17px] text-destructive sm:text-[21px]">Out of Stock</span>}
          <AddToCartButton kind="bundle" id={bundle._id} disabled={!inStock} />
        </div>
        <Features />
      </Layout>
      {books.length > 0 && (
        <section className="page-container mb-9">
          <SectionHeading title="Books in This Bundle" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
            {books.map((book) => (
              <BookCard key={book._id} book={book} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
