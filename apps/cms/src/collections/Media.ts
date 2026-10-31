import type { CollectionConfig } from 'payload';

// Images for CMS blocks; files go to Vercel Blob (payload.config.ts). Public to read.
export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  fields: [{ name: 'alt', type: 'text', required: true }],
  upload: true,
};
