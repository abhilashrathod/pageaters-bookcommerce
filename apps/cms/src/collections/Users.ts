import type { CollectionConfig } from 'payload';

import { ROLES, adminOnly, adminOnlyField, adminOrSelf } from '../access.ts';

// CMS accounts (Payload auth). Only admins create, edit, delete or unlock accounts, so the demo login can change
// neither its own password nor anyone else's, nor lift the owner's failed-login lockout (Payload's default lets any
// signed-in user unlock any account). A new account (the first-user form included) starts read-only.
export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'role'] },
  auth: true,
  access: { read: adminOrSelf, create: adminOnly, update: adminOnly, delete: adminOnly, unlock: adminOnly },
  fields: [
    {
      name: 'role',
      type: 'select',
      options: [...ROLES],
      defaultValue: 'demo-readonly',
      required: true,
      saveToJWT: true,
      access: { create: adminOnlyField, update: adminOnlyField },
    },
  ],
};
