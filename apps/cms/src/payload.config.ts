import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import sharp from 'sharp';

import { Media } from './collections/Media.ts';
import { Overrides } from './collections/Overrides.ts';
import { Pages } from './collections/Pages.ts';
import { Templates } from './collections/Templates.ts';
import { Users } from './collections/Users.ts';
import { DEMO_EDITOR } from './demo.ts';
import { commerceEndpoint } from './endpoints/commerce.ts';
import { AnnouncementBar } from './globals/AnnouncementBar.ts';
import { Footer } from './globals/Footer.ts';
import { Header } from './globals/Header.ts';
import { Seo } from './globals/Seo.ts';
import { Theme } from './globals/Theme.ts';
import { parseEnv } from './env.ts';
import { revalidateGlobal, revalidateOnChange, revalidateOnDelete } from './hooks/revalidate.ts';
import { previewPath, previewUrl } from './storefront.ts';

// Payload CMS (AGENTS.md "apps/cms"): content only, in its own database; commerce data stays in the API.

const dirname = path.dirname(fileURLToPath(import.meta.url));
const env = parseEnv(process.env);

const revalidateTarget = env.REVALIDATE_SECRET ? { url: env.STOREFRONT_URL, secret: env.REVALIDATE_SECRET } : undefined;
const drafted = [Pages, Templates, Overrides].map((collection) => ({
  ...collection,
  hooks: { afterChange: [revalidateOnChange(revalidateTarget)], afterDelete: [revalidateOnDelete(revalidateTarget)] },
}));
const globals = [Header, Footer, AnnouncementBar, Theme, Seo].map((global) => ({
  ...global,
  hooks: { afterChange: [revalidateGlobal(revalidateTarget)] },
}));
const previewSecret = env.PREVIEW_SECRET;

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    ...(env.DEMO_MODE && { autoLogin: { ...DEMO_EDITOR, prefillOnly: true } }),
    ...(previewSecret && {
      livePreview: {
        collections: drafted.map((collection) => collection.slug),
        url: ({ data, collectionConfig }) => previewUrl(env.STOREFRONT_URL, previewSecret, previewPath(collectionConfig?.slug ?? '', data)),
        breakpoints: [
          { name: 'mobile', label: 'Mobile', width: 390, height: 844 },
          { name: 'tablet', label: 'Tablet', width: 820, height: 1180 },
          { name: 'desktop', label: 'Desktop', width: 1440, height: 900 },
        ],
      },
    }),
  },
  collections: [...drafted, Media, Users],
  globals,
  endpoints: [commerceEndpoint(env.API_URL)],
  editor: lexicalEditor(),
  secret: env.PAYLOAD_SECRET,
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: mongooseAdapter({ url: env.MONGODB_URI }),
  sharp,
  plugins: [
    // Media files on Vercel Blob under `cms/` (the catalog images live under `catalog/`); local disk without a token.
    vercelBlobStorage({
      enabled: Boolean(env.BLOB_READ_WRITE_TOKEN),
      collections: { media: { prefix: 'cms' } },
      token: env.BLOB_READ_WRITE_TOKEN ?? '',
    }),
  ],
});
