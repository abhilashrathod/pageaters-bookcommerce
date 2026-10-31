import Image from 'next/image';

import { imageSrc } from '@/lib/images.ts';
import { cn } from '@/lib/utils.ts';

// A card image at a fixed aspect ratio; a missing or disallowed URL shows a muted block instead of breaking the card.
export function CoverImage({
  src,
  alt,
  width,
  height,
  sizes,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
}) {
  const safe = imageSrc(src);
  const classes = cn('w-full rounded-md object-cover', className);
  const aspectRatio = `${width} / ${height}`;
  if (!safe) return <div className={cn(classes, 'bg-muted')} style={{ aspectRatio }} role="img" aria-label={alt} />;
  return <Image src={safe} alt={alt} width={width} height={height} sizes={sizes} className={classes} style={{ aspectRatio }} />;
}
