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

export default async function CollectionPage({ params }: Props) {
  const { id, page: segments } = await params;
  const page = listingPage(segments) ?? notFound();
  const collection = await getCollection(id);
  return <ItemPage type="collection" item={{ kind: 'collection', data: collection }} page={page} />;
}
