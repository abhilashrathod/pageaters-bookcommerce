import type { CollectionConfig } from 'payload';

import { adminOnly, anyone } from '../access.ts';
import { CORE_BLOCKS, validateCoreBlocks } from '../blocks/core.ts';
import { FREE_BLOCKS } from '../blocks/free.ts';
import { PAGE_TYPES } from './page-types.ts';

// One template per commerce page type: the layout every product (collection, category…) page renders. Its core
// blocks (product info + buy box, listing header + grid) can be moved but not removed (blocks/core.ts).
export const Templates: CollectionConfig = {
  slug: 'templates',
  admin: { useAsTitle: 'type', defaultColumns: ['type', 'updatedAt'] },
  access: { read: anyone, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'type', type: 'select', options: PAGE_TYPES, required: true, unique: true, index: true },
    {
      name: 'layout',
      type: 'blocks',
      blocks: [...CORE_BLOCKS, ...FREE_BLOCKS],
      validate: (value: unknown, { siblingData }: { siblingData: unknown }) =>
        validateCoreBlocks(value, (siblingData as { type?: string }).type),
    },
  ],
};
