import type { CollectionConfig } from 'payload';

import { adminOnly, anyone } from '../access.ts';
import { PAGE_TYPES } from './page-types.ts';

// One template per commerce page type: the layout every product (collection, category…) page renders. Its core
// blocks (product info + buy box, listing header + grid) are locked with the block configs (Phase 6 blocks step).
export const Templates: CollectionConfig = {
  slug: 'templates',
  admin: { useAsTitle: 'type', defaultColumns: ['type', 'updatedAt'] },
  access: { read: anyone, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'type', type: 'select', options: PAGE_TYPES, required: true, unique: true, index: true },
    { name: 'layout', type: 'blocks', blocks: [] },
  ],
};
