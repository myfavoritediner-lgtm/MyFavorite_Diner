import type { MenuData } from '@/lib/types';
import { siteUrl } from '@/lib/seo';

/**
 * The menu marked up for Google on its own page, plus a breadcrumb so the
 * search result reads "My Favorite Diner › Menu" instead of a bare URL.
 *
 * The homepage carries the same Menu block inside StructuredData; both
 * point at the same @id, so Google treats them as one thing.
 */
export default function MenuJsonLd({ menu }: { menu: MenuData }) {
  const url = siteUrl();

  const blocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'Menu',
      '@id': `${url}/#menu`,
      url: `${url}/menu`,
      name: 'My Favorite Diner menu',
      inLanguage: 'en',
      hasMenuSection: menu
        .filter((s) => s.items.length > 0)
        .map((section) => ({
          '@type': 'MenuSection',
          name: section.name,
          hasMenuItem: section.items.map((item) => ({
            '@type': 'MenuItem',
            name: item.name,
            ...(item.description ? { description: item.description } : {}),
            ...(item.image_url ? { image: `${url}${item.image_url}` } : {}),
            offers: {
              '@type': 'Offer',
              price: String(Math.round(item.price)),
              priceCurrency: 'THB',
            },
          })),
        })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: url },
        { '@type': 'ListItem', position: 2, name: 'Menu', item: `${url}/menu` },
      ],
    },
  ];

  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
