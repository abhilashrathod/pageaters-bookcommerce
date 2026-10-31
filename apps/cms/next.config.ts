import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // `next dev` would otherwise write an apps/cms/AGENTS.md; the repo's rules live in the root AGENTS.md only.
  agentRules: false,
  // The CMS has no site of its own: `/` opens the admin.
  redirects: () => Promise.resolve([{ source: '/', destination: '/admin', permanent: false }]),
  turbopack: { root: path.resolve(dirname, '../..') },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
