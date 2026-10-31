import { notFound } from 'next/navigation';

import { ItemPage } from '@/components/item-page.tsx';
import { catalogApi } from '@/lib/api.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { parsePage } from '@/lib/paths.ts';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string | string[] }> };

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

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await getCategory((await params).id);
  return <ItemPage type="category" item={{ kind: 'category', data: category }} page={parsePage((await searchParams).page)} />;
}
