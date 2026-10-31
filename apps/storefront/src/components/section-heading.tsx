import type { ReactNode } from 'react';

// The legacy SectionHeading: title left, optional controls (carousel arrows) right.
export function SectionHeading({ title, children }: { title?: string | null; children?: ReactNode }) {
  if (!title && !children) return null;
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      {title ? <h2 className="text-[1.571rem] leading-[1.857rem]">{title}</h2> : <span />}
      {children}
    </div>
  );
}
