import { draftMode } from 'next/headers';
import { notFound } from 'next/navigation';

import { renderPreview } from '@/app/preview/actions.tsx';
import { RenderBlocks } from '@/blocks/render-blocks.tsx';
import { LivePreview } from '@/components/live-preview.tsx';
import { env } from '@/env.ts';
import { getPage } from '@/lib/content.ts';
import { pageHref } from '@/lib/paths.ts';
import { pageMetadata } from '@/lib/seo.ts';

/** A CMS page's metadata: its title (the homepage shows the site name alone), the SEO global's description and image. */
export async function cmsPageMetadata(slug: string) {
  const page = await getPage(slug);
  return pageMetadata({ title: slug === 'home' ? undefined : page?.title, path: pageHref(slug) });
}

// A published CMS page by slug. Unknown slug → 404; the CMS unreachable → 404 too, except the homepage, which shows
// an empty shell rather than a 404 at the site root. In draft mode (CMS live preview) the editor's data renders
// instead, so a page never published can be previewed too.
export async function CmsPage({ slug }: { slug: string }) {
  const [page, draft] = await Promise.all([getPage(slug), draftMode()]);
  const blocks = <RenderBlocks blocks={page?.layout} />;
  if (draft.isEnabled) {
    return (
      <main className="py-4">
        <LivePreview initialData={{ layout: page?.layout ?? [] }} serverURL={env.CMS_URL} render={renderPreview.bind(null, null)}>
          {blocks}
        </LivePreview>
      </main>
    );
  }
  if (!page && !(slug === 'home' && page === undefined)) notFound();
  return <main className="py-4">{blocks}</main>;
}
