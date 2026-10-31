import type { CmsBlock } from '@pageaters/cms-types';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton.tsx';

import { blockRegistry } from './registry.ts';
import { renderBlock } from './safe-block.ts';
import type { BlockContext, BlockRegistry } from './types.ts';

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
  return (blocks ?? []).map((block, index) => (
    <Suspense key={block.id ?? index} fallback={<BlockSkeleton />}>
      <SafeBlock block={block} context={context} registry={registry} />
    </Suspense>
  ));
}

function SafeBlock({ block, context, registry }: { block: CmsBlock; context: BlockContext; registry: BlockRegistry }) {
  return renderBlock(block, registry, context);
}

function BlockSkeleton() {
  return (
    <div className="page-container my-8" aria-hidden>
      <Skeleton className="mb-4 h-7 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
