import type { Theme } from '@pageaters/cms-types';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AnnouncementBar } from '@/components/site/announcement-bar.tsx';
import { DemoBanner } from '@/components/site/demo-banner.tsx';
import { Footer } from '@/components/site/footer.tsx';
import { Header } from '@/components/site/header.tsx';
import { env } from '@/env.ts';
import { cmsFetch } from '@/lib/cms.ts';
import { themeCss } from '@/lib/theme.ts';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: 'Pageaters',
  // A portfolio demo: never indexed (pages with their own metadata say so too; robots.ts disallows everything).
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Theme tokens from the CMS override the CSS defaults; values are re-validated in themeCss before they reach <style>.
  const theme = await cmsFetch<Theme>('/globals/theme', ['cms:global:theme']);
  const css = themeCss(theme);
  return (
    <html lang="en">
      {/* A ternary, not `css &&`: an empty string would render a stray text node in <head> and break hydration. */}
      <head>{css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}</head>
      <body className="flex min-h-screen flex-col">
        <DemoBanner />
        <AnnouncementBar />
        <Header />
        {/* Pages render their own <main>. */}
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
