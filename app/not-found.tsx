import Link from 'next/link';
import { getSettings } from '@/lib/queries';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

/**
 * A wrong address should still sell a burger. The phone number is on it,
 * because a guest who mistyped a link is a guest who was trying to reach
 * the restaurant.
 */
export default async function NotFound() {
  const settings = await getSettings();

  return (
    <main className="cancel-page">
      <div className="cancel-card">
        <p className="cancel-logo">My Favorite Diner</p>
        <p className="cancel-sub">Bar and Grill</p>

        <h1>We can&rsquo;t find that page</h1>
        <p className="cancel-text">
          The link may be out of date, or there may be a typo in the address.
          Everything is still here — the menu, the photos and the booking form.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: 26,
          }}
        >
          <Link href="/" className="btn">
            Back to the diner
          </Link>
          <Link href="/menu" className="btn ghost">
            See the menu
          </Link>
        </div>

        {settings.phone ? (
          <p className="cancel-text" style={{ marginTop: 22 }}>
            Or just call us on{' '}
            <a href={`tel:${settings.phone.replace(/\s/g, '')}`}>
              {settings.phone}
            </a>
            .
          </p>
        ) : null}
      </div>
    </main>
  );
}
