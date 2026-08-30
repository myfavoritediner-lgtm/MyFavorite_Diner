import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

/** Served at /robots.txt */
export default function robots(): MetadataRoute.Robots {
  const url = siteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private or single-use pages — no value in search results.
        disallow: ['/admin', '/admin/', '/api/', '/cancel', '/unsubscribe'],
      },
    ],
    sitemap: `${url}/sitemap.xml`,
    host: url,
  };
}
