import type { CollectionConfig } from 'payload';

import { adminOnly, anyone } from '../access.ts';
import { FREE_BLOCKS } from '../blocks/free.ts';
import { PAGE_TYPES } from './page-types.ts';

// Optional additions for one commerce item (e.g. a custom hero for one collection), keyed by the item's API id. No
// override → the template alone. The id becomes a picker over the API (Phase 6 commerce pickers step).
export const Overrides: CollectionConfig = {
  slug: 'overrides',
  admin: { useAsTitle: 'itemId', defaultColumns: ['type', 'itemId', 'updatedAt'] },
  access: { read: anyone, create: adminOnly, update: adminOnly, delete: adminOnly },
  indexes: [{ fields: ['type', 'itemId'], unique: true }],
  fields: [
    { name: 'type', type: 'select', options: PAGE_TYPES, required: true },
    {
      name: 'itemId',
      type: 'text',
      required: true,
      admin: { description: 'The item’s id in the API (a 24-character ObjectId).' },
      validate: (value: string | null | undefined) => /^[a-f0-9]{24}$/.test(value ?? '') || 'Must be a 24-character ObjectId',
    },
    { name: 'layout', type: 'blocks', blocks: FREE_BLOCKS },
  ],
};
