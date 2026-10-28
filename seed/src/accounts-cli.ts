// Checks the demo accounts can be built from apps/api/.env (SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD). The accounts
// themselves are created when the seed is loaded; nothing is written here and no secret is printed.
// Usage: pnpm --filter @pageaters/seed accounts
import { buildAccounts } from './accounts.ts';

const { users, addresses, carts, favorites } = buildAccounts(process.env);
const mask = (email: string) => email.replace(/^(.).*(@.*)$/, '$1***$2');
process.stdout.write(
  [
    'Accounts ready to seed:',
    ...users.map((u) => `  ${String(u.role).padEnd(5)}  ${String(u.fullName).padEnd(12)}  ${mask(String(u.email))}`),
    `  demo shopper: ${addresses.length} saved address, ${carts.length} cart, ${favorites.length} favourites list`,
  ].join('\n') + '\n',
);
