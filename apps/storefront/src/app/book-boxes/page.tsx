import { BookGrid } from '@/components/book-grid.tsx';
import { ListingHeader } from '@/blocks/listing-header.tsx';
import { catalogApi } from '@/lib/api.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { parsePage } from '@/lib/paths.ts';

type Props = { searchParams: Promise<{ page?: string | string[] }> };

// The book boxes listing (legacy book-boxes/index); each box opens on /books/<id> with the Book Box template.
export const generateMetadata = () =>
  pageMetadata({
    title: 'Book Boxes',
    description: 'Curated adventures, exclusive treasures: a book and themed goodies in every box.',
    path: '/book-boxes',
  });

export default async function BookBoxesPage({ searchParams }: Props) {
  const page = parsePage((await searchParams).page);
  const boxes = await catalogApi.books.list({ type: 'book_box', page, limit: 12 }).catch(() => null);
  return (
    <main className="py-4">
      <ListingHeader
        title="Introducing Bookish Boxes!"
        description="Enjoy the surprise of discovering incredible reads and exclusive treasures in each carefully curated box."
      />
      <BookGrid books={boxes?.docs ?? []} page={page} totalPages={boxes?.totalPages ?? 0} />
    </main>
  );
}
