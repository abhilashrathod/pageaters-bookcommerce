import type { Seo } from '@pageaters/cms-types';
import type { Metadata } from 'next';

import { cmsFetch, mediaUrl } from '@/lib/cms.ts';
import { imageSrc } from '@/lib/images.ts';
import { buildMetadata, type PageMeta } from '@/lib/metadata.ts';

export const getSeo = () => cmsFetch<Seo>('/globals/seo?depth=1', ['cms:global:seo']);

/** A route's metadata: its own title, description and image, else the SEO global's (CMS down → built-in defaults). */
export async function pageMetadata(page: PageMeta): Promise<Metadata> {
  const seo = await getSeo();
  return buildMetadata(seo, { ...page, image: imageSrc(page.image) ?? mediaUrl(seo?.image) });
}
