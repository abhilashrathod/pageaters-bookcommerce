// Pure helpers for the analytics pages (dashboard, book, customer). Tested in analytics.spec.ts.
import type { AdminCart } from '@pageaters/shared';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** Rupees with Indian digit grouping: 1234567.5 → "₹12,34,567.5". */
export function formatInr(value: number | null | undefined): string {
  return inr.format(value ?? 0);
}

/** Bar heights as % of the largest value (0–100). All zeros → all 0. */
export function barHeights(values: number[]): number[] {
  const max = Math.max(0, ...values);
  return values.map((v) => (max > 0 ? Math.round((v / max) * 1000) / 10 : 0));
}

/** A status → count record as rows, largest first. */
export function statusRows(byStatus: Record<string, number>): { status: string; count: number }[] {
  return Object.entries(byStatus)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

export interface CartLine {
  title: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const discounted = (price: number | undefined, discount: number | undefined) => (price ?? 0) * (1 - (discount ?? 0) / 100);

/** A populated cart's lines (books, bundles, add-ons, boxes). Prefers the stored line total, else price × qty. */
export function cartLines(cart: AdminCart): CartLine[] {
  const line = (title: string, quantity: number, unitPrice: number, total?: number): CartLine => ({
    title,
    quantity,
    unitPrice,
    total: total ?? unitPrice * quantity,
  });
  // A line whose item was deleted since is left out.
  return [
    ...cart.products.filter((i) => i.product).map((i) => line(i.product.title, i.quantity, discounted(i.product.price, i.product.currentDiscount), i.productTotal)),
    ...cart.bundles.filter((i) => i.bundle).map((i) => line(i.bundle.title, i.quantity, discounted(i.bundle.price, i.bundle.currentDiscount), i.total)),
    ...cart.addOns.filter((i) => i.addOn).map((i) => line(i.addOn.name, i.quantity, i.price ?? 0, i.total)),
    ...cart.mysteryBoxes.filter((i) => i.box).map((i) => line(i.box.title, i.quantity, i.price ?? 0, i.total)),
  ];
}

export function cartTotal(lines: CartLine[]): number {
  return Math.round(lines.reduce((sum, l) => sum + l.total, 0) * 100) / 100;
}
