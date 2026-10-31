import type { Theme } from '@pageaters/cms-types';

// The Theme global's fields, written as `--<token>` CSS variables (field `primary_foreground` → `--primary-foreground`).
const COLOR_FIELDS = [
  'background',
  'foreground',
  'primary',
  'primary_foreground',
  'accent',
  'accent_foreground',
  'muted',
  'muted_foreground',
  'border',
  'input',
  'ring',
  'destructive',
  'success',
] as const satisfies readonly (keyof Theme)[];

const HEX = /^#[0-9a-f]{6}$/i;
const REM = /^\d+(\.\d+)?rem$/;

// A `:root { … }` rule overriding the defaults in @pageaters/config/tailwind/theme.css. The CMS validates these values
// already; anything that isn't a plain hex colour or rem length is dropped again here, since it lands in a <style> tag.
export function themeCss(theme: Partial<Theme> | null): string {
  if (!theme) return '';
  const vars = COLOR_FIELDS.filter((field) => HEX.test(theme[field] ?? '')).map(
    (field) => `--${field.replace(/_/g, '-')}:${theme[field]}`,
  );
  if (REM.test(theme.radius ?? '')) vars.push(`--radius:${theme.radius}`);
  return vars.length ? `:root{${vars.join(';')}}` : '';
}
