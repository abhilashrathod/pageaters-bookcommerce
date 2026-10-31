import config from '@payload-config';
import { createApiClient } from '@pageaters/api-client';
import { getPayload } from 'payload';

import { parseEnv } from '../env.ts';
import { globals, homePage, pages, templates } from './content-data.ts';

// Seeds the CMS's starting content (`pnpm seed:content`), published so visitors see it: the homepage, the listing and
// help pages, the templates and the globals. Creates only what is missing: a page by slug, a template by type, a
// global never saved; anything that exists (the owner's edits) is left alone,
// so a rerun changes nothing. The homepage gets rows for the API's first two product sets when the API is reachable.

const env = parseEnv(process.env);
const payload = await getPayload({ config });

const firstProductSets = async (): Promise<string[]> => {
  try {
    const { docs } = await createApiClient({ baseUrl: env.API_URL }).productSets.list({ page: 1, limit: 2 });
    return docs.map((set) => String(set._id));
  } catch {
    payload.logger.warn(`The API at ${env.API_URL} is unreachable: the homepage is seeded without product set rows`);
    return [];
  }
};

const exists = async (collection: 'pages' | 'templates', field: 'slug' | 'type', value: string) =>
  (await payload.find({ collection, where: { [field]: { equals: value } }, limit: 1, draft: true })).totalDocs > 0;

if (await exists('pages', 'slug', 'home')) {
  payload.logger.info('CMS page home: exists, left as it is');
} else {
  await payload.create({ collection: 'pages', data: { ...homePage(await firstProductSets()), _status: 'published' } });
  payload.logger.info('CMS page home: created');
}

for (const page of pages) {
  if (await exists('pages', 'slug', page.slug)) {
    payload.logger.info(`CMS page ${page.slug}: exists, left as it is`);
    continue;
  }
  await payload.create({ collection: 'pages', data: { ...page, _status: 'published' } });
  payload.logger.info(`CMS page ${page.slug}: created`);
}

for (const template of templates) {
  if (await exists('templates', 'type', template.type)) {
    payload.logger.info(`CMS template ${template.type}: exists, left as it is`);
    continue;
  }
  await payload.create({ collection: 'templates', data: { ...template, _status: 'published' } });
  payload.logger.info(`CMS template ${template.type}: created`);
}

// A global that was never saved has no `updatedAt`.
const seedGlobal = async (slug: keyof typeof globals, write: () => Promise<unknown>) => {
  if ((await payload.findGlobal({ slug })).updatedAt) {
    payload.logger.info(`CMS global ${slug}: saved before, left as it is`);
    return;
  }
  await write();
  payload.logger.info(`CMS global ${slug}: seeded`);
};

await seedGlobal('header', () => payload.updateGlobal({ slug: 'header', data: globals.header }));
await seedGlobal('footer', () => payload.updateGlobal({ slug: 'footer', data: globals.footer }));
await seedGlobal('announcement-bar', () => payload.updateGlobal({ slug: 'announcement-bar', data: globals['announcement-bar'] }));
await seedGlobal('theme', () => payload.updateGlobal({ slug: 'theme', data: globals.theme }));
await seedGlobal('seo', () => payload.updateGlobal({ slug: 'seo', data: globals.seo }));

process.exit(0);
