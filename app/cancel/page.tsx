import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Booking } from '@/lib/types';
import CancelForm from '@/components/site/CancelForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Cancel your booking — My Favorite Diner',
  robots: { index: false, follow: false },
};

function prettyDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function CancelPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let booking: Booking | null = null;
  let problem = '';

  if (!token) {
    problem = 'This link is missing its code.';
  } else {
    const supabase = createAdminClient();
    if (!supabase) {
      problem = 'Cancellations are not set up yet. Please call us instead.';
    } else {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('cancel_token', token)
        .maybeSingle();

      if (!data) problem = 'We could not find that booking.';
      else booking = data as Booking;
    }
  }

  const alreadyCancelled = booking?.status === 'cancelled';

  return (
    <main className="cancel-page">
      <div className="cancel-card">
        <p className="cancel-logo">My Favorite Diner</p>
        <p className="cancel-sub">Bar and Grill</p>

        {problem ? (
          <>
            <h1>Something went wrong</h1>
            <p className="cancel-text">{problem}</p>
            <p className="cancel-text">
              Please give us a call and we will sort it out for you.
            </p>
          </>
        ) : alreadyCancelled ? (
          <>
            <h1>Already cancelled</h1>
            <p className="cancel-text">
              This booking has already been cancelled. Nothing more to do.
            </p>
          </>
        ) : booking ? (
          <CancelForm
            token={booking.cancel_token}
            name={booking.name}
            date={prettyDate(booking.booking_date)}
            time={booking.booking_time}
            guests={booking.guests}
          />
        ) : null}

        <Link href="/" className="btn" style={{ marginTop: 26 }}>
          Back to the website
        </Link>
      </div>
    </main>
  );
}
