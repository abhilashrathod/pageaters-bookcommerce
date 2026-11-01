import type { CollectionListItem } from '@pageaters/shared';
import Image from 'next/image';
import Link from 'next/link';

import { imageSrc } from '@/lib/images.ts';

import { CoverImage } from './cover-image.tsx';

type CardCollection = Pick<CollectionListItem, 'collectionId' | 'title' | 'poster' | 'books'>;

// The legacy CollectionCardSmall (carousels): the poster with a light top-left gradient, the white title over it and
// up to four book-cover avatars with a "+N" counter at the bottom.
export function CollectionCard({ collection }: { collection: CardCollection }) {
  // `books` may be plain IDs (not populated); only populated books with a usable cover show.
  const covers = (collection.books ?? []).flatMap((book) => (typeof book === 'object' && book && imageSrc(book.poster) ? [book] : []));
  const rest = (collection.books?.length ?? 0) - Math.min(covers.length, 4);
  const avatar = 'size-8 rounded-full object-cover object-top shadow-[0_0_0_2px_#fff] sm:size-12';
  return (
    <Link href={`/collections/${collection.collectionId}`} className="relative mb-3.5 block overflow-hidden rounded-[1rem]">
      <div className="relative h-[200px] bg-primary sm:h-[250px] md:h-[345px]">
        {imageSrc(collection.poster) ? (
          <Image src={imageSrc(collection.poster) as string} alt="" fill sizes="(min-width: 62rem) 32vw, 80vw" className="object-cover" />
        ) : null}
        <span className="absolute inset-0 bg-[linear-gradient(160deg,rgba(0,0,0,0.2)_0%,transparent_100%)]" />
      </div>
      <span className="absolute top-0 left-6 z-10 flex h-full max-w-[200px] flex-col justify-between py-6 md:left-7 md:py-7">
        <span className="text-[20px] leading-[24px] font-semibold text-white sm:text-[22px] sm:leading-[26px]">{collection.title}</span>
        <span className="flex -space-x-[5px]">
          {covers.slice(0, 4).map((book) => (
            <Image
              key={book._id}
              src={imageSrc(book.poster) as string}
              alt={book.title ?? ''}
              title={book.title ?? undefined}
              width={48}
              height={48}
              className={avatar}
            />
          ))}
          {rest > 0 && <span className={`${avatar} flex items-center justify-center bg-[#bbb] text-[0.825rem] text-white`}>+{rest}</span>}
        </span>
      </span>
    </Link>
  );
}

// The legacy CollectionCardLarge (collections listing): a bordered card, the title in light type above the poster.
export function CollectionCardLarge({ collection }: { collection: Pick<CollectionListItem, 'collectionId' | 'title' | 'poster'> & { tags?: string[] } }) {
  return (
    <Link href={`/collections/${collection.collectionId}`} className="mb-6 block rounded-[1rem] border border-[#ccc] transition-colors duration-500 hover:text-accent">
      <span className="mb-3.5 block p-3.5 sm:mb-5 sm:p-5 lg:mb-9">
        <span className="mb-1 block text-[28px] font-light tracking-[-1px]">{collection.title}</span>
        {collection.tags?.length ? <span className="block font-semibold">{collection.tags.join(', ')}</span> : null}
      </span>
      <CoverImage
        src={collection.poster}
        alt=""
        width={517}
        height={345}
        sizes="(min-width: 75rem) 32vw, (min-width: 36rem) 48vw, 100vw"
        className="h-[320px] rounded-t-none rounded-b-[1rem] sm:h-[275px] md:h-[355px] lg:h-[420px]"
      />
    </Link>
  );
}
