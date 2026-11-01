import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils.ts';

// shadcn/ui button in the legacy look (form-controls/Button, OutlinedButton, IconButton): semibold text, the soft
// `0 2px 10px` shadow, a 0.5rem radius and `1rem 1.714rem` padding (legacy px at its 14px root). `secondary` is the
// white button with a dark border the banners use; `outline` is the legacy OutlinedButton; `ghost` the IconButton.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap border border-transparent font-semibold leading-5 transition-colors duration-150 outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-soft hover:bg-primary/90',
        accent: 'bg-accent text-accent-foreground shadow-soft hover:bg-accent/90',
        secondary: 'border-primary bg-background text-primary shadow-soft hover:bg-muted',
        destructive: 'bg-destructive text-white shadow-soft hover:bg-destructive/90',
        outline: 'border-primary bg-primary/[0.07] text-primary hover:bg-primary/[0.12]',
        ghost: 'text-primary hover:text-accent',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'rounded-[7px] px-6 py-3.5 text-base',
        sm: 'rounded-[3px] px-2 py-1 text-sm',
        lg: 'rounded-[7px] px-6 py-3.5 text-base',
        icon: 'size-9 rounded-full p-0',
      },
    },
    compoundVariants: [
      // The legacy IconButton: compact, no shadow.
      { variant: 'ghost', size: 'default', className: 'px-2 py-1' },
      { variant: 'link', size: 'default', className: 'px-0 py-0' },
    ],
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
