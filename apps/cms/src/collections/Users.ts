import type { CollectionConfig } from 'payload';

// CMS editors (Payload auth). Roles (admin, demo read-only) come with the collections step.
export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email' },
  auth: true,
  fields: [],
};
