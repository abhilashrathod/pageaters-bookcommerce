import { isSafeHref } from '@pageaters/cms-types';
import type { Field, TextFieldSingleValidation } from 'payload';

// A storefront link: a site path (`/collections/…`) or an https URL. Anything else (`javascript:`, `http:`, `//host`,
// and any `\`, which browsers read as `/`, so `/\host` would leave the site) is refused, since the storefront renders
// it as an `href`. The rule itself (`isSafeHref`) lives in @pageaters/cms-types, shared with the storefront.

// An optional link's label: required as soon as the link has an href (a link without text is unusable).
const labelForHref: TextFieldSingleValidation = (value, { siblingData }) =>
  Boolean(value) || !(siblingData as { href?: string }).href || 'A link needs a label';

/** A link's fields; an optional link may be left empty, but a filled-in href must still be safe. */
export const linkFields = ({ required = true } = {}): Field[] => [
  { name: 'label', type: 'text', required, ...(!required && { validate: labelForHref }) },
  {
    name: 'href',
    type: 'text',
    required,
    admin: { description: 'A site path such as /collections, or a full https:// URL.' },
    validate: (value: string | null | undefined) =>
      (!required && !value) || isSafeHref(value) || 'Use a path starting with / or an https:// URL',
  },
  { name: 'newTab', type: 'checkbox', defaultValue: false },
];

/** A list of links, e.g. one navigation group or footer column. */
export const links = (name: string, maxRows = 10): Field => ({ name, type: 'array', maxRows, fields: linkFields() });
