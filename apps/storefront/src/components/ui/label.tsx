import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils.ts';

// shadcn/ui label (a plain <label>; no Radix needed for the forms here).
export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label data-slot="label" className={cn('text-sm font-medium leading-none', className)} {...props} />;
}
