import type { CmsBlockOf } from '@pageaters/cms-types';
import { isSafeHref } from '@pageaters/cms-types';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { HeroSlideshow, type HeroSlide } from '@/components/hero-slideshow.tsx';
import { Button } from '@/components/ui/button.tsx';
import { mediaUrl } from '@/lib/cms.ts';

type Banner = CmsBlockOf<'banner'>;

// The five legacy banners in one block, at the legacy sizes (HeroBanner, GiantFullBleedBanner, GiantSquareBanner,
// LandscapeBanner, PreOrderBanner; px = legacy rem × 14). Consecutive hero banners render as one slideshow
// (render-blocks.tsx). Every layout looks finished without an image too: a dark (or, full bleed, light) backdrop.

const slideOf = (block: Banner): HeroSlide => {
  const link = linkOf(block);
  return {
    heading: block.heading,
    text: block.text,
    src: mediaUrl(block.image),
    alt: altOf(block),
    href: link.href,
    label: link.label,
    newTab: link.newTab,
  };
};

const altOf = (block: Banner) => (typeof block.image === 'object' && block.image?.alt) || block.heading;

function linkOf(block: Banner) {
  const href = block.link?.href && isSafeHref(block.link.href) ? block.link.href : null;
  return { href, label: block.link?.label, newTab: Boolean(block.link?.newTab) };
}

/** One or more hero banners as the legacy full-bleed slideshow. */
export function HeroBanners({ blocks }: { blocks: Banner[] }) {
  return <HeroSlideshow slides={blocks.map(slideOf)} />;
}

// The legacy white "secondary" call to action; `pill` is the GiantSquareBanner's 2rem radius.
function Cta({ block, pill }: { block: Banner; pill?: boolean }) {
  const { href, label, newTab } = linkOf(block);
  if (!href || !label) return null;
  return (
    <Button asChild variant="secondary" className={pill ? 'rounded-[2rem]' : undefined}>
      <Link href={href} {...(newTab && { target: '_blank', rel: 'noopener noreferrer' })}>
        {label}
      </Link>
    </Button>
  );
}

export function BannerBlock({ block }: { block: Banner }) {
  const src = mediaUrl(block.image);
  const alt = altOf(block);
  switch (block.layout) {
    case 'hero':
      return <HeroBanners blocks={[block]} />;
    case 'square':
      return (
        <section className="page-container mb-9">
          <div className="relative">
            <div className="drop-shadow-banner relative h-[450px] overflow-hidden rounded-[1.5rem] bg-primary sm:h-[600px] md:h-[700px]">
              {src ? <Image src={src} alt={alt} fill sizes="100vw" className="object-cover" /> : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.2)_0%,transparent_100%)]" />
            </div>
            <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-start py-3.5 pl-3.5 sm:p-[42px]">
              <h2 className="mb-3.5 w-full text-center text-[25px] leading-[29px] tracking-[-1px] text-white sm:text-[39px] sm:leading-[43px] md:w-auto md:text-left md:text-[53px] md:leading-[55px] md:tracking-[-3px]">
                {block.heading}
              </h2>
              {block.text ? <p className="mb-3.5 text-white">{block.text}</p> : null}
              <Cta block={block} pill />
            </div>
          </div>
        </section>
      );
    case 'full-bleed':
      return (
        <section className="relative mb-9 h-[450px] bg-muted sm:h-[600px] md:h-[800px]">
          {src ? <Image src={src} alt={alt} fill sizes="100vw" className="object-cover" /> : null}
          <div className="absolute top-0 flex h-full max-w-[600px] flex-col justify-between py-3.5 pl-3.5 sm:max-w-[400px] sm:py-[42px] sm:pl-[42px] md:max-w-[600px]">
            <div>
              <h2 className="max-w-[250px] text-[35px] leading-[35px] tracking-[-1px] text-primary sm:max-w-none sm:text-[56px] sm:leading-[56px] md:text-[70px] md:leading-[74px] md:tracking-[-3px]">
                {block.heading}
              </h2>
              {block.text ? <p className="mt-3.5 text-primary">{block.text}</p> : null}
            </div>
            <div>
              <Cta block={block} />
            </div>
          </div>
        </section>
      );
    case 'landscape': {
      const { href } = linkOf(block);
      const body: ReactNode = (
        <>
          <div className="relative mb-2.5 h-[200px] overflow-hidden rounded-[1rem] bg-primary sm:h-[350px]">
            {src ? <Image src={src} alt={alt} fill sizes="100vw" className="object-cover object-top" /> : null}
          </div>
          <h2 className="mb-1 text-[22px]">{block.heading}</h2>
          {block.text ? <p className="text-muted-foreground">{block.text}</p> : null}
        </>
      );
      return (
        <section className="page-container mb-9">
          {href ? (
            <Link href={href} className="block transition-colors duration-500 hover:text-accent">
              {body}
            </Link>
          ) : (
            body
          )}
        </section>
      );
    }
    case 'promo':
      // The legacy PreOrderBanner's own purple gradient (banner art, not a theme colour).
      return (
        <section className="page-container mb-9">
          <div className="grid items-center gap-4 rounded-[1.5rem] bg-[linear-gradient(to_right,#2F0743,#41295a)] p-3.5 sm:p-[35px] lg:grid-cols-[1fr_3fr]">
            {src ? (
              <div className="flex justify-center">
                <Image
                  src={src}
                  alt={alt}
                  width={250}
                  height={380}
                  className="mt-2 mb-6 h-[225px] w-auto rounded-[1rem] object-cover object-top shadow-soft sm:my-0 sm:h-[275px] md:h-[380px]"
                />
              </div>
            ) : null}
            <div className="flex flex-col items-center justify-center md:items-start">
              <h2 className="mb-3.5 w-full text-center text-[25px] leading-[29px] tracking-[-1px] text-white sm:text-[39px] sm:leading-[43px] md:mb-[22px] md:text-left md:text-[50px] md:leading-[54px] md:tracking-[-3px]">
                {block.heading}
              </h2>
              {block.text ? <p className="mb-3.5 text-white/90">{block.text}</p> : null}
              <Cta block={block} />
            </div>
          </div>
        </section>
      );
  }
}
