import type { CmsBlockOf } from '@pageaters/cms-types';
import type { ReactNode } from 'react';

import { BundleCard } from '@/components/cards/bundle-card.tsx';
import { CategoryCard, CategoryCardLarge } from '@/components/cards/category-card.tsx';
import { CollectionCard, CollectionCardLarge } from '@/components/cards/collection-card.tsx';
import { DealCard } from '@/components/cards/deal-card.tsx';
import { Carousel, type CarouselSize } from '@/components/carousel.tsx';
import { PageHeading } from '@/components/page-heading.tsx';
import { catalogApi } from '@/lib/api.ts';

type Block = CmsBlockOf<'carousel'>;

// Grid columns of the legacy listing pages (collections, categories, bundles index; deals as bundles).
const GRID: Record<Block['source'], string> = {
  collections: 'grid-cols-1 xs:grid-cols-2 lg:grid-cols-3',
  categories: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6',
  bundles: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  deals: 'grid-cols-1 xs:grid-cols-2 md:grid-cols-3',
};

// A row of collections, categories, bundles or deals, in the API's default order (legacy carousels); `display: grid`
// is the legacy listing page instead: breadcrumbs, the page heading and the items in a grid of the larger cards.
export async function CarouselBlock({ block }: { block: Block }) {
  const grid = block.display === 'grid';
  const query = { limit: block.limit };
  const show = (size: CarouselSize, cards: ReactNode[]) => {
    if (!cards.length) return null;
    if (!grid) return <Carousel title={block.heading} size={size}>{cards}</Carousel>;
    return (
      <>
        {block.heading ? <PageHeading title={block.heading} /> : null}
        <section className="page-container mb-9">
          <div className={`grid gap-x-6 gap-y-2 ${GRID[block.source]}`}>{cards}</div>
        </section>
      </>
    );
  };
  switch (block.source) {
    case 'collections': {
      const { docs } = await catalogApi.collections.list(query);
      const Card = grid ? CollectionCardLarge : CollectionCard;
      return show('wide', docs.map((collection) => <Card key={collection._id} collection={collection} />));
    }
    case 'categories': {
      const { docs } = await catalogApi.categories.list(query);
      const Card = grid ? CategoryCardLarge : CategoryCard;
      return show('portrait', docs.map((category) => <Card key={category._id} category={category} />));
    }
    case 'bundles': {
      const { docs } = await catalogApi.bundles.list(query);
      return show('square', docs.map((bundle) => <BundleCard key={bundle._id} bundle={bundle} />));
    }
    case 'deals': {
      const { docs } = await catalogApi.deals.list(query);
      return show('deal', docs.map((deal) => <DealCard key={deal._id} deal={deal} />));
    }
  }
}
