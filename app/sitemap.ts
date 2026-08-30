import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

/**
 * Served at /sitemap.xml — submit this URL in Google Search Console.
 *
 * The homepage plus the full menu page. Admin, cancel and unsubscribe are
 * deliberately excluded (see robots.ts).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = siteUrl();

  return [
    {
      url,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${url}/menu`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];
}
