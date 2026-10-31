import type { CmsBlock, CmsBlockType } from '@pageaters/cms-types';
import type { ReactNode } from 'react';

import type { BlockComponent, BlockRegistry } from './types.ts';

// One CMS block, never throwing: an unknown type or a failing component (a bad ID, the API down) renders nothing
// and logs a warning, so a CMS mistake never breaks the page. Errors in the block's own body (its data fetching)
// are caught here; its children are plain rendering.
export async function renderBlock(block: CmsBlock, registry: BlockRegistry): Promise<ReactNode> {
  const type = (block as Partial<CmsBlock> | null)?.blockType;
  // The registry's mapped type pairs each blockType with its own props; TypeScript can't follow that through an index.
  const Component = typeof type === 'string' ? (registry[type] as BlockComponent<CmsBlockType> | undefined) : undefined;
  if (!Component) {
    console.warn(`[blocks] no component for block type ${JSON.stringify(type)}; skipped`);
    return null;
  }
  try {
    return await Component({ block });
  } catch (error) {
    console.warn(`[blocks] ${type} block ${block.id ?? ''} failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
