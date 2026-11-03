import { notFound } from 'next/navigation';

import { ItemPage } from '@/components/item-page.tsx';
import { catalogApi } from '@/lib/api.ts';
import { pageMetadata } from '@/lib/seo.ts';

type Props = { params: Promise<{ id: string }> };

// ISR: rendered on the first visit, then served from the CDN; catalog data refreshes hourly, a CMS publish at once.
export const revalidate = 3600;
export const generateStaticParams = () => [];

const getBook = (id: string) => catalogApi.books.detail({ id }).catch(() => notFound());

export async function generateMetadata({ params }: Props) {
  const book = await getBook((await params).id);
  return pageMetadata({ title: book.title, description: book.description, image: book.poster, path: `/books/${book.bookId}` });
}

export default async function BookPage({ params }: Props) {
  const book = await getBook((await params).id);
  return <ItemPage type={book.type === 'book_box' ? 'book-box' : 'product'} item={{ kind: 'book', data: book }} />;
}
