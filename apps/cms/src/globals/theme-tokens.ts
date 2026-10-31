// The storefront's theme tokens: the `:root` variables of packages/config/tailwind/theme.css, which the Theme global
// overrides at runtime. Defaults are that file's values (globals.test.ts keeps them in step).
export const COLOR_TOKENS = {
  background: '#ffffff',
  foreground: '#151414',
  primary: '#222222',
  'primary-foreground': '#ffffff',
  accent: '#ff5f25',
  'accent-foreground': '#ffffff',
  muted: '#f1f1f1',
  'muted-foreground': '#717171',
  border: '#dddddd',
  input: '#dddddd',
  ring: '#ff5f25',
  destructive: '#e55039',
  success: '#009432',
} as const;

export const RADIUS_DEFAULT = '1rem';

export const isHexColor = (value: string | null | undefined): boolean => /^#[0-9a-f]{6}$/i.test(value ?? '');
export const isRem = (value: string | null | undefined): boolean => /^(0|\d{1,2}(\.\d{1,3})?rem)$/.test(value ?? '');
