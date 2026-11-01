import type { AnnouncementBar, Footer, Header, Page, Seo, Template, Theme } from '@pageaters/cms-types';

import { COLOR_TOKENS, RADIUS_DEFAULT } from '../globals/theme-tokens.ts';

// The CMS's starting content (`pnpm seed:content`): the homepage, one template per page type and the globals. Typed
// with the generated CMS types and checked by content-data.test.ts against the rules the CMS enforces on save.

type Data<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
type PageLayout = NonNullable<Page['layout']>;
type SeedPage = Pick<Page, 'title' | 'slug' | 'layout'>;

const link = (label: string, href: string) => ({ label, href, newTab: false });

type HomeBlock = PageLayout[number];

const hero = (heading: string, text: string, label: string, href: string): HomeBlock => ({
  blockType: 'banner',
  layout: 'hero',
  heading,
  text,
  link: link(label, href),
});

// Stand-ins for missing product set rows (fewer sets in the API, or the API unreachable at seed time).
const FALLBACK_ROWS: HomeBlock[] = [
  { blockType: 'featuredBooks', heading: 'Best sellers', list: 'bestSeller', limit: 12 },
  { blockType: 'featuredBooks', heading: 'New releases', list: 'newRelease', limit: 12 },
  { blockType: 'featuredBooks', heading: 'Editors’ picks', list: 'editorsPick', limit: 12 },
];

/** How many product set rows the homepage holds (the legacy home had seven). */
export const HOME_ROWS = 7;

/**
 * The homepage in the legacy order (pages/index.tsx): the hero slideshow (consecutive hero banners), categories,
 * product rows, "Spectacular Bundles", more rows, "Spotlight Collections", rows, the "Try Bookish Box" square banner,
 * a row and the "Try Mystery Box" square banner. One product set row per id given (up to seven); missing rows fall
 * back to the catalog's featured lists. Banners have no image: the owner uploads them in the CMS.
 */
export const homePage = (productSetIds: string[]): SeedPage => {
  const fallbacks = [...FALLBACK_ROWS];
  const rows: HomeBlock[] = Array.from({ length: HOME_ROWS }, (_, index) => {
    const productSet = productSetIds[index];
    return productSet ? { blockType: 'productSetRow' as const, productSet, limit: 12 } : fallbacks.shift();
  }).filter((row): row is HomeBlock => Boolean(row));
  const take = (count: number) => rows.splice(0, count);
  return {
    title: 'Home',
    slug: 'home',
    layout: [
      hero('Pageaters: India’s most loved bookstore!', 'Novels • Literature • Self-Help', 'Explore', '/collections'),
      hero(
        'Introducing Bookish Boxes!',
        'A gorgeous book and themed, exclusive goodies in every curated box.',
        'Learn More',
        '/book-boxes',
      ),
      hero('Spectacular Bundles', 'Book sets that are high in value and low in price.', 'Shop Bundles', '/bundles'),
      { blockType: 'carousel', heading: 'Categories', source: 'categories', display: 'row', limit: 24 },
      ...take(2),
      { blockType: 'carousel', heading: 'Spectacular Bundles', source: 'bundles', display: 'row', limit: 12 },
      ...take(2),
      { blockType: 'carousel', heading: 'Spotlight Collections', source: 'collections', display: 'row', limit: 10 },
      ...take(2),
      { blockType: 'banner', layout: 'square', heading: 'Try Bookish Box', link: link('Learn More', '/book-boxes') },
      ...take(1),
      // The rebuild has no mystery box page: the boxes are on /book-boxes.
      { blockType: 'banner', layout: 'square', heading: 'Try Mystery Box', link: link('Buy Now', '/book-boxes') },
    ] satisfies PageLayout,
  };
};

// Listing pages: CMS pages (the storefront serves any page at its slug) with one grid each (the legacy index pages).
const listingPage = (slug: string, title: string, source: 'collections' | 'categories' | 'bundles' | 'deals'): SeedPage => ({
  title,
  slug,
  layout: [{ blockType: 'carousel', heading: title, source, display: 'grid', limit: 24 }],
});

