import type { Theme } from '@pageaters/cms-types';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { env } from '@/env.ts';
import { cmsFetch } from '@/lib/cms.ts';
import { themeCss } from '@/lib/theme.ts';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: 'Pageaters',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Theme tokens from the CMS override the CSS defaults; values are re-validated in themeCss before they reach <style>.
  const theme = await cmsFetch<Theme>('/globals/theme', ['cms:global:theme']);
  const css = themeCss(theme);
  return (
    <html lang="en">
      {/* A ternary, not `css &&`: an empty string would render a stray text node in <head> and break hydration. */}
      <head>{css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}</head>
      <body>{children}</body>
    </html>
  );
}
