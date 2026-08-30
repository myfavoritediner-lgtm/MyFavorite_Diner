/**
 * Everything Google needs to know about the restaurant, in one place.
 *
 * Keep this accurate — it feeds the page metadata, the sitemap and the
 * structured data that produces rich results in Google Search and Maps.
 */

export const SITE = {
  name: 'My Favorite Diner Bar and Grill',
  shortName: 'My Favorite Diner',
  tagline: 'Breakfast All Day · Burgers All Night',

  description:
    'American diner, bar and grill in Jomtien Complex, Pattaya. Half-pound wagyu ' +
    'burgers, all-day breakfast, pancakes, pasta, steaks, cocktails and ice-cold ' +
    'beer. Open every day — walk in or book a table online.',

  /** Short version for social cards, which truncate around 200 characters. */
  shortDescription:
    'Half-pound wagyu burgers, all-day breakfast and ice-cold beer in Jomtien Complex, Pattaya.',

  /** What people actually type into Google when looking for this place. */
  keywords: [
    'American diner Pattaya',
    'burgers Jomtien',
    'breakfast Jomtien',
    'all day breakfast Pattaya',
    'wagyu burger Pattaya',
    'bar and grill Jomtien Complex',
    'western food Pattaya',
    'restaurant Thappraya Road',
    'steak Jomtien',
    'English breakfast Pattaya',
  ],

  address: {
    street: '413/11-12 Thappraya Road, Jomtien Complex',
    locality: 'Pattaya City',
    region: 'Chon Buri',
    postalCode: '20150',
    country: 'TH',
  },

  /** Jomtien Complex, Thappraya Road. Refine if you have exact coordinates. */
  geo: { latitude: 12.8919, longitude: 100.8756 },

  cuisine: ['American', 'Burgers', 'Breakfast', 'Bar food'],
  priceRange: '฿฿',
  mapsUrl: 'https://maps.app.goo.gl/k3wm3n4QXgfEiKjy5',
} as const;

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:3000'
  );
}

/**
 * schema.org Restaurant markup.
 *
 * This is what lets Google show the opening hours, price range, cuisine and
 * a "Reserve" action directly in search results.
 */
export function restaurantJsonLd(settings: Record<string, string>) {
  const url = siteUrl();

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${url}/#restaurant`,
    name: SITE.name,
    alternateName: SITE.shortName,
    description: SITE.description,
    url,
    image: [`${url}/opengraph-image`],
    servesCuisine: [...SITE.cuisine],
    priceRange: SITE.priceRange,
    currenciesAccepted: 'THB',
    acceptsReservations: 'True',
    hasMenu: `${url}/#menu`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings.address_line1 || SITE.address.street,
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postalCode,
      addressCountry: SITE.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: SITE.geo.latitude,
      longitude: SITE.geo.longitude,
    },
    potentialAction: {
      '@type': 'ReserveAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/#visit`,
        inLanguage: 'en',
        actionPlatform: [
          'http://schema.org/DesktopWebPlatform',
          'http://schema.org/MobileWebPlatform',
        ],
      },
      result: { '@type': 'Reservation', name: 'Table reservation' },
    },
  };

  // Only include contact details we actually have.
  if (settings.phone) data.telephone = settings.phone;
  if (settings.email) data.email = settings.email;

  const sameAs = [SITE.mapsUrl, settings.facebook_url].filter(Boolean);
  if (sameAs.length) data.sameAs = sameAs;

  return data;
}

/** Breadcrumbs help Google display the site structure under the result. */
export function breadcrumbJsonLd() {
  const url = siteUrl();
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Menu', path: '/#menu' },
    { name: 'Gallery', path: '/#gallery' },
    { name: 'Book a Table', path: '/#visit' },
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${url}${c.path}`,
    })),
  };
}
