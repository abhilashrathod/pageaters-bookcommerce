import { notFound } from 'next/navigation';

import { ItemPage } from '@/components/item-page.tsx';
import { catalogApi } from '@/lib/api.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { listingPage } from '@/lib/paths.ts';

type Props = { params: Promise<{ id: string; page?: string[] }> };

// ISR per listing page: `/…/x` is page 1 and `/…/x/2` page 2 (src/proxy.ts maps the public `?page=2` here), each
// rendered on its first visit, then served from the CDN.
export const revalidate = 3600;
export const generateStaticParams = () => [];

const getCategory = (id: string) => catalogApi.categories.detail({ id }).catch(() => notFound());

export async function generateMetadata({ params }: Props) {
  const category = await getCategory((await params).id);
  return pageMetadata({
    title: category.title,
    description: category.description,
    image: category.thumbnail,
    path: `/categories/${category.categoryId}`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { id, page: segments } = await params;
  const page = listingPage(segments) ?? notFound();
  const category = await getCategory(id);
  return <ItemPage type="category" item={{ kind: 'category', data: category }} page={page} />;
}
