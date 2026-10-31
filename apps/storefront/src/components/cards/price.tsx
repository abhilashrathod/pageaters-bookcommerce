import { discountedPrice, formatPrice } from '@/lib/money.ts';

// Price with the legacy strike-through when discounted.
export function Price({ price, discount }: { price?: number; discount?: number }) {
  if (price === undefined) return null;
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      {discount ? (
        <>
          <s className="font-normal text-muted-foreground">{formatPrice(price)}</s>
          <span>{formatPrice(discountedPrice(price, discount))}</span>
        </>
      ) : (
        formatPrice(price)
      )}
    </span>
  );
}
