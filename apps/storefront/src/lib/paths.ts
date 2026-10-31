// A CMS page's path: the `home` page is the site root.
export const pageHref = (slug: string) => (slug === 'home' ? '/' : `/${slug}`);
