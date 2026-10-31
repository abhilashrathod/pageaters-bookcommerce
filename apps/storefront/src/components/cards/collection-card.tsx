import type { CollectionListItem } from '@pageaters/shared';
import Image from 'next/image';
import Link from 'next/link';

import { imageSrc } from '@/lib/images.ts';

import { CoverImage } from './cover-image.tsx';

// The legacy CollectionCardSmall: poster, title and up to four book covers with a "+N" counter.
export function CollectionCard({ collection }: { collection: Pick<CollectionListItem, 'collectionId' | 'title' | 'poster' | 'books'> }) {
  // `books` may be plain IDs (not populated); only populated books with a usable cover show.
  const covers = (collection.books ?? []).flatMap((book) => (typeof book === 'object' && book && imageSrc(book.poster) ? [book] : []));
  const rest = (collection.books?.length ?? 0) - Math.min(covers.length, 4);
  return (
    <Link href={`/collections/${collection.collectionId}`} className="block">
      <CoverImage src={collection.poster} alt={collection.title} width={517} height={345} sizes="(min-width: 62rem) 32vw, 80vw" className="mb-3" />
      <span className="mb-2 block font-semibold">{collection.title}</span>
      <span className="flex -space-x-2">
        {covers.slice(0, 4).map((book) => (
          <Image
            key={book._id}
            src={imageSrc(book.poster) as string}
            alt={book.title ?? ''}
            title={book.title ?? undefined}
            width={48}
            height={48}
            className="size-12 rounded-full border-2 border-background object-cover"
          />
        ))}
        {rest > 0 && (
          <span className="flex size-12 items-center justify-center rounded-full border-2 border-background bg-muted text-sm">+{rest}</span>
        )}
      </span>
    </Link>
  );
}
