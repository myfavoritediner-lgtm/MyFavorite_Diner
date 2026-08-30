import { restaurantJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import type { Settings, MenuData } from '@/lib/types';
import { siteUrl } from '@/lib/seo';

/**
 * schema.org markup for Google.
 *
 * Produces the rich result in Search: opening hours, price range, cuisine,
 * a reserve action and — because the menu is marked up too — the dishes
 * themselves can surface in Google's restaurant panel.
 */
export default function StructuredData({
  settings,
  menu,
}: {
  settings: Settings;
  menu: MenuData;
}) {
  const url = siteUrl();

  const restaurant = restaurantJsonLd(settings);

  const menuJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${url}/#menu`,
    name: 'My Favorite Diner menu',
    inLanguage: 'en',
    hasMenuSection: menu.map((section) => ({
      '@type': 'MenuSection',
      name: section.name,
      hasMenuItem: section.items.map((item) => ({
        '@type': 'MenuItem',
        name: item.name,
        ...(item.description ? { description: item.description } : {}),
        ...(item.image_url ? { image: item.image_url } : {}),
        offers: {
          '@type': 'Offer',
          price: String(Math.round(item.price)),
          priceCurrency: 'THB',
        },
      })),
    })),
  };

  const blocks = [restaurant, breadcrumbJsonLd(), menuJsonLd];

  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          // JSON.stringify output is safe here: it is our own data and any
          // "<" is escaped below to prevent breaking out of the script tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
