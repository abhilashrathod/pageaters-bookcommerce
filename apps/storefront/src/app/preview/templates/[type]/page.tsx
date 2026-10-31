import { draftMode } from 'next/headers';
import { notFound } from 'next/navigation';

import { renderPreview } from '@/app/preview/actions.tsx';
import { RenderBlocks } from '@/blocks/render-blocks.tsx';
import { LivePreview } from '@/components/live-preview.tsx';
import { env } from '@/env.ts';
import { getTemplate, isPageType, itemLayout } from '@/lib/content.ts';
import { sampleItem } from '@/lib/sample-item.ts';

type Props = { params: Promise<{ type: string }> };

// Live preview of a template (CMS draft mode only), shown with the catalog's first item of that type.
export default async function TemplatePreview({ params }: Props) {
  const { type } = await params;
  if (!isPageType(type) || !(await draftMode()).isEnabled) notFound();
  const [template, item] = await Promise.all([getTemplate(type), sampleItem(type)]);
  const layout = itemLayout(type, template, null);
  return (
    <main className="py-4">
      <LivePreview initialData={{ layout }} serverURL={env.CMS_URL} render={renderPreview.bind(null, type)}>
        <RenderBlocks blocks={layout} context={{ item }} />
      </LivePreview>
    </main>
  );
}
