// The commerce records a CMS field can point at (blocks, overrides), by picker kind. Shared by the server endpoint
// (endpoints/commerce.ts) and the admin picker (components/CommercePicker.tsx), so it imports nothing server-only.
export const COMMERCE_KINDS = ['product-sets', 'collections', 'categories', 'bundles', 'books', 'book-boxes'] as const;
export type CommerceKind = (typeof COMMERCE_KINDS)[number];

export const isCommerceKind = (value: unknown): value is CommerceKind => COMMERCE_KINDS.includes(value as CommerceKind);

/** The picker kind for an override's page type (collections/Overrides.ts). */
export const KIND_BY_PAGE_TYPE: Record<string, CommerceKind> = {
  product: 'books',
  'book-box': 'book-boxes',
  bundle: 'bundles',
  collection: 'collections',
  category: 'categories',
};

export type CommerceOption = { id: string; label: string };
