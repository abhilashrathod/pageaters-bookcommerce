import { notFound } from 'next/navigation';

import { ItemPage } from '@/components/item-page.tsx';
import { catalogApi } from '@/lib/api.ts';
import { pageMetadata } from '@/lib/seo.ts';
import { parsePage } from '@/lib/paths.ts';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string | string[] }> };

const getCollection = (id: string) => catalogApi.collections.detail({ id }).catch(() => notFound());

export async function generateMetadata({ params }: Props) {
  const collection = await getCollection((await params).id);
  return pageMetadata({
    title: collection.title,
    description: collection.description,
    image: collection.poster,
    path: `/collections/${collection.collectionId}`,
  });
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const collection = await getCollection((await params).id);
  return <ItemPage type="collection" item={{ kind: 'collection', data: collection }} page={parsePage((await searchParams).page)} />;
}
