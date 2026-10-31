import { notFound } from 'next/navigation';

import { CmsPage, cmsPageMetadata } from '@/components/cms-page.tsx';
import { slugFromSegments } from '@/lib/paths.ts';

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props) {
  const slug = slugFromSegments((await params).slug);
  return slug ? cmsPageMetadata(slug) : {};
}

export default async function Page({ params }: Props) {
  const slug = slugFromSegments((await params).slug);
  if (!slug) notFound();
  return <CmsPage slug={slug} />;
}
