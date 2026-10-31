import type { CmsBlockOf } from '@pageaters/cms-types';
import { isSafeHref } from '@pageaters/cms-types';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button.tsx';
import { mediaUrl } from '@/lib/cms.ts';
import { cn } from '@/lib/utils.ts';

type Banner = CmsBlockOf<'banner'>;

// The five legacy banners in one block (sizes from HeroBanner, GiantFullBleedBanner, GiantSquareBanner,
// LandscapeBanner and PreOrderBanner). Promo uses theme tokens where the legacy one had a fixed purple gradient.
const FRAME: Record<Banner['layout'], string> = {
  hero: 'relative h-[33vh] sm:h-[80vh]',
  'full-bleed': 'relative h-[450px] sm:h-[600px] md:h-[800px]',
  square: 'page-container relative my-8 h-[450px] sm:h-[600px] md:h-[700px] [&>div]:rounded-lg',
  landscape: 'page-container my-8 grid items-center gap-6 sm:grid-cols-2',
  promo: 'page-container my-8',
};

export function BannerBlock({ block }: { block: Banner }) {
  const src = mediaUrl(block.image);
  const alt = (typeof block.image === 'object' && block.image?.alt) || block.heading;
  const href = block.link?.href && isSafeHref(block.link.href) ? block.link.href : null;
  const cta = href && block.link?.label && (
    <Button asChild variant="accent" size="lg" className="mt-4">
      <Link href={href} {...(block.link?.newTab && { target: '_blank', rel: 'noopener noreferrer' })}>
        {block.link.label}
      </Link>
    </Button>
  );

  if (block.layout === 'promo') {
    return (
      <section className={FRAME.promo}>
        <div className="flex min-h-[380px] flex-col justify-center gap-2 overflow-hidden rounded-lg bg-primary px-8 py-10 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-[1.8rem] leading-[2.086rem] sm:text-[2.8rem] sm:leading-[3.086rem] md:text-[3.6rem] md:leading-[3.857rem]">{block.heading}</h2>
            {block.text && <p className="mt-3 text-lg opacity-90">{block.text}</p>}
            {cta}
          </div>
          {src && <Image src={src} alt={alt} width={380} height={380} className="h-[260px] w-auto rounded-md object-cover sm:h-[300px]" />}
        </div>
      </section>
    );
  }

  if (block.layout === 'landscape') {
    return (
      <section className={FRAME.landscape}>
        {src && <Image src={src} alt={alt} width={776} height={350} sizes="(min-width: 48rem) 50vw, 100vw" className="h-[200px] w-full rounded-md object-cover sm:h-[350px]" />}
        <div>
          <h2 className="text-[1.6rem] leading-tight">{block.heading}</h2>
          {block.text && <p className="mt-2 text-muted-foreground">{block.text}</p>}
          {cta}
        </div>
      </section>
    );
  }

  // hero, full-bleed and square: text over the image, on a gradient so it stays readable.
  return (
    <section className={FRAME[block.layout]}>
      <div className="relative h-full overflow-hidden bg-primary">
        {src && <Image src={src} alt={alt} fill priority={block.layout === 'hero'} sizes="100vw" className="object-cover" />}
        <div
          className={cn(
            'absolute inset-0 flex flex-col p-6 text-white sm:p-12',
            block.layout === 'full-bleed'
              ? 'items-center justify-center bg-black/40 text-center'
              : 'justify-end bg-gradient-to-t from-black/60 to-transparent',
          )}
        >
          <h2
            className={
              block.layout === 'full-bleed'
                ? 'text-[2.5rem] leading-[2.5rem] sm:text-[4rem] sm:leading-[4rem] md:text-[5rem] md:leading-[5.286rem]'
                : 'max-w-3xl text-[2rem] leading-[2.5rem] sm:text-[3rem] sm:leading-[4rem] md:text-[3.714rem]'
            }
          >
            {block.heading}
          </h2>
          {block.text && <p className="mt-3 max-w-2xl text-lg">{block.text}</p>}
          {cta && <div>{cta}</div>}
        </div>
      </div>
    </section>
  );
}
