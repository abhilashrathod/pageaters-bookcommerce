import config from '@payload-config';
import { getPayload } from 'payload';

import { DEMO_EDITOR } from '../demo.ts';

// Seeds the CMS accounts (`pnpm seed:users`; reruns change nothing that is already right):
// - the owner: SUPER_ADMIN_EMAIL becomes `admin` (created with SUPER_ADMIN_PASSWORD when missing; an existing
//   account keeps its password), so /admin/create-first-user is never open on a deployment;
// - the read-only demo login (demo.ts).
// Never prints a password.

const ownerEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const ownerPassword = process.env.SUPER_ADMIN_PASSWORD;
if (!ownerEmail) throw new Error('SUPER_ADMIN_EMAIL is required (apps/cms/.env)');

const payload = await getPayload({ config });

const upsert = async (email: string, role: 'admin' | 'demo-readonly', password: string | undefined) => {
  const { docs } = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 });
  const existing = docs[0];
  if (existing) {
    await payload.update({ collection: 'users', id: existing.id, data: { role } });
    payload.logger.info(`CMS user ${email}: role ${role}`);
    return;
  }
  if (!password) throw new Error(`${email} does not exist yet: set SUPER_ADMIN_PASSWORD to create it`);
  await payload.create({ collection: 'users', data: { email, password, role } });
  payload.logger.info(`CMS user ${email}: created (${role})`);
};

await upsert(ownerEmail, 'admin', ownerPassword);
await upsert(DEMO_EDITOR.email, 'demo-readonly', DEMO_EDITOR.password);
process.exit(0);
