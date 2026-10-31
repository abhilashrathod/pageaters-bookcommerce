import type { Access, FieldAccess } from 'payload';

// Who may do what in the CMS (AGENTS.md §6: the demo login is read-only, enforced server-side). Two roles: `admin`
// (the owner) writes; `demo-readonly` (the public demo login, and the default for any new account) only reads.

export const ROLES = ['admin', 'demo-readonly'] as const;
export type Role = (typeof ROLES)[number];

type WithRole = { role?: Role | null } | null | undefined;

export const isAdminUser = (user: WithRole): boolean => user?.role === 'admin';

/** Writes: admins only. */
export const adminOnly: Access = ({ req }) => isAdminUser(req.user);

/** A field only admins may set (the role itself). */
export const adminOnlyField: FieldAccess = ({ req }) => isAdminUser(req.user);

/** Published content and media: anyone, the storefront included. */
export const anyone: Access = () => true;

/** Accounts: admins see every account, anyone else only their own. */
export const adminOrSelf: Access = ({ req }) => (isAdminUser(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false);
