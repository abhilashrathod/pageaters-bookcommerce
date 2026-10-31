import type { PopulatedCart } from '@pageaters/shared';

// How many items the cart holds, for the header badge: every line's quantity, add-ons included.
export function cartItemCount(cart: Pick<PopulatedCart, 'products' | 'bundles' | 'addOns' | 'mysteryBoxes'>): number {
  return [...cart.products, ...cart.bundles, ...cart.addOns, ...cart.mysteryBoxes].reduce((sum, line) => sum + line.quantity, 0);
}
