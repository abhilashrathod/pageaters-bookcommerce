import { notFound } from 'next/navigation';

import { ItemPage } from '@/components/item-page.tsx';
import { catalogApi } from '@/lib/api.ts';
import { pageMetadata } from '@/lib/seo.ts';

type Props = { params: Promise<{ id: string }> };

// ISR: rendered on the first visit, then served from the CDN; catalog data refreshes hourly, a CMS publish at once.
export const revalidate = 3600;
export const generateStaticParams = () => [];

const getBundle = (id: string) => catalogApi.bundles.detail({ id }).catch(() => notFound());

export async function generateMetadata({ params }: Props) {
  const bundle = await getBundle((await params).id);
  return pageMetadata({ title: bundle.title, description: bundle.description, image: bundle.poster, path: `/bundles/${bundle.bundleId}` });
}

export default async function BundlePage({ params }: Props) {
  const bundle = await getBundle((await params).id);
  return <ItemPage type="bundle" item={{ kind: 'bundle', data: bundle }} />;
}
