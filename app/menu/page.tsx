import type { Metadata } from 'next';
import Link from 'next/link';
import { getMenu, getSettings } from '@/lib/queries';
import { SITE } from '@/lib/seo';

import Header from '@/components/site/Header';
import Footer from '@/components/site/Footer';
import Effects from '@/components/site/Effects';
import Lightbox from '@/components/site/Lightbox';
import BackToTop from '@/components/site/BackToTop';
import FullMenu from '@/components/site/FullMenu';
import MenuJsonLd from '@/components/site/MenuJsonLd';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Full Menu',
  description:
    'The full menu at My Favorite Diner Bar and Grill, Jomtien Complex, Pattaya — ' +
    'salads, sandwiches, half-pound wagyu burgers, all-day breakfast, pancakes, ' +
    'egg scrambles, pastas, hot dogs, mains, fries, sides, shakes and sundaes. ' +
    'All prices in Thai baht.',
  alternates: { canonical: '/menu' },
  openGraph: {
    url: '/menu',
    title: `Full Menu — ${SITE.shortName}`,
    description:
      'Every dish we serve, with prices in Thai baht. Breakfast all day, burgers all night.',
  },
};

export default async function MenuPage() {
  const [menu, settings] = await Promise.all([getMenu(), getSettings()]);

  const dishes = menu.reduce((n, s) => n + s.items.length, 0);

  return (
    <>
      <MenuJsonLd menu={menu} />
      <Effects />
      <Lightbox />
      <BackToTop />
      <Header />

      <main>
        <section className="fm-top">
          <div className="wrap">
            <Link className="fm-back" href="/#menu">
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5l-7 7 7 7" />
              </svg>
              Back to the diner
            </Link>

            <span className="script">Everything we serve</span>
            <h1>Our Full Menu</h1>
            <p>
              {dishes} dishes, all prices in Thai baht. Breakfast is served
              from open until close. Ask us about today&rsquo;s specials.
            </p>

            <div className="fm-cta">
              <Link className="btn" href="/#visit">
                Book a Table
              </Link>
              {settings.phone ? (
                <a className="btn ghost" href={`tel:${settings.phone.replace(/\s/g, '')}`}>
                  Call {settings.phone}
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <div className="checker" aria-hidden="true" />

        <div className="fm-body">
          <FullMenu menu={menu} />
        </div>
      </main>

      <Footer settings={settings} />
    </>
  );
}
