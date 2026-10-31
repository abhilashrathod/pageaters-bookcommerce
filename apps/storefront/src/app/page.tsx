import { Button } from '@/components/ui/button.tsx';

// Placeholder until the CMS page routes land (Phase 7 "Routes"); shows the theme tokens are wired.
export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold">Pageaters</h1>
      <p className="text-muted-foreground">The storefront is being rebuilt on the App Router.</p>
      <div className="flex gap-2">
        <Button>Primary</Button>
        <Button variant="accent">Accent</Button>
        <Button variant="outline">Outline</Button>
      </div>
    </main>
  );
}
