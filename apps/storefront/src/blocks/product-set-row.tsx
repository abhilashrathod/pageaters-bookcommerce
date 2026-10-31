import type { CmsBlockOf } from '@pageaters/cms-types';

import { BookCard } from '@/components/cards/book-card.tsx';
import { Carousel } from '@/components/carousel.tsx';
import { catalogApi } from '@/lib/api.ts';

// A hand-picked product set as a row of books (legacy ProductSets); the heading defaults to the set's title.
export async function ProductSetRowBlock({ block }: { block: CmsBlockOf<'productSetRow'> }) {
  const set = await catalogApi.productSets.detail({ id: block.productSet });
  const books = set.products.filter((book) => book !== null).slice(0, block.limit);
  if (!books.length) return null;
  return (
    <Carousel title={block.heading || set.title} size="book">
      {books.map((book) => (
        <BookCard key={book._id} book={book} />
      ))}
    </Carousel>
  );
}
