import type { CmsBlockOf } from '@pageaters/cms-types';
import Image from 'next/image';

import { Breadcrumbs } from '@/components/breadcrumbs.tsx';
import { PageHeading } from '@/components/page-heading.tsx';
import { imageSrc } from '@/lib/images.ts';

import type { BlockContext } from './types.ts';

// Core block: a collection's or category's heading, with its description when the template asks for it. A collection
// gets the legacy collections/[id] banner (its poster, 80vh, the white title and tags centred near the bottom); a
// category the legacy breadcrumbs and page heading.
export function ListingHeaderBlock({ block, context }: { block: CmsBlockOf<'listingHeader'>; context: BlockContext }) {
  const item = context.item;
  const description = block.showDescription ? item?.data.description : undefined;
  if (item?.kind === 'collection') {
    const { title, poster, tags } = item.data;
    const src = imageSrc(poster);
    return (
      <>
        <section className="relative h-[50vh] bg-primary sm:h-[70vh] md:h-[80vh]">
          {src ? <Image src={src} alt="" fill priority sizes="100vw" className="object-cover" /> : null}
          <span className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(0,0,0,0.3)_-25%,transparent_100%)]" />
          <div className="absolute bottom-[5%] z-10 flex w-full flex-col items-center px-3.5">
            <h1 className="text-center text-[28px] leading-[35px] tracking-[-1px] text-white [text-shadow:3px_4px_7px_rgba(81,67,21,0.8)] sm:text-[42px] sm:leading-[56px] md:text-[52px] md:tracking-[-3px]">
              {title}
            </h1>
            {tags.length ? (
              <div className="flex flex-wrap justify-center gap-x-2">
                {tags.map((tag) => (
                  <span key={tag} className="mb-2 inline-flex rounded-[1.5rem] bg-background px-3.5 py-2 text-[0.825rem] leading-none font-semibold text-primary">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>
        <Breadcrumbs items={[{ title: 'Home', href: '/' }, { title: 'Collections', href: '/collections' }, { title }]} />
        {description ? (
          <div className="page-container">
            <p className="mb-7 max-w-3xl whitespace-pre-line">{description}</p>
          </div>
        ) : null}
      </>
    );
  }
  if (item?.kind === 'category') return <ListingHeader title={item.data.title} description={description} trail={[{ title: 'Categories', href: '/categories' }]} />;
  return null;
}

export function ListingHeader({ title, description, trail }: { title: string; description?: string; trail?: { title: string; href: string }[] }) {
  return (
    <>
      <PageHeading title={title} trail={trail} />
      {description ? (
        <div className="page-container">
          <p className="mb-7 max-w-3xl whitespace-pre-line text-muted-foreground">{description}</p>
        </div>
      ) : null}
    </>
  );
}
