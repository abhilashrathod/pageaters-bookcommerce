import type { AnnouncementBar, Footer, Header, Page, Seo, Template, Theme } from '@pageaters/cms-types';

import { COLOR_TOKENS, RADIUS_DEFAULT } from '../globals/theme-tokens.ts';

// The CMS's starting content (`pnpm seed:content`): the homepage, one template per page type and the globals. Typed
// with the generated CMS types and checked by content-data.test.ts against the rules the CMS enforces on save.

type Data<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
type PageLayout = NonNullable<Page['layout']>;
type SeedPage = Pick<Page, 'title' | 'slug' | 'layout'>;

const link = (label: string, href: string) => ({ label, href, newTab: false });

/** The homepage, with one product set row per id given (the API's first sets, when it is reachable). */
export const homePage = (productSetIds: string[]): SeedPage => ({
  title: 'Home',
  slug: 'home',
  layout: [
    {
      blockType: 'banner',
      layout: 'promo',
      heading: 'Books, boxes and bundles for every reader',
      text: 'A portfolio demo store: browse the catalog, fill a cart and try the checkout. Nothing is shipped or charged.',
      link: link('Browse collections', '/collections'),
    },
    { blockType: 'featuredBooks', heading: 'Best sellers', list: 'bestSeller', limit: 12 },
    ...productSetIds.map((productSet) => ({ blockType: 'productSetRow' as const, productSet, limit: 12 })),
    { blockType: 'carousel', heading: 'Collections', source: 'collections', limit: 12 },
    { blockType: 'featuredBooks', heading: 'New releases', list: 'newRelease', limit: 12 },
    { blockType: 'carousel', heading: 'Bundles', source: 'bundles', limit: 8 },
  ] satisfies PageLayout,
});

// Listing pages: CMS pages (the storefront serves any page at its slug) with one carousel each.
const listingPage = (slug: string, title: string, source: 'collections' | 'categories' | 'bundles' | 'deals'): SeedPage => ({
  title,
  slug,
  layout: [{ blockType: 'carousel', heading: title, source, limit: 24 }],
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
    layout: [{ blockType: 'productInfo' }, { blockType: 'carousel', heading: 'More bundles', source: 'bundles', limit: 8 }],
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
      { blockType: 'carousel', heading: 'More collections', source: 'collections', limit: 8 },
    ],
  },
  {
    type: 'category',
    layout: [
      { blockType: 'listingHeader', showDescription: true },
      { blockType: 'listingGrid', pageSize: '24' },
      { blockType: 'carousel', heading: 'Other categories', source: 'categories', limit: 12 },
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
          link('Book Boxes', '/book-boxes'),
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
