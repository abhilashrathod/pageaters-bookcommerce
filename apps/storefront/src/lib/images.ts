// next/image throws on a host missing from next.config.ts `images.remotePatterns`, which would break the whole
// block; anything else renders the placeholder instead. Keep the two lists in step.
const ALLOWED = [/^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/, /^covers\.openlibrary\.org$/];

export function imageSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && ALLOWED.some((host) => host.test(hostname)) ? url : null;
  } catch {
    return null;
  }
}
