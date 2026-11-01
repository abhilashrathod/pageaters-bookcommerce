'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { CircleChevronLeft, CircleChevronRight } from 'lucide-react';
import { Children, type ReactNode } from 'react';

import { SectionHeading } from '@/components/section-heading.tsx';

// Slide widths from the legacy keen-slider settings (slides per view, small → large screens), as 100 / perView.
const SIZES = {
  book: 'basis-[47.6%] xs:basis-[24.4%] sm:basis-[19.6%] md:basis-[13.33%]', // 2.1 · 4.1 · 5.1 · 7.5
  square: 'basis-[80%] xs:basis-[44.4%] sm:basis-[40%] md:basis-[23.5%]', // 1.25 · 2.25 · 2.5 · 4.25
  wide: 'basis-[80%] xs:basis-[44.4%] sm:basis-[47.6%] md:basis-[32.3%]', // 1.25 · 2.25 · 2.1 · 3.1
  deal: 'basis-[90.9%] xs:basis-[47.6%] md:basis-[32.3%]', // 1.1 · 2.1 · 2.1 · 3.1
  portrait: 'basis-[30.8%] xs:basis-[19%] sm:basis-[16%] md:basis-[12.1%]', // 3.25 · 5.25 · 6.25 · 8.25
} as const;

export type CarouselSize = keyof typeof SIZES;

const ARROW = 'rounded-full text-primary transition-colors hover:text-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none';

// A titled, free-dragging row of cards with the legacy chevron-circle arrows on wider screens (the legacy carousels).
export function Carousel({ title, size, children }: { title?: string | null; size: CarouselSize; children: ReactNode }) {
  const [viewportRef, api] = useEmblaCarousel({ align: 'start', dragFree: true, containScroll: 'trimSnaps' });
  return (
    <section className="page-container mb-9" aria-label={title ?? undefined} aria-roledescription="carousel">
      <SectionHeading title={title}>
        <div className="mb-3.5 hidden md:flex">
          <button type="button" className={ARROW} aria-label="Previous" onClick={() => api?.scrollPrev()}>
            <CircleChevronLeft className="size-7" strokeWidth={1.25} aria-hidden />
          </button>
          <button type="button" className={ARROW} aria-label="Next" onClick={() => api?.scrollNext()}>
            <CircleChevronRight className="size-7" strokeWidth={1.25} aria-hidden />
          </button>
        </div>
      </SectionHeading>
      <div ref={viewportRef} className="overflow-hidden">
        <div className="-ml-3 flex touch-pan-y">
          {Children.map(children, (child) => (
            <div className={`min-w-0 shrink-0 grow-0 pl-3 ${SIZES[size]}`} aria-roledescription="slide">
              {child}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
