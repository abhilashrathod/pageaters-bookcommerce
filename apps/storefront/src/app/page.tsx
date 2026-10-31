import { BookCard } from '@/components/cards/book-card.tsx';
import { CategoryCard } from '@/components/cards/category-card.tsx';
import { Carousel } from '@/components/carousel.tsx';
import { catalogApi } from '@/lib/api.ts';

// Placeholder until the CMS page routes land (Phase 7 "Routes"): one row of books and one of categories, to check the
// cards and carousel against the legacy look.
export default async function HomePage() {
  const [books, categories] = await Promise.all([
    catalogApi.books.list({ list: 'bestSeller', limit: 12 }).catch(() => null),
    catalogApi.categories.list({ limit: 12 }).catch(() => null),
  ]);
  return (
    <main className="py-8">
      <Carousel title="Best sellers" size="book">
        {books?.docs.map((book) => <BookCard key={book._id} book={book} />)}
      </Carousel>
      <Carousel title="Categories" size="portrait">
        {categories?.docs.map((category) => <CategoryCard key={category._id} category={category} />)}
      </Carousel>
    </main>
  );
}
