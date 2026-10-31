import type { CmsBlockOf } from '@pageaters/cms-types';

import { BundleCard } from '@/components/cards/bundle-card.tsx';
import { CategoryCard } from '@/components/cards/category-card.tsx';
import { CollectionCard } from '@/components/cards/collection-card.tsx';
import { DealCard } from '@/components/cards/deal-card.tsx';
import { Carousel } from '@/components/carousel.tsx';
import { catalogApi } from '@/lib/api.ts';

// A row of collections, categories, bundles or deals, in the API's default order (legacy carousels).
export async function CarouselBlock({ block }: { block: CmsBlockOf<'carousel'> }) {
  const query = { limit: block.limit };
  switch (block.source) {
    case 'collections': {
      const { docs } = await catalogApi.collections.list(query);
      return (
        docs.length > 0 && (
          <Carousel title={block.heading} size="wide">
            {docs.map((collection) => (
              <CollectionCard key={collection._id} collection={collection} />
            ))}
          </Carousel>
        )
      );
    }
    case 'categories': {
      const { docs } = await catalogApi.categories.list(query);
      return (
        docs.length > 0 && (
          <Carousel title={block.heading} size="portrait">
            {docs.map((category) => (
              <CategoryCard key={category._id} category={category} />
            ))}
          </Carousel>
        )
      );
    }
    case 'bundles': {
      const { docs } = await catalogApi.bundles.list(query);
      return (
        docs.length > 0 && (
          <Carousel title={block.heading} size="square">
            {docs.map((bundle) => (
              <BundleCard key={bundle._id} bundle={bundle} />
            ))}
          </Carousel>
        )
      );
    }
    case 'deals': {
      const { docs } = await catalogApi.deals.list(query);
      return (
        docs.length > 0 && (
          <Carousel title={block.heading} size="deal">
            {docs.map((deal) => (
              <DealCard key={deal._id} deal={deal} />
            ))}
          </Carousel>
        )
      );
    }
  }
}
