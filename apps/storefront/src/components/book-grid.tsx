import Link from 'next/link';

import { BookCard, type BookCardBook } from '@/components/cards/book-card.tsx';

// A paginated grid of book cards; pages link by `?page=` on the current path.
export function BookGrid({ books, page, totalPages }: { books: (BookCardBook & { _id: string })[]; page: number; totalPages: number }) {
  if (!books.length) return <p className="page-container my-8 text-muted-foreground">No books here yet.</p>;
  return (
    <section className="page-container my-8">
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6">
        {books.map((book) => (
          <BookCard key={book._id} book={book} />
        ))}
      </div>
      {totalPages > 1 && (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-6">
          {page > 1 ? <Link href={`?page=${page - 1}`}>Previous</Link> : <span />}
          <span>
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? <Link href={`?page=${page + 1}`}>Next</Link> : <span />}
        </nav>
      )}
    </section>
  );
}
