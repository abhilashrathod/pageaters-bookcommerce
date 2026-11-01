import type { CmsBlock, CmsBlockOf } from '@pageaters/cms-types';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton.tsx';

import { HeroBanners } from './banner.tsx';
import { blockRegistry } from './registry.ts';
import { renderBlock } from './safe-block.ts';
import type { BlockContext, BlockRegistry } from './types.ts';

type Hero = CmsBlockOf<'banner'> & { layout: 'hero' };
const isHero = (block: CmsBlock): block is Hero => block?.blockType === 'banner' && block.layout === 'hero';

// Consecutive hero banners become one slideshow (the legacy HeroBanner); every other block stays on its own.
function groupHeroes(blocks: CmsBlock[]): (CmsBlock | Hero[])[] {
  return blocks.reduce<(CmsBlock | Hero[])[]>((items, block) => {
    const last = items.at(-1);
    if (isHero(block) && Array.isArray(last)) last.push(block);
    else items.push(isHero(block) ? [block] : block);
    return items;
  }, []);
}

// A CMS layout: each block streams on its own behind a skeleton, and a failing block drops out alone.
export function RenderBlocks({
  blocks,
  context = {},
  registry = blockRegistry,
}: {
  blocks?: CmsBlock[] | null;
  context?: BlockContext;
  registry?: BlockRegistry;
}) {
  return groupHeroes(blocks ?? []).map((item, index) =>
    Array.isArray(item) ? (
      // Only when the registry renders banners (a test registry may not).
      registry.banner ? <HeroBanners key={item[0]?.id ?? index} blocks={item} /> : null
    ) : (
      <Suspense key={item.id ?? index} fallback={<BlockSkeleton />}>
        <SafeBlock block={item} context={context} registry={registry} />
      </Suspense>
    ),
  );
}

function SafeBlock({ block, context, registry }: { block: CmsBlock; context: BlockContext; registry: BlockRegistry }) {
  return renderBlock(block, registry, context);
}

function BlockSkeleton() {
  return (
    <div className="page-container mb-9" aria-hidden>
      <Skeleton className="mb-3.5 h-7 w-48 rounded-full" />
      <Skeleton className="h-64 w-full rounded-[1rem]" />
    </div>
  );
}
