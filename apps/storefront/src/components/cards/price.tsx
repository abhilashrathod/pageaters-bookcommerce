import { discountedPrice, formatPrice } from '@/lib/money.ts';

// Price with the legacy strike-through (grey #868686) when discounted.
export function Price({ price, discount, className = '' }: { price?: number; discount?: number; className?: string }) {
  if (price === undefined) return null;
  return (
    <span className={`inline-flex items-center font-semibold ${className}`}>
      {discount ? (
        <>
          <s className="mr-2 text-[#868686]">{formatPrice(price)}</s>
          <span>{formatPrice(discountedPrice(price, discount))}</span>
        </>
      ) : (
        formatPrice(price)
      )}
    </span>
  );
}
