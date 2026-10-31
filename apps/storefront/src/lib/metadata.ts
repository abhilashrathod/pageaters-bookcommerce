import type { Seo } from '@pageaters/cms-types';
import type { Metadata } from 'next';

// Page metadata from the CMS SEO global (pure, so node tests can load it). The demo is never indexed.

const DEFAULTS = { siteName: 'Pageaters', titleTemplate: '%s | Pageaters' };

export type PageMeta = { title?: string; description?: string | null; image?: string | null; path: string };

/** The page's full title through the SEO title template; no title → the site name alone. */
export const pageTitle = (seo: Pick<Seo, 'siteName' | 'titleTemplate'> | null | undefined, title?: string): string => {
  const { siteName, titleTemplate } = { ...DEFAULTS, ...seo };
  return title ? titleTemplate.replace('%s', title) : siteName;
};

/** A short description for a meta tag: whitespace collapsed, at most 160 characters. */
export const shortText = (text: string | null | undefined): string | undefined => {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!flat) return undefined;
  return flat.length > 160 ? `${flat.slice(0, 157)}…` : flat;
};

export const buildMetadata = (
  seo: Pick<Seo, 'siteName' | 'titleTemplate' | 'description'> | null | undefined,
  page: PageMeta,
): Metadata => {
  const title = pageTitle(seo, page.title);
  const description = shortText(page.description) ?? shortText(seo?.description);
  const images = page.image ? [page.image] : undefined;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: page.path },
    openGraph: { title, description, url: page.path, siteName: seo?.siteName ?? DEFAULTS.siteName, images, type: 'website' },
    twitter: { card: images ? 'summary_large_image' : 'summary', title, description, images },
    robots: { index: false, follow: false },
  };
};
