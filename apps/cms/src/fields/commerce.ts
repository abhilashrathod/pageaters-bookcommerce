import type { Field } from 'payload';

// A reference to a commerce record in the API, stored as its id only (AGENTS.md §4.3: the CMS never copies commerce
// data). A picker over the API replaces the plain input in the commerce pickers step.
export const isObjectId = (value: string | null | undefined): boolean => /^[a-f0-9]{24}$/.test(value ?? '');

export const commerceId = (name: string, kind: string): Field => ({
  name,
  type: 'text',
  required: true,
  admin: { description: `The ${kind}’s id in the API (a 24-character ObjectId).` },
  validate: (value: string | null | undefined) => isObjectId(value) || 'Must be a 24-character ObjectId',
});
