import Link from 'next/link';
import type { ReactNode } from 'react';

import { BookCard, type BookCardBook } from '@/components/cards/book-card.tsx';

// The legacy listing pager (Mantine Pagination, dark, round): previous / page of pages / next by `?page=`.
export function Pager({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages < 2) return null;
  const pill = 'inline-flex h-11 min-w-11 items-center justify-center rounded-full border px-4 transition-colors hover:bg-muted';
  return (
    <nav aria-label="Pages" className="flex items-center justify-center gap-3 py-9">
      {page > 1 ? (
        <Link href={`?page=${page - 1}`} className={pill}>
          Previous
        </Link>
      ) : null}
      <span className={`${pill} border-primary bg-primary text-primary-foreground hover:bg-primary`} aria-current="page">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={`?page=${page + 1}`} className={pill}>
          Next
        </Link>
      ) : null}
    </nav>
  );
}

// A paginated grid of book cards (legacy col-6 / col-md-3 / col-xxl-2 rows).
export function BookGrid({ books, page, totalPages, empty }: { books: (BookCardBook & { _id: string })[]; page: number; totalPages: number; empty?: ReactNode }) {
  if (!books.length) return <div className="page-container mb-9">{empty ?? <p className="text-muted-foreground">No books here yet.</p>}</div>;
  return (
    <section className="page-container mb-9">
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
        {books.map((book) => (
          <BookCard key={book._id} book={book} />
        ))}
      </div>
      <Pager page={page} totalPages={totalPages} />
    </section>
  );
}
