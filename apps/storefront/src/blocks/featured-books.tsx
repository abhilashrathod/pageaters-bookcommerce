import type { CmsBlockOf } from '@pageaters/cms-types';

import { BookCard } from '@/components/cards/book-card.tsx';
import { Carousel } from '@/components/carousel.tsx';
import { catalogApi } from '@/lib/api.ts';

// Books with one flag (best sellers, editor's picks, new releases, pre-orders), most popular first.
export async function FeaturedBooksBlock({ block }: { block: CmsBlockOf<'featuredBooks'> }) {
  const { docs } = await catalogApi.books.list({ list: block.list, limit: block.limit, sortBy: 'popularity', sortOrder: -1 });
  if (!docs.length) return null;
  return (
    <Carousel title={block.heading} size="book">
      {docs.map((book) => (
        <BookCard key={book._id} book={book} />
      ))}
    </Carousel>
  );
}
