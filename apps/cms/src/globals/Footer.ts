import type { GlobalConfig } from 'payload';

import { adminOnly, anyone } from '../access.ts';
import { links } from '../fields/link.ts';

// The storefront footer: contact details, link columns, the legal line and the image credit.
export const Footer: GlobalConfig = {
  slug: 'footer',
  access: { read: anyone, update: adminOnly },
  fields: [
    { name: 'contact', type: 'textarea', admin: { description: 'Address and hours; line breaks are kept.' } },
    {
      name: 'columns',
      type: 'array',
      maxRows: 4,
      fields: [{ name: 'heading', type: 'text', required: true }, links('links')],
    },
    { name: 'legal', type: 'text', defaultValue: '© Pageaters. A portfolio demo — not a real store.' },
    { name: 'credit', type: 'text', required: true, defaultValue: 'Cover images via Open Library' },
  ],
};
