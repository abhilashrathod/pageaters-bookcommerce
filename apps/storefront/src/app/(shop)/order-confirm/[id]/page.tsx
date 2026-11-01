import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button.tsx';

export const metadata: Metadata = { title: 'Order Confirmed | Pageaters' };

// The legacy order-confirm page: the illustration, a greeting, the order number and the way to the orders page.
export default async function OrderConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="page-container flex flex-col items-center pt-7 text-center">
      <Image src="/illustrations/order-confirm.svg" alt="" width={400} height={400} className="mb-7 size-[280px] sm:size-[400px]" />
      <h1 className="display-1 mb-3.5">Thank you for your order!</h1>
      <p className="mb-2 text-[21px] font-semibold">Your Order No: {id}</p>
      <p className="mb-3.5">Track order status and information in orders page. This is a demo: nothing is charged or shipped.</p>
      <Button asChild variant="accent">
        <Link href="/account/orders">View Orders</Link>
      </Button>
    </div>
  );
}
