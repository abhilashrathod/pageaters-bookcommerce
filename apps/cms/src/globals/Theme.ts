import type { Field, GlobalConfig } from 'payload';

import { adminOnly, anyone } from '../access.ts';
import { COLOR_TOKENS, RADIUS_DEFAULT, isHexColor, isRem } from './theme-tokens.ts';

// Theme tokens the storefront writes as CSS variables (`--<token>`); components read tokens, never brand colours.
// Field names are the token names with `-` as `_` (Payload field names can't hold dashes).
const colorFields: Field[] = Object.entries(COLOR_TOKENS).map(([token, value]) => ({
  name: token.replace(/-/g, '_'),
  label: `--${token}`,
  type: 'text',
  required: true,
  defaultValue: value,
  admin: { width: '33%' },
  validate: (input: string | null | undefined) => isHexColor(input) || 'A 6-digit hex colour, e.g. #ff5f25',
}));

export const Theme: GlobalConfig = {
  slug: 'theme',
  access: { read: anyone, update: adminOnly },
  fields: [
    { type: 'row', fields: colorFields },
    {
      name: 'radius',
      label: '--radius',
      type: 'text',
      required: true,
      defaultValue: RADIUS_DEFAULT,
      validate: (input: string | null | undefined) => isRem(input) || 'A length in rem, e.g. 1rem',
    },
  ],
};
