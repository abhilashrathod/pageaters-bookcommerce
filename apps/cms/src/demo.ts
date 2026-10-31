// The public CMS demo login (AGENTS.md §6: read-only). Its password is public on purpose: with DEMO_MODE=true the
// login form is prefilled with it (payload.config.ts), and the role allows reading only (access.ts).
export const DEMO_EDITOR = Object.freeze({ email: 'editor@demo.pageaters.com', password: 'demo-readonly' });
