import type { CollectionConfig } from 'payload';

import { adminOnly, anyone } from '../access.ts';

// Free-form block pages addressed by slug: the homepage (`home`) and campaign landing pages. Blocks are added to
// `layout` with the block configs (Phase 6 blocks step).
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'updatedAt'] },
  access: { read: anyone, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'The page’s path: `home` is the homepage; lowercase letters, digits and dashes.' },
      validate: (value: string | null | undefined) =>
        /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value ?? '') || 'Use lowercase letters, digits and single dashes',
    },
    { name: 'layout', type: 'blocks', blocks: [] },
  ],
};
