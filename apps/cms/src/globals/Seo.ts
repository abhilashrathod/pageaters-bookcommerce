import type { GlobalConfig } from 'payload';

import { adminOnly, anyone } from '../access.ts';

// Site-wide SEO defaults; a page's own title fills `%s` in the template.
export const Seo: GlobalConfig = {
  slug: 'seo',
  label: 'SEO defaults',
  access: { read: anyone, update: adminOnly },
  fields: [
    { name: 'siteName', type: 'text', required: true, defaultValue: 'Pageaters' },
    {
      name: 'titleTemplate',
      type: 'text',
      required: true,
      defaultValue: '%s | Pageaters',
      validate: (value: string | null | undefined) => (value ?? '').includes('%s') || 'Must contain %s',
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 160,
      defaultValue: 'A portfolio demo bookstore: browse books, bundles and collections.',
    },
    { name: 'image', type: 'upload', relationTo: 'media', admin: { description: 'Default share image (1200×630).' } },
  ],
};
