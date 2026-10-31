import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Code-owned shopper pages (cart, checkout, orders): private, so kept out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ShopLayout({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>;
}
