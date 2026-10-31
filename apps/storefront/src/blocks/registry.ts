import { BannerBlock } from './banner.tsx';
import { CarouselBlock } from './carousel.tsx';
import { FeaturedBooksBlock } from './featured-books.tsx';
import { ProductSetRowBlock } from './product-set-row.tsx';
import { RichTextBlock } from './rich-text.tsx';
import type { BlockRegistry } from './types.ts';

// CMS block `blockType` → storefront component (AGENTS.md "apps/storefront"). The template core blocks (productInfo,
// listingHeader, listingGrid) need the page's item and are added with the item routes.
export const blockRegistry: BlockRegistry = {
  banner: BannerBlock,
  productSetRow: ProductSetRowBlock,
  featuredBooks: FeaturedBooksBlock,
  carousel: CarouselBlock,
  richText: RichTextBlock,
};
