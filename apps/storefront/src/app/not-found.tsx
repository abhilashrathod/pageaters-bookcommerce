import Link from 'next/link';

import { Button } from '@/components/ui/button.tsx';

// The legacy 404 page.
export default function NotFound() {
  return (
    <main className="page-container min-h-[60vh] py-14">
      <h1 className="display-1 mb-14">The page you requested does not exist</h1>
      <Button asChild>
        <Link href="/">Navigate to Home</Link>
      </Button>
    </main>
  );
}
