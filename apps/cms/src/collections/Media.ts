import type { CollectionConfig } from 'payload';

import { adminOnly, anyone } from '../access.ts';

// Images for CMS blocks; files go to Vercel Blob (payload.config.ts). Public to read; only admins upload (AGENTS.md
// §6: no uploads for the demo login).
export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: anyone, create: adminOnly, update: adminOnly, delete: adminOnly },
  fields: [{ name: 'alt', type: 'text', required: true }],
  upload: true,
};
