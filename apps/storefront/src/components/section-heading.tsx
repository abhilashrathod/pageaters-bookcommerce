import type { ReactNode } from 'react';

// The legacy SectionHeading: title left (1.571rem at the legacy 14px root), optional controls (carousel arrows) right.
export function SectionHeading({ title, children }: { title?: string | null; children?: ReactNode }) {
  if (!title && !children) return null;
  return (
    <div className="flex items-center justify-between gap-4">
      {title ? <h2 className="mb-3.5 text-[22px] leading-[26px]">{title}</h2> : <span />}
      {children}
    </div>
  );
}
