'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Shown when a page throws in production.
 *
 * The site degrades gracefully at every data layer — no Supabase falls back
 * to the written-in menu, no Resend logs instead of failing — and then used
 * to fall off a cliff here, handing the guest an unstyled stock error page.
 *
 * Note this cannot read Settings for the phone number: the whole point is
 * that something already failed, and a data fetch is the most likely thing
 * to have failed. Better a hard-coded route to the homepage than a second
 * crash inside the error page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[page] unhandled error:', error);
  }, [error]);

  return (
    <main className="cancel-page">
      <div className="cancel-card">
        <p className="cancel-logo">My Favorite Diner</p>
        <p className="cancel-sub">Bar and Grill</p>

        <h1>Something went wrong at our end</h1>
        <p className="cancel-text">
          This one is us, not you. Try again in a moment — and if you were
          booking a table, please give us a call instead and we will sort it
          out straight away.
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
          <button className="btn" onClick={reset} type="button">
            Try again
          </button>
          <Link href="/" className="btn ghost">
            Back to the diner
          </Link>
        </div>

        {error.digest ? (
          <p className="cancel-text" style={{ marginTop: 22, fontSize: 12 }}>
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
