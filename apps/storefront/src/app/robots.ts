import type { MetadataRoute } from 'next';

// A portfolio demo, not a store: no crawler may index it (every page also says noindex).
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