// A rich text block of plain paragraphs (Lexical's JSON).
const paragraphs = (...texts: string[]): PageLayout[number] => ({
  blockType: 'richText',
  content: {
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: texts.map((text) => ({
        type: 'paragraph',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        textStyle: '',
        children: [{ type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' }],
      })),
    },
  },
});

const DEMO_NOTE = 'Pageaters is a portfolio demo, not a real store: no real orders, payments or deliveries.';

const infoPage = (slug: string, title: string, ...texts: string[]): SeedPage => ({
  title,
  slug,
  layout: [paragraphs(...texts, DEMO_NOTE)],
});

/** Every page but the homepage: the listings and the help and legal pages the header and footer link to. */
export const pages: SeedPage[] = [
  listingPage('collections', 'Collections', 'collections'),
  listingPage('categories', 'Categories', 'categories'),
  listingPage('bundles', 'Bundles', 'bundles'),
  listingPage('deals', 'Deals', 'deals'),
  infoPage('contact', 'Contact', 'Questions about the demo? Open an issue on the project’s repository.'),
  infoPage('shipping', 'Shipping', 'Orders on this demo go through a mock courier: nothing is packed or delivered.'),
  infoPage('cancellation', 'Cancellation', 'An order can be cancelled until it ships; store credit used on it is not returned.'),
  infoPage('privacy-policy', 'Privacy policy', 'The demo keeps only what you enter while trying it, and clears visitor data every week.'),
  infoPage('terms-and-conditions', 'Terms and conditions', 'Use the demo to look around and try the checkout in test mode.'),
];

export const templates: Pick<Template, 'type' | 'layout'>[] = [
  {
    type: 'product',
    layout: [{ blockType: 'productInfo' }, { blockType: 'featuredBooks', heading: 'Readers also loved', list: 'bestSeller', limit: 8 }],
  },
  {
    type: 'bundle',
    layout: [
      { blockType: 'productInfo' },
      { blockType: 'carousel', heading: 'Suggested Bundles', source: 'bundles', display: 'row', limit: 8 },
    ],
  },
  {
    type: 'book-box',
    layout: [{ blockType: 'productInfo' }, { blockType: 'featuredBooks', heading: 'Editors’ picks', list: 'editorsPick', limit: 8 }],
  },
  {
    type: 'collection',
    layout: [
      { blockType: 'listingHeader', showDescription: true },
      { blockType: 'listingGrid', pageSize: '24' },
      { blockType: 'carousel', heading: 'More collections', source: 'collections', display: 'row', limit: 8 },
    ],
  },
  {
    type: 'category',
    layout: [
      { blockType: 'listingHeader', showDescription: true },
      { blockType: 'listingGrid', pageSize: '24' },
      { blockType: 'carousel', heading: 'Other categories', source: 'categories', display: 'row', limit: 12 },
    ],
  },
];

const theme = {
  ...(Object.fromEntries(Object.entries(COLOR_TOKENS).map(([token, value]) => [token.replace(/-/g, '_'), value])) as Omit<
    Data<Theme>,
    'radius'
  >),
  radius: RADIUS_DEFAULT,
};

// The legacy storefront's menu and footer pages.
export const globals: {
  header: Data<Header>;
  footer: Data<Footer>;
  'announcement-bar': Data<AnnouncementBar>;
  theme: Data<Theme>;
  seo: Data<Seo>;
} = {
  header: {
    logoText: 'Pageaters',
    navigation: [
      {
        label: 'Explore Store',
        links: [
          link('Bookish Box', '/book-boxes'),
          link('Categories', '/categories'),
          link('Collections', '/collections'),
          link('Bundles', '/bundles'),
          link('Deals', '/deals'),
        ],
      },
      { label: 'Help', links: [link('Contact', '/contact')] },
    ],
  },
  footer: {
    contact: 'Pageaters Demo Warehouse\nGandhinagar, Gujarat\nA portfolio demo: no real orders, payments or deliveries.',
    columns: [
      { heading: 'Shop', links: [link('Collections', '/collections'), link('Bundles', '/bundles'), link('Deals', '/deals')] },
      {
        heading: 'Help',
        links: [link('Shipping', '/shipping'), link('Cancellation', '/cancellation'), link('Contact', '/contact')],
      },
      { heading: 'Legal', links: [link('Privacy policy', '/privacy-policy'), link('Terms', '/terms-and-conditions')] },
    ],
    legal: '© Pageaters. A portfolio demo — not a real store.',
    credit: 'Cover images via Open Library',
  },
  'announcement-bar': {
    enabled: true,
    message: 'Demo store: fill a cart and try the checkout — no real payment is taken.',
    link: link('Start browsing', '/collections'),
  },
  theme,
  seo: {
    siteName: 'Pageaters',
    titleTemplate: '%s | Pageaters',
    description: 'A portfolio demo bookstore: browse books, bundles and collections.',
  },
};
