import type { GlobalConfig } from 'payload';

import { adminOnly, anyone } from '../access.ts';
import { links } from '../fields/link.ts';

// The storefront header: the logo text and the navigation, in groups (the legacy menu's "Explore Store", "Help").
export const Header: GlobalConfig = {
  slug: 'header',
  access: { read: anyone, update: adminOnly },
  fields: [
    { name: 'logoText', type: 'text', required: true, defaultValue: 'Pageaters' },
    {
      name: 'navigation',
      type: 'array',
      maxRows: 6,
      fields: [{ name: 'label', type: 'text', required: true }, links('links')],
    },
  ],
};
