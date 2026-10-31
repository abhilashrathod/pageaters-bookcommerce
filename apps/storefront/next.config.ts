import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // `next dev` would otherwise write an apps/storefront/AGENTS.md; the repo's rules live in the root AGENTS.md only.
  agentRules: false,
  // Images come only from Vercel Blob (seed covers, CMS media) and Open Library; the legacy S3/CloudFront hosts are gone.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
    ],
  },
  turbopack: { root: path.resolve(dirname, '../..') },
};

export default nextConfig;
