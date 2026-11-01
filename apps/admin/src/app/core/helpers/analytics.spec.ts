import { describe, expect, it } from 'vitest';
import type { AdminCart } from '@pageaters/shared';
import { barHeights, cartLines, cartTotal, formatInr, statusRows } from '@helpers/analytics';

describe('formatInr', () => {
  it('uses the rupee sign and Indian digit grouping', () => {
    expect(formatInr(1234567.5)).toBe('₹12,34,567.5');
    expect(formatInr(499)).toBe('₹499');
  });

  it('treats a missing value as zero', () => {
    expect(formatInr(undefined)).toBe('₹0');
  });
});

describe('barHeights', () => {
  it('scales values against the largest', () => {
    expect(barHeights([0, 50, 100, 25])).toEqual([0, 50, 100, 25]);
    expect(barHeights([2, 8])).toEqual([25, 100]);
  });

  it('gives all-zero series flat bars', () => {
    expect(barHeights([0, 0])).toEqual([0, 0]);
    expect(barHeights([])).toEqual([]);
  });
});

describe('statusRows', () => {
  it('lists statuses largest first', () => {
    expect(statusRows({ paid: 2, fulfilled: 5 })).toEqual([
      { status: 'fulfilled', count: 5 },
      { status: 'paid', count: 2 },
    ]);
  });
});

describe('cart lines and total', () => {
  const cart = {
    products: [
      { quantity: 2, productTotal: 898.2, product: { title: 'Book A', price: 499, currentDiscount: 10 } },
      { quantity: 1, product: { title: 'Book B', price: 300, currentDiscount: 0 } },
    ],
    bundles: [{ quantity: 1, bundle: { title: 'Bundle', price: 1000, currentDiscount: 20 } }],
    addOns: [{ quantity: 3, price: 84, addOn: { name: 'Bookmark' } }],
    mysteryBoxes: [],
  } as unknown as AdminCart;

  it('prefers stored line totals and falls back to discounted price × qty', () => {
    expect(cartLines(cart).map((l) => l.total)).toEqual([898.2, 300, 800, 252]);
  });

  it('sums the lines', () => {
    expect(cartTotal(cartLines(cart))).toBe(2250.2);
    expect(cartTotal([])).toBe(0);
  });
});
