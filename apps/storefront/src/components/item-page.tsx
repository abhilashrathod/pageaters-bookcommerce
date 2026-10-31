import { RenderBlocks } from '@/blocks/render-blocks.tsx';
import type { PageItem } from '@/blocks/types.ts';
import { getOverride, getTemplate, itemLayout, type PageType } from '@/lib/content.ts';

// An item page: its page type's template, then the item's override blocks (if any), with the item in context.
export async function ItemPage({ type, item, page }: { type: PageType; item: PageItem; page?: number }) {
  const [template, override] = await Promise.all([getTemplate(type), getOverride(type, item.data._id)]);
  return (
    <main className="py-4">
      <RenderBlocks blocks={itemLayout(type, template, override)} context={{ item, page }} />
    </main>
  );
}
