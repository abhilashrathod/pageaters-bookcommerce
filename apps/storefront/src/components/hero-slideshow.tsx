'use client';

import useEmblaCarousel from 'embla-carousel-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button.tsx';

export type HeroSlide = { heading: string; text?: string | null; src: string | null; alt: string; href: string | null; label?: string | null; newTab?: boolean };

const SHADOW = '[text-shadow:3px_4px_7px_rgba(81,67,21,0.8)]';

// The legacy HeroBanner: full-bleed slides (95vh, 75vh below sm) that advance every 3s and pause while hovered or
// focused (or when the visitor prefers reduced motion). The white title sits bottom-left; no image → dark slide.
export function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [viewportRef, api] = useEmblaCarousel({ loop: slides.length > 1 });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!api || paused || slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => api.scrollNext(), 3000);
    return () => clearInterval(timer);
  }, [api, paused, slides.length]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative mb-9 h-[75vh] sm:h-[95vh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div ref={viewportRef} className="h-full overflow-hidden">
        <div className="flex h-full touch-pan-y">
          {slides.map((slide, index) => (
            <div key={index} className="relative h-full min-w-0 shrink-0 grow-0 basis-full bg-primary" aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}`}>
              {slide.src ? <Image src={slide.src} alt={slide.alt} fill priority={index === 0} sizes="100vw" className="object-cover" /> : null}
              <div className="absolute bottom-7 left-3.5 z-10 max-w-[calc(100%-1.75rem)] text-white">
                <h2 className={`mb-3.5 text-[28px] leading-[35px] tracking-[-1px] sm:text-[42px] sm:leading-[56px] md:text-[52px] md:leading-[56px] md:tracking-[-2px] ${SHADOW}`}>
                  {slide.heading}
                </h2>
                {slide.text ? <p className={`mb-3.5 ${SHADOW}`}>{slide.text}</p> : null}
                {slide.href && slide.label ? (
                  <Button asChild variant="secondary">
                    <Link href={slide.href} {...(slide.newTab && { target: '_blank', rel: 'noopener noreferrer' })}>
                      {slide.label}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
