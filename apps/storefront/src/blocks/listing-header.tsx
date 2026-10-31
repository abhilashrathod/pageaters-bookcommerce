import type { CmsBlockOf } from '@pageaters/cms-types';

import type { BlockContext } from './types.ts';

// Core block: a collection's or category's title, with its description when the template asks for it.
export function ListingHeaderBlock({ block, context }: { block: CmsBlockOf<'listingHeader'>; context: BlockContext }) {
  const item = context.item;
  if (item?.kind !== 'collection' && item?.kind !== 'category') return null;
  return <ListingHeader title={item.data.title} description={block.showDescription ? item.data.description : undefined} />;
}

export function ListingHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="page-container my-8">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {description && <p className="mt-3 max-w-3xl whitespace-pre-line text-muted-foreground">{description}</p>}
    </header>
  );
}
