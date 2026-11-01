import { Pager } from '@/components/book-grid.tsx';
import { BookBoxCard } from '@/components/cards/book-box-card.tsx';
import { catalogApi } from '@/lib/api.ts';
import { parsePage } from '@/lib/paths.ts';
import { pageMetadata } from '@/lib/seo.ts';

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
  const boxes = await catalogApi.books.list({ type: 'book_box', page, limit: 9 }).catch(() => null);
  return (
    <main>
      <section className="page-container py-7 md:py-[70px]">
        <h1 className="jumbo-1 mb-2">
          Introducing <span className="text-accent">Bookish Boxes!</span>
        </h1>
        <p className="display-1">Enjoy the surprise of discovering incredible reads and exclusive treasures in each carefully curated box!</p>
      </section>
      <section className="page-container mb-9">
        {boxes?.docs.length ? (
          <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            {boxes.docs.map((box) => (
              <BookBoxCard key={box._id} box={box} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No book boxes here yet.</p>
        )}
        <Pager page={page} totalPages={boxes?.totalPages ?? 0} />
      </section>
    </main>
  );
}
