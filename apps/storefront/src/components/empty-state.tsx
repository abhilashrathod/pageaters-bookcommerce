import Image from 'next/image';
import type { ReactNode } from 'react';

// The legacy EmptyMessageWithGraphic: an illustration from public/illustrations, centred, with an h6-sized message.
export function EmptyState({
  illustration,
  title,
  size = 300,
  children,
}: {
  illustration: string;
  title: string;
  size?: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Image src={`/illustrations/${illustration}.svg`} alt="" width={size} height={size} className="my-7" style={{ width: size, height: size }} />
      <p className="mb-3.5 text-[21px] font-semibold">{title}</p>
      {children}
    </div>
  );
}
