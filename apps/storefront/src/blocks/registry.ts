import { BannerBlock } from './banner.tsx';
import { CarouselBlock } from './carousel.tsx';
import { FaqBlock } from './faq.tsx';
import { FeaturedBooksBlock } from './featured-books.tsx';
import { ListingGridBlock } from './listing-grid.tsx';
import { ListingHeaderBlock } from './listing-header.tsx';
import { ProductInfoBlock } from './product-info.tsx';
import { ProductSetRowBlock } from './product-set-row.tsx';
import { RichTextBlock } from './rich-text.tsx';
import type { BlockRegistry } from './types.ts';

// CMS block `blockType` → storefront component (AGENTS.md "apps/storefront"). The template core blocks (productInfo,
// listingHeader, listingGrid) render the page's item from the block context; elsewhere they render nothing.
export const blockRegistry: BlockRegistry = {
  banner: BannerBlock,
  productSetRow: ProductSetRowBlock,
  featuredBooks: FeaturedBooksBlock,
  carousel: CarouselBlock,
  richText: RichTextBlock,
  faq: FaqBlock,
  productInfo: ProductInfoBlock,
  listingHeader: ListingHeaderBlock,
  listingGrid: ListingGridBlock,
};
