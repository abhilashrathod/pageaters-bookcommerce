import type { CollectionConfig } from 'payload';

import { adminOnly, publishedOrSignedIn } from '../access.ts';
import { FREE_BLOCKS } from '../blocks/free.ts';
import { commerceId } from '../fields/commerce.ts';
import { PAGE_TYPES } from './page-types.ts';

// Optional additions for one commerce item (e.g. a custom hero for one collection), keyed by the item's API id. No
// override → the template alone. The item is picked from the API by the override's page type.
export const Overrides: CollectionConfig = {
  slug: 'overrides',
  admin: { useAsTitle: 'itemId', defaultColumns: ['type', 'itemId', 'updatedAt'] },
  access: { read: publishedOrSignedIn, create: adminOnly, update: adminOnly, delete: adminOnly },
  // Drafts and history; publishing validates (a template's core blocks included), a draft save doesn't.
  versions: { drafts: true, maxPerDoc: 25 },
  indexes: [{ fields: ['type', 'itemId'], unique: true }],
  fields: [
    { name: 'type', type: 'select', options: PAGE_TYPES, required: true },
    commerceId('itemId', 'by-type'),
    { name: 'layout', type: 'blocks', blocks: FREE_BLOCKS },
  ],
};
