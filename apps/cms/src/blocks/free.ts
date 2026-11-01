import { isSafeHref } from '@pageaters/cms-types';
import { LinkFeature, lexicalEditor } from '@payloadcms/richtext-lexical';
import type { Block, Field, TextFieldSingleValidation } from 'payload';

import { commerceId } from '../fields/commerce.ts';
import { linkFields } from '../fields/link.ts';

// The blocks an editor may place anywhere (pages, templates, overrides). Each needs a storefront component in the
// block registry (AGENTS.md "apps/cms"); its `slug` is the block type the storefront switches on.

const heading: Field = { name: 'heading', type: 'text', maxLength: 80 };
const limit = (defaultValue: number): Field => ({ name: 'limit', type: 'number', min: 4, max: 24, defaultValue, required: true });

// One banner block for the five legacy banner components (hero, full-bleed, square, landscape, pre-order promo).
export const Banner: Block = {
  slug: 'banner',
  interfaceName: 'BannerBlock',
  fields: [
    {
      name: 'layout',
      type: 'select',
      required: true,
      defaultValue: 'landscape',
      options: [
        { label: 'Hero (full screen)', value: 'hero' },
        { label: 'Full bleed', value: 'full-bleed' },
        { label: 'Square', value: 'square' },
        { label: 'Landscape', value: 'landscape' },
        { label: 'Promo strip', value: 'promo' },
      ],
    },
    { ...heading, required: true },
    { name: 'text', type: 'textarea', maxLength: 240 },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Optional: without one the banner shows a plain backdrop. Consecutive hero banners play as one slideshow.' },
    },
    { name: 'link', type: 'group', admin: { description: 'Optional call to action.' }, fields: linkFields({ required: false }) },
  ],
};

export const ProductSetRow: Block = {
  slug: 'productSetRow',
  interfaceName: 'ProductSetRowBlock',
  fields: [heading, commerceId('productSet', 'product-sets'), limit(12)],
};

// A row of books from one of the catalog's own lists (the books' flags).
export const FeaturedBooks: Block = {
  slug: 'featuredBooks',
  interfaceName: 'FeaturedBooksBlock',
  fields: [
    heading,
    {
      name: 'list',
      type: 'select',
      required: true,
      defaultValue: 'bestSeller',
      options: [
        { label: 'Best sellers', value: 'bestSeller' },
        { label: 'Editors’ picks', value: 'editorsPick' },
        { label: 'New releases', value: 'newRelease' },
        { label: 'Pre-orders', value: 'preOrder' },
      ],
    },
    limit(12),
  ],
};

export const Carousel: Block = {
  slug: 'carousel',
  interfaceName: 'CarouselBlock',
  fields: [
    heading,
    {
      name: 'source',
      type: 'select',
      required: true,
      options: [
        { label: 'Collections', value: 'collections' },
        { label: 'Categories', value: 'categories' },
        { label: 'Bundles', value: 'bundles' },
        { label: 'Deals', value: 'deals' },
      ],
    },
    // A listing page shows its items as the legacy grid, under the page heading; elsewhere a row is the carousel.
    {
      name: 'display',
      type: 'select',
      required: true,
      defaultValue: 'row',
      options: [
        { label: 'Row (carousel)', value: 'row' },
        { label: 'Grid (listing page, with the page heading)', value: 'grid' },
      ],
    },
    limit(12),
  ],
};

// Rich text links obey the same rule as every other storefront href (fields/link.ts): a custom link's URL must be a
// site path or an https URL. Auto-links (URLs typed or pasted as text) are off, since they skip the field check;
// internal links may point at CMS pages only.
const safeLinkUrl: TextFieldSingleValidation = (value, { siblingData }) =>
  (siblingData as { linkType?: string }).linkType === 'internal' || isSafeHref(value) || 'Use a path starting with / or an https:// URL';

const richTextEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures.filter((feature) => feature.key !== 'link'),
    LinkFeature({
      disableAutoLinks: true,
      enabledCollections: ['pages'],
      fields: ({ defaultFields }) =>
        defaultFields.map((field) => (field.name === 'url' ? ({ ...field, validate: safeLinkUrl } as typeof field) : field)),
    }),
  ],
});

export const RichText: Block = {
  slug: 'richText',
  interfaceName: 'RichTextBlock',
  fields: [{ name: 'content', type: 'richText', required: true, editor: richTextEditor }],
};

// Questions and answers, shown as an accordion (one plain-text answer per question).
export const Faq: Block = {
  slug: 'faq',
  interfaceName: 'FaqBlock',
  fields: [
    heading,
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'question', type: 'text', required: true, maxLength: 160 },
        { name: 'answer', type: 'textarea', required: true, maxLength: 2000 },
      ],
    },
  ],
};

export const FREE_BLOCKS = [Banner, ProductSetRow, FeaturedBooks, Carousel, RichText, Faq];
