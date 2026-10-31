import { draftMode } from 'next/headers';
import { notFound } from 'next/navigation';

import { renderPreview } from '@/app/preview/actions.tsx';
import { RenderBlocks } from '@/blocks/render-blocks.tsx';
import { LivePreview } from '@/components/live-preview.tsx';
import { env } from '@/env.ts';
import { getOverride, isPageType } from '@/lib/content.ts';

type Props = { params: Promise<{ type: string; itemId: string }> };

// Live preview of an override (CMS draft mode only): its own blocks, which the item page shows after the template's.
export default async function OverridePreview({ params }: Props) {
  const { type, itemId } = await params;
  if (!isPageType(type) || !(await draftMode()).isEnabled) notFound();
  const layout = (await getOverride(type, itemId))?.layout ?? [];
  return (
    <main className="py-4">
      <p className="page-container text-sm text-muted-foreground">Override blocks: on the item page they follow the template.</p>
      <LivePreview initialData={{ layout }} serverURL={env.CMS_URL} render={renderPreview.bind(null, null)}>
        <RenderBlocks blocks={layout} />
      </LivePreview>
    </main>
  );
}
