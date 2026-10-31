import type { Field } from 'payload';

import type { CommerceKind } from '../commerce-kinds.ts';

// A reference to a commerce record in the API, stored as its id only (AGENTS.md §4.3: the CMS never copies commerce
// data). The admin input is a picker over the API (components/CommercePicker.tsx); the id is checked on save.
export const isObjectId = (value: string | null | undefined): boolean => /^[a-f0-9]{24}$/.test(value ?? '');

export const commerceId = (name: string, kind: CommerceKind | 'by-type'): Field => ({
  name,
  type: 'text',
  required: true,
  admin: {
    description: 'Search the store by title and pick one; only its id is stored.',
    components: { Field: { path: '/components/CommercePicker#CommercePicker', clientProps: { kind } } },
  },
  validate: (value: string | null | undefined) => isObjectId(value) || 'Must be a 24-character ObjectId',
});
