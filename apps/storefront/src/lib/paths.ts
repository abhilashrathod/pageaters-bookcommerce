// A CMS page's path: the `home` page is the site root.
export const pageHref = (slug: string) => (slug === 'home' ? '/' : `/${slug}`);

/** The CMS page slug for a catch-all route's segments; `home` is served only at `/`, so `/home` has none. */
export const slugFromSegments = (segments: string[]): string | null => {
  const slug = segments.join('/');
  return slug && slug !== 'home' ? slug : null;
};

/** A listing's `?page=`: a positive whole number, anything else is page 1. */
export const parsePage = (value: string | string[] | undefined): number => {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 0 ? page : 1;
};
