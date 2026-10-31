import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
// CMS media (banner images) are served by the CMS at /api/media/file/… (from Vercel Blob, or local disk in development).
const cms = new URL(process.env.CMS_URL || 'http://localhost:3001');

const nextConfig: NextConfig = {
  // `next dev` would otherwise write an apps/storefront/AGENTS.md; the repo's rules live in the root AGENTS.md only.
  agentRules: false,
  // Images come only from Vercel Blob (seed covers), the CMS's media route and Open Library; the legacy S3/CloudFront
  // hosts are gone. Keep src/lib/images.ts in step.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
      {
        protocol: cms.protocol === 'https:' ? 'https' : 'http',
        hostname: cms.hostname,
        port: cms.port,
        pathname: '/api/media/file/**',
      },
    ],
    // The local CMS is on localhost, which the image optimizer refuses unless allowed; development only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === 'development',
  },
  turbopack: { root: path.resolve(dirname, '../..') },
};

export default nextConfig;
